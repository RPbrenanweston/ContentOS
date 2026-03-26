---
wave: 3
depends_on: ["01-architecture.md"]
files_modified:
  - backend/app/routers/auth.py
  - backend/app/routers/templates.py
  - backend/app/routers/sessions.py
  - backend/app/routers/submissions.py
  - backend/app/routers/decisions.py
  - backend/app/middleware/auth.py
  - backend/app/utils/aggregation.py
  - backend/app/utils/csv_export.py
  - backend/tests/test_auth.py
  - backend/tests/test_templates.py
  - backend/tests/test_sessions.py
  - backend/tests/test_submissions.py
  - backend/tests/test_decisions.py
autonomous: true
---

# 03-Backend: Auth, CRUD APIs, Aggregation, CSV Export

## Goal
Implement all FastAPI endpoints for authentication, template management, interview sessions, scorecard submissions, and decision aggregation with CSV export—ensuring org-scoped security and immutable submissions.

## Requirements Covered
- AUTH-01 to AUTH-05 (signup, login, logout, org creation, org-scoping)
- SCORE-01 to SCORE-06 (template CRUD)
- INT-01 to INT-04 (session CRUD and status updates)
- SUB-01 to SUB-07 (submission create, update, submit, auto-save)
- DEC-01 to DEC-04 (aggregation and CSV export)
- DATA-01 to DATA-03 (persistence, CSV format)

## Tasks

### Task 1: Authentication Middleware + Endpoints
Implement JWT-based auth with Supabase Auth and org-scoped middleware.

**Files:**
- `backend/app/middleware/auth.py` (~80 LOC)
- `backend/app/routers/auth.py` (~150 LOC)

**middleware/auth.py:**
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from ..database import get_supabase_client
from supabase import Client

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Verify JWT token and return current user with org_id.
    """
    token = credentials.credentials
    try:
        # Verify token with Supabase
        user_response = supabase.auth.get_user(token)
        user_id = user_response.user.id

        # Fetch user with org_id from users table
        result = supabase.table("users").select("*").eq("id", user_id).single().execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )

        return result.data

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

async def get_current_org_id(
    current_user: dict = Depends(get_current_user)
) -> str:
    """Extract org_id from current user."""
    return current_user["org_id"]
```

**routers/auth.py:**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from ..database import get_supabase_admin
from supabase import Client
import uuid

router = APIRouter()

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    org_name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    access_token: str
    user: dict

@router.post("/signup", response_model=AuthResponse)
async def signup(
    req: SignupRequest,
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Create organization and user account.
    AUTH-01, AUTH-03
    """
    try:
        # Create auth user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": req.email,
            "password": req.password
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )

        user_id = auth_response.user.id

        # Create organization
        org_result = supabase.table("organizations").insert({
            "name": req.org_name
        }).execute()

        org_id = org_result.data[0]["id"]

        # Create user record with org_id
        user_result = supabase.table("users").insert({
            "id": user_id,
            "org_id": org_id,
            "email": req.email,
            "full_name": req.full_name
        }).execute()

        return AuthResponse(
            access_token=auth_response.session.access_token,
            user=user_result.data[0]
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/login", response_model=AuthResponse)
async def login(
    req: LoginRequest,
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Authenticate user and return JWT token.
    AUTH-02
    """
    try:
        # Sign in with Supabase Auth
        auth_response = supabase.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        # Fetch user with org_id
        user_result = supabase.table("users").select("*").eq(
            "id", auth_response.user.id
        ).single().execute()

        return AuthResponse(
            access_token=auth_response.session.access_token,
            user=user_result.data
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

@router.post("/logout")
async def logout(supabase: Client = Depends(get_supabase_admin)):
    """
    Sign out user (invalidate session).
    AUTH-04
    """
    try:
        supabase.auth.sign_out()
        return {"message": "Logged out successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user."""
    return current_user
```

**Acceptance Criteria:**
- [ ] Signup creates org + user (AUTH-01, AUTH-03)
- [ ] Login returns JWT token (AUTH-02)
- [ ] Logout invalidates session (AUTH-04)
- [ ] Middleware validates JWT and extracts user + org_id
- [ ] Invalid tokens return 401
- [ ] Password validation (min 8 chars enforced by Supabase)

### Task 2: Scorecard Template CRUD
Implement endpoints for creating, reading, updating, deleting templates.

**Files:**
- `backend/app/routers/templates.py` (~200 LOC)

**routers/templates.py:**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from uuid import UUID
from ..models import ScorecardTemplate, ScorecardTemplateCreate
from ..middleware.auth import get_current_user, get_current_org_id
from ..database import get_supabase_client
from supabase import Client

router = APIRouter()

@router.get("/", response_model=List[ScorecardTemplate])
async def list_templates(
    org_id: str = Depends(get_current_org_id),
    supabase: Client = Depends(get_supabase_client)
):
    """
    List all scorecard templates for the user's organization.
    SCORE-06
    """
    try:
        result = supabase.table("scorecard_templates").select("*").eq(
            "org_id", org_id
        ).order("created_at", desc=True).execute()

        return result.data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{template_id}", response_model=ScorecardTemplate)
async def get_template(
    template_id: UUID,
    org_id: str = Depends(get_current_org_id),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get a single scorecard template by ID.
    """
    try:
        result = supabase.table("scorecard_templates").select("*").eq(
            "id", str(template_id)
        ).eq("org_id", org_id).single().execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )

        return result.data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/", response_model=ScorecardTemplate, status_code=status.HTTP_201_CREATED)
async def create_template(
    template: ScorecardTemplateCreate,
    current_user: dict = Depends(get_current_user),
    org_id: str = Depends(get_current_org_id),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Create a new scorecard template.
    SCORE-01, SCORE-02, SCORE-03, SCORE-04, SCORE-05
    """
    try:
        # Validate at least one competency
        if not template.competencies:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one competency is required"
            )

        # Insert template
        result = supabase.table("scorecard_templates").insert({
            "org_id": org_id,
            "name": template.name,
            "description": template.description,
            "competencies": [c.dict() for c in template.competencies],
            "created_by": current_user["id"]
        }).execute()

        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{template_id}", response_model=ScorecardTemplate)
async def update_template(
    template_id: UUID,
    template: ScorecardTemplateCreate,
    org_id: str = Depends(get_current_org_id),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Update an existing scorecard template.
    """
    try:
        # Validate ownership
        existing = supabase.table("scorecard_templates").select("*").eq(
            "id", str(template_id)
        ).eq("org_id", org_id).single().execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )

        # Update template
        result = supabase.table("scorecard_templates").update({
            "name": template.name,
            "description": template.description,
            "competencies": [c.dict() for c in template.competencies],
            "updated_at": "NOW()"
        }).eq("id", str(template_id)).execute()

        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: UUID,
    org_id: str = Depends(get_current_org_id),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Delete a scorecard template.
    """
    try:
        # Check if template is in use by any sessions
        sessions = supabase.table("interview_sessions").select("id").eq(
            "scorecard_template_id", str(template_id)
        ).execute()

        if sessions.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete template that is in use by interview sessions"
            )

        # Delete template
        supabase.table("scorecard_templates").delete().eq(
            "id", str(template_id)
        ).eq("org_id", org_id).execute()

        return None

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
```

**Acceptance Criteria:**
- [ ] Create template with competencies (SCORE-01 to SCORE-05)
- [ ] List all templates (org-scoped) (SCORE-06)
- [ ] Get single template by ID
- [ ] Update template
- [ ] Delete template (only if not in use)
- [ ] All endpoints enforce org-scoping (AUTH-05)
- [ ] Validation errors return 400 with clear messages

### Task 3: Interview Session CRUD + Status Updates
Implement endpoints for managing interview sessions and status transitions.

**Files:**
- `backend/app/routers/sessions.py` (~180 LOC)

**routers/sessions.py:**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Literal
from uuid import UUID
from ..models import InterviewSession, InterviewSessionCreate
from ..middleware.auth import get_current_user, get_current_org_id
from ..database import get_supabase_client
from supabase import Client
from pydantic import BaseModel

router = APIRouter()

class StatusUpdate(BaseModel):
    status: Literal["scheduled", "in_progress", "completed", "cancelled"]

@router.get("/", response_model=List[InterviewSession])
async def list_sessions(
    org_id: str = Depends(get_current_org_id),
    supabase: Client = Depends(get_supabase_client)
):
    """
    List all interview sessions for the organization.
    INT-04
    """
    try:
        result = supabase.table("interview_sessions").select("*").eq(
            "org_id", org_id
        ).order("created_at", desc=True).execute()

        return result.data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{session_id}", response_model=InterviewSession)
async def get_session(
    session_id: UUID,
    org_id: str = Depends(get_current_org_id),
    supabase: Client = Depends(get_supabase_client)
):
    """Get a single interview session by ID."""
    try:
        result = supabase.table("interview_sessions").select("*").eq(
            "id", str(session_id)
        ).eq("org_id", org_id).single().execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        return result.data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/", response_model=InterviewSession, status_code=status.HTTP_201_CREATED)
async def create_session(
    session: InterviewSessionCreate,
    current_user: dict = Depends(get_current_user),
    org_id: str = Depends(get_current_org_id),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Create a new interview session.
    INT-01
    """
    try:
        # Validate template exists and belongs to org
        template = supabase.table("scorecard_templates").select("id").eq(
            "id", str(session.scorecard_template_id)
        ).eq("org_id", org_id).single().execute()

        if not template.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )

        # Create session
        result = supabase.table("interview_sessions").insert({
            "org_id": org_id,
            "candidate_name": session.candidate_name,
            "role": session.role,
            "scorecard_template_id": str(session.scorecard_template_id),
            "status": "scheduled",
            "created_by": current_user["id"]
        }).execute()

        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.patch("/{session_id}/status", response_model=InterviewSession)
async def update_session_status(
    session_id: UUID,
    status_update: StatusUpdate,
    org_id: str = Depends(get_current_org_id),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Update interview session status.
    INT-02 (in_progress), INT-03 (completed)
    """
    try:
        # Validate session exists
        existing = supabase.table("interview_sessions").select("*").eq(
            "id", str(session_id)
        ).eq("org_id", org_id).single().execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        # Update status
        result = supabase.table("interview_sessions").update({
            "status": status_update.status,
            "updated_at": "NOW()"
        }).eq("id", str(session_id)).execute()

        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: UUID,
    org_id: str = Depends(get_current_org_id),
    supabase: Client = Depends(get_supabase_client)
):
    """Delete an interview session."""
    try:
        supabase.table("interview_sessions").delete().eq(
            "id", str(session_id)
        ).eq("org_id", org_id).execute()

        return None

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
```

**Acceptance Criteria:**
- [ ] Create interview session (INT-01)
- [ ] Update status to in_progress (INT-02)
- [ ] Update status to completed (INT-03)
- [ ] List all sessions (INT-04)
- [ ] Get single session by ID
- [ ] Delete session (cascades to submissions)
- [ ] Org-scoped (AUTH-05)

### Task 4: Scorecard Submission Endpoints (Create, Auto-save, Submit)
Implement upsert logic for submissions with auto-save and immutable submit.

**Files:**
- `backend/app/routers/submissions.py` (~220 LOC)

**routers/submissions.py:**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from ..models import ScorecardSubmission, ScorecardSubmissionCreate
from ..middleware.auth import get_current_user, get_current_org_id
from ..database import get_supabase_client
from supabase import Client

router = APIRouter()

@router.get("/", response_model=List[ScorecardSubmission])
async def list_submissions(
    interview_session_id: Optional[UUID] = None,
    org_id: str = Depends(get_current_org_id),
    supabase: Client = Depends(get_supabase_client)
):
    """
    List submissions, optionally filtered by interview_session_id.
    """
    try:
        query = supabase.table("scorecard_submissions").select(
            "*, interview_sessions!inner(org_id)"
        ).eq("interview_sessions.org_id", org_id)

        if interview_session_id:
            query = query.eq("interview_session_id", str(interview_session_id))

        result = query.execute()
        return result.data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{submission_id}", response_model=ScorecardSubmission)
async def get_submission(
    submission_id: UUID,
    org_id: str = Depends(get_current_org_id),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get a single submission by ID.
    SUB-07 (read-only view)
    """
    try:
        result = supabase.table("scorecard_submissions").select(
            "*, interview_sessions!inner(org_id)"
        ).eq("id", str(submission_id)).eq(
            "interview_sessions.org_id", org_id
        ).single().execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found"
            )

        return result.data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/", response_model=ScorecardSubmission)
async def create_or_update_submission(
    submission: ScorecardSubmissionCreate,
    current_user: dict = Depends(get_current_user),
    org_id: str = Depends(get_current_org_id),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Create or update a scorecard submission (upsert).
    SUB-01, SUB-02, SUB-03
    """
    try:
        # Validate session exists and belongs to org
        session = supabase.table("interview_sessions").select("*").eq(
            "id", str(submission.interview_session_id)
        ).eq("org_id", org_id).single().execute()

        if not session.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Interview session not found"
            )

        # Check if submission already exists for this user + session
        existing = supabase.table("scorecard_submissions").select("*").eq(
            "interview_session_id", str(submission.interview_session_id)
        ).eq("submitter_id", current_user["id"]).execute()

        if existing.data:
            # Update existing (only if still draft)
            existing_sub = existing.data[0]
            if existing_sub["status"] == "submitted":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot modify submitted scorecard (SUB-06)"
                )

            result = supabase.table("scorecard_submissions").update({
                "data": submission.data.dict(),
                "auto_saved_at": datetime.utcnow().isoformat(),
                "updated_at": "NOW()"
            }).eq("id", existing_sub["id"]).execute()

            return result.data[0]

        else:
            # Create new submission
            result = supabase.table("scorecard_submissions").insert({
                "interview_session_id": str(submission.interview_session_id),
                "submitter_id": current_user["id"],
                "data": submission.data.dict(),
                "status": "draft",
                "auto_saved_at": datetime.utcnow().isoformat()
            }).execute()

            return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/{submission_id}/autosave", response_model=ScorecardSubmission)
async def autosave_submission(
    submission_id: UUID,
    submission: ScorecardSubmissionCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Auto-save a draft submission.
    SUB-04 (auto-save every 30 seconds)
    """
    try:
        # Validate ownership and draft status
        existing = supabase.table("scorecard_submissions").select("*").eq(
            "id", str(submission_id)
        ).eq("submitter_id", current_user["id"]).single().execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found"
            )

        if existing.data["status"] == "submitted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot auto-save submitted scorecard"
            )

        # Update submission
        result = supabase.table("scorecard_submissions").update({
            "data": submission.data.dict(),
            "auto_saved_at": datetime.utcnow().isoformat(),
            "updated_at": "NOW()"
        }).eq("id", str(submission_id)).execute()

        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/{submission_id}/submit", response_model=ScorecardSubmission)
async def submit_scorecard(
    submission_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Submit a scorecard (mark as immutable).
    SUB-05, SUB-06 (immutability)
    """
    try:
        # Validate ownership and draft status
        existing = supabase.table("scorecard_submissions").select("*").eq(
            "id", str(submission_id)
        ).eq("submitter_id", current_user["id"]).single().execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found"
            )

        if existing.data["status"] == "submitted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Scorecard already submitted"
            )

        # Validate all competencies have ratings
        data = existing.data["data"]
        if not data.get("ratings"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot submit incomplete scorecard"
            )

        incomplete = [r for r in data["ratings"] if r.get("rating") is None]
        if incomplete:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{len(incomplete)} competencies not rated"
            )

        # Mark as submitted
        result = supabase.table("scorecard_submissions").update({
            "status": "submitted",
            "submitted_at": datetime.utcnow().isoformat(),
            "updated_at": "NOW()"
        }).eq("id", str(submission_id)).execute()

        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
```

**Acceptance Criteria:**
- [ ] Create/update submission (upsert) (SUB-01, SUB-02, SUB-03)
- [ ] Auto-save updates draft (SUB-04)
- [ ] Submit marks as immutable (SUB-05, SUB-06)
- [ ] Cannot edit after submit (SUB-06)
- [ ] Read submitted scorecard (SUB-07)
- [ ] Validation for incomplete submissions

### Task 5: Decision Aggregation + CSV Export
Implement aggregation logic and CSV export for recruiter decision view.

**Files:**
- `backend/app/routers/decisions.py` (~120 LOC)
- `backend/app/utils/aggregation.py` (~80 LOC)
- `backend/app/utils/csv_export.py` (~100 LOC)

**utils/aggregation.py:**
```python
from typing import List, Dict, Any
from collections import defaultdict

def aggregate_submissions(
    submissions: List[Dict[str, Any]],
    competencies: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Aggregate scorecard submissions by competency.
    DEC-02
    """
    aggregation = []

    for comp in competencies:
        comp_id = comp["id"]
        comp_name = comp["name"]

        # Collect all ratings for this competency
        ratings = []
        count_by_rating = defaultdict(int)

        for sub in submissions:
            for rating in sub["data"]["ratings"]:
                if rating["competency_id"] == comp_id and rating.get("rating") is not None:
                    r = rating["rating"]
                    ratings.append(r)
                    count_by_rating[r] += 1

        # Calculate average
        avg = sum(ratings) / len(ratings) if ratings else 0

        aggregation.append({
            "competency_id": comp_id,
            "competency_name": comp_name,
            "average": avg,
            "ratings": ratings,
            "count_by_rating": dict(count_by_rating)
        })

    return aggregation
```

**utils/csv_export.py:**
```python
import csv
from io import StringIO
from typing import List, Dict, Any

def generate_csv(
    session: Dict[str, Any],
    template: Dict[str, Any],
    submissions: List[Dict[str, Any]],
    aggregation: List[Dict[str, Any]]
) -> str:
    """
    Generate CSV export for decision summary.
    DATA-01, DATA-02
    """
    output = StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow(["Candidate Decision Summary"])
    writer.writerow([])
    writer.writerow(["Candidate", session["candidate_name"]])
    writer.writerow(["Role", session["role"]])
    writer.writerow(["Date", session["created_at"]])
    writer.writerow([])

    # Aggregated scores
    writer.writerow(["Competency", "Average Rating", "Count"])
    for agg in aggregation:
        writer.writerow([
            agg["competency_name"],
            f"{agg['average']:.2f}",
            len(agg["ratings"])
        ])

    writer.writerow([])
    writer.writerow([])

    # Individual submissions
    writer.writerow(["Individual Scorecards"])
    writer.writerow([])

    for sub in submissions:
        writer.writerow(["Interviewer", sub.get("submitter_name", "Unknown")])
        writer.writerow(["Submitted", sub["submitted_at"]])
        writer.writerow([])

        writer.writerow(["Competency", "Rating", "Evidence"])
        for rating in sub["data"]["ratings"]:
            comp = next((c for c in template["competencies"] if c["id"] == rating["competency_id"]), None)
            writer.writerow([
                comp["name"] if comp else rating["competency_id"],
                rating.get("rating", "N/A"),
                rating.get("evidence", "")
            ])

        writer.writerow([])

    return output.getvalue()
```

**routers/decisions.py:**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from uuid import UUID
from io import BytesIO
from ..middleware.auth import get_current_org_id
from ..database import get_supabase_client
from ..utils.aggregation import aggregate_submissions
from ..utils.csv_export import generate_csv
from supabase import Client

router = APIRouter()

@router.get("/sessions/{session_id}")
async def get_session_decision_data(
    session_id: UUID,
    org_id: str = Depends(get_current_org_id),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get aggregated decision data for a session.
    DEC-01, DEC-02, DEC-03
    """
    try:
        # Get session
        session = supabase.table("interview_sessions").select("*").eq(
            "id", str(session_id)
        ).eq("org_id", org_id).single().execute()

        if not session.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        # Get template
        template = supabase.table("scorecard_templates").select("*").eq(
            "id", session.data["scorecard_template_id"]
        ).single().execute()

        # Get all submitted scorecards
        submissions = supabase.table("scorecard_submissions").select(
            "*, users!submitter_id(full_name)"
        ).eq("interview_session_id", str(session_id)).eq(
            "status", "submitted"
        ).execute()

        # Enrich submissions with submitter names
        enriched_submissions = []
        for sub in submissions.data:
            enriched_submissions.append({
                **sub,
                "submitter_name": sub["users"]["full_name"] if sub.get("users") else "Unknown"
            })

        # Aggregate data
        aggregation = aggregate_submissions(
            enriched_submissions,
            template.data["competencies"]
        )

        return {
            "session": session.data,
            "template": template.data,
            "submissions": enriched_submissions,
            "aggregation": aggregation
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/sessions/{session_id}/export")
async def export_session_csv(
    session_id: UUID,
    org_id: str = Depends(get_current_org_id),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Export session decision data as CSV.
    DEC-04, DATA-01, DATA-02
    """
    try:
        # Reuse aggregation logic
        decision_data = await get_session_decision_data(session_id, org_id, supabase)

        # Generate CSV
        csv_content = generate_csv(
            decision_data["session"],
            decision_data["template"],
            decision_data["submissions"],
            decision_data["aggregation"]
        )

        # Return as downloadable file
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=scorecard-{session_id}.csv"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
```

**Acceptance Criteria:**
- [ ] View all scorecards for session (DEC-01)
- [ ] Display aggregated scores (average, count) (DEC-02)
- [ ] Show all interviewer names and ratings (DEC-03)
- [ ] Export to CSV (DEC-04)
- [ ] CSV includes all competencies, ratings, notes (DATA-01)
- [ ] CSV formatted cleanly (DATA-02)

### Task 6: Unit Tests
Write unit tests for all API endpoints.

**Files:**
- `backend/tests/test_auth.py` (~80 LOC)
- `backend/tests/test_templates.py` (~100 LOC)
- `backend/tests/test_sessions.py` (~100 LOC)
- `backend/tests/test_submissions.py` (~120 LOC)
- `backend/tests/test_decisions.py` (~80 LOC)

**Test coverage:**
- Auth: signup, login, logout, token validation
- Templates: CRUD operations, org isolation
- Sessions: CRUD, status updates
- Submissions: create, auto-save, submit, immutability
- Decisions: aggregation, CSV export

**Acceptance Criteria:**
- [ ] All endpoints have test coverage
- [ ] Tests validate org-scoping
- [ ] Tests validate immutability (SUB-06)
- [ ] Tests run with `pytest`
- [ ] All tests pass

## Success Criteria
- [ ] All API endpoints implemented and documented
- [ ] Authentication works with JWT tokens
- [ ] Templates can be created, updated, deleted
- [ ] Interview sessions can be created and status updated
- [ ] Scorecard submissions support auto-save and submit
- [ ] Submitted scorecards are immutable
- [ ] Decision aggregation calculates averages correctly
- [ ] CSV export downloads with correct format
- [ ] All endpoints enforce org-scoping (RLS + middleware)
- [ ] Unit tests pass
- [ ] OpenAPI docs at /api/docs are complete
- [ ] No 500 errors during normal operations

## must_haves
- Auth endpoints (signup, login, logout) with JWT tokens (AUTH-01 to AUTH-04)
- Auth middleware enforcing org-scoping on all endpoints (AUTH-05)
- Template CRUD endpoints (SCORE-01 to SCORE-06)
- Session CRUD + status update endpoints (INT-01 to INT-04)
- Submission create/update (upsert), auto-save, submit endpoints (SUB-01 to SUB-07)
- Immutability enforcement after submit (SUB-06)
- Decision aggregation endpoint (DEC-01 to DEC-03)
- CSV export endpoint (DEC-04, DATA-01, DATA-02)
- All data persisted in Supabase (DATA-03)
