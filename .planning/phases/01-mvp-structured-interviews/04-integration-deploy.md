---
wave: 4
depends_on: ["02-frontend.md", "03-backend.md"]
files_modified:
  - .env.example
  - frontend/.env.local
  - backend/.env
  - vercel.json
  - railway.json
  - backend/app/main.py
  - frontend/src/lib/api.ts
  - tests/e2e/test_full_flow.py
  - docs/DEPLOYMENT.md
autonomous: true
---

# 04-Integration-Deploy: Environment Setup, E2E Testing, Production Deployment

## Goal
Integrate frontend and backend, configure production environments, run end-to-end tests, and deploy the Scorecard MVP to Vercel (frontend) and Railway (backend) for public access.

## Requirements Covered
- All 33 requirements (validation through E2E testing)
- Production deployment
- Success criteria validation

## Tasks

### Task 1: Environment Configuration
Set up environment variables for local development and production.

**Files:**
- `.env.example` (~20 LOC)
- `frontend/.env.local` (~5 LOC)
- `backend/.env` (~10 LOC)

**.env.example (root):**
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Frontend (Next.js)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Backend (FastAPI)
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-jwt-secret
CORS_ORIGINS=http://localhost:3000,https://your-frontend.vercel.app

# Production URLs
PRODUCTION_API_URL=https://your-api.railway.app
PRODUCTION_FRONTEND_URL=https://your-app.vercel.app
```

**frontend/.env.local:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**backend/.env:**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-jwt-secret
CORS_ORIGINS=http://localhost:3000
```

**Acceptance Criteria:**
- [ ] .env.example documents all required variables
- [ ] Local development env files created
- [ ] Sensitive keys not committed to git
- [ ] .gitignore includes .env files

### Task 2: Frontend-Backend Integration
Connect Next.js frontend to FastAPI backend with proper authentication headers.

**Files:**
- `frontend/src/lib/api.ts` (update, ~150 LOC)
- `backend/app/main.py` (update CORS, ~20 LOC)

**Updated api.ts:**
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = localStorage.getItem("access_token");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options?.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `API error: ${response.statusText}`;

    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      // If error response is not JSON, use status text
    }

    throw new ApiError(response.status, errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

// Convenience methods
export const api = {
  get: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: "GET" }),

  post: <T>(endpoint: string, data?: any) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data: any) =>
    apiRequest<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  patch: <T>(endpoint: string, data: any) =>
    apiRequest<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (endpoint: string) =>
    apiRequest<void>(endpoint, { method: "DELETE" }),
};
```

**Updated main.py (CORS):**
```python
# Update CORS middleware to accept production origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        os.getenv("PRODUCTION_FRONTEND_URL", "")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Acceptance Criteria:**
- [ ] API client adds Authorization header with JWT token
- [ ] CORS configured for local and production origins
- [ ] Error handling displays user-friendly messages
- [ ] 401 errors redirect to login page
- [ ] Frontend can call all backend endpoints

### Task 3: End-to-End Testing
Write and run E2E tests covering the full user flow.

**Files:**
- `tests/e2e/test_full_flow.py` (~300 LOC)
- `tests/e2e/conftest.py` (~50 LOC)

**test_full_flow.py:**
```python
import pytest
import requests
from uuid import uuid4

API_BASE = "http://localhost:8000"

@pytest.fixture
def test_org():
    """Create a test organization and user."""
    email = f"test-{uuid4()}@example.com"
    response = requests.post(f"{API_BASE}/api/v1/auth/signup", json={
        "email": email,
        "password": "testpass123",
        "full_name": "Test User",
        "org_name": "Test Org"
    })
    assert response.status_code == 200
    data = response.json()
    return {
        "token": data["access_token"],
        "user": data["user"],
        "email": email,
        "password": "testpass123"
    }

def test_01_auth_flow(test_org):
    """Test signup, login, logout flow (AUTH-01, AUTH-02, AUTH-04)."""
    # Login with created user
    response = requests.post(f"{API_BASE}/api/v1/auth/login", json={
        "email": test_org["email"],
        "password": test_org["password"]
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data

    # Get current user
    headers = {"Authorization": f"Bearer {data['access_token']}"}
    response = requests.get(f"{API_BASE}/api/v1/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == test_org["email"]

    # Logout
    response = requests.post(f"{API_BASE}/api/v1/auth/logout", headers=headers)
    assert response.status_code == 200

def test_02_template_crud(test_org):
    """Test template creation, list, update, delete (SCORE-01 to SCORE-06)."""
    headers = {"Authorization": f"Bearer {test_org['token']}"}

    # Create template
    template_data = {
        "name": "Engineering Interview",
        "description": "For senior engineers",
        "competencies": [
            {
                "id": "comp-1",
                "name": "Problem Solving",
                "description": "Can solve complex problems",
                "scale_type": "numeric",
                "anchors": [
                    {"level": 1, "description": "Struggles with basic problems"},
                    {"level": 5, "description": "Solves complex problems independently"}
                ]
            },
            {
                "id": "comp-2",
                "name": "Communication",
                "scale_type": "strong_yes_no",
                "anchors": []
            }
        ]
    }

    response = requests.post(
        f"{API_BASE}/api/v1/templates",
        json=template_data,
        headers=headers
    )
    assert response.status_code == 201
    template = response.json()
    template_id = template["id"]
    assert template["name"] == "Engineering Interview"
    assert len(template["competencies"]) == 2

    # List templates
    response = requests.get(f"{API_BASE}/api/v1/templates", headers=headers)
    assert response.status_code == 200
    templates = response.json()
    assert len(templates) >= 1

    # Get single template
    response = requests.get(f"{API_BASE}/api/v1/templates/{template_id}", headers=headers)
    assert response.status_code == 200

    # Update template
    template_data["name"] = "Senior Engineering Interview"
    response = requests.put(
        f"{API_BASE}/api/v1/templates/{template_id}",
        json=template_data,
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Senior Engineering Interview"

    return template_id

def test_03_interview_session_flow(test_org):
    """Test interview session creation and status updates (INT-01 to INT-04)."""
    headers = {"Authorization": f"Bearer {test_org['token']}"}

    # Create template first
    template_id = test_02_template_crud(test_org)

    # Create interview session
    session_data = {
        "candidate_name": "Jane Doe",
        "role": "Senior Engineer",
        "scorecard_template_id": template_id
    }
    response = requests.post(
        f"{API_BASE}/api/v1/sessions",
        json=session_data,
        headers=headers
    )
    assert response.status_code == 201
    session = response.json()
    session_id = session["id"]
    assert session["candidate_name"] == "Jane Doe"
    assert session["status"] == "scheduled"

    # List sessions
    response = requests.get(f"{API_BASE}/api/v1/sessions", headers=headers)
    assert response.status_code == 200
    sessions = response.json()
    assert len(sessions) >= 1

    # Update status to in_progress
    response = requests.patch(
        f"{API_BASE}/api/v1/sessions/{session_id}/status",
        json={"status": "in_progress"},
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "in_progress"

    # Update status to completed
    response = requests.patch(
        f"{API_BASE}/api/v1/sessions/{session_id}/status",
        json={"status": "completed"},
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "completed"

    return session_id

def test_04_scorecard_submission_flow(test_org):
    """Test scorecard submission, auto-save, submit (SUB-01 to SUB-07)."""
    headers = {"Authorization": f"Bearer {test_org['token']}"}

    # Create session
    session_id = test_03_interview_session_flow(test_org)

    # Create submission (draft)
    submission_data = {
        "interview_session_id": session_id,
        "data": {
            "ratings": [
                {
                    "competency_id": "comp-1",
                    "rating": 4,
                    "evidence": "Solved the algorithm problem efficiently"
                },
                {
                    "competency_id": "comp-2",
                    "rating": 3,
                    "evidence": "Clear communicator"
                }
            ],
            "overall_notes": "Strong candidate"
        }
    }

    response = requests.post(
        f"{API_BASE}/api/v1/submissions",
        json=submission_data,
        headers=headers
    )
    assert response.status_code == 200
    submission = response.json()
    submission_id = submission["id"]
    assert submission["status"] == "draft"

    # Auto-save (update)
    submission_data["data"]["ratings"][0]["evidence"] = "Updated evidence"
    response = requests.post(
        f"{API_BASE}/api/v1/submissions/{submission_id}/autosave",
        json=submission_data,
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["auto_saved_at"] is not None

    # Submit scorecard
    response = requests.post(
        f"{API_BASE}/api/v1/submissions/{submission_id}/submit",
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "submitted"
    assert response.json()["submitted_at"] is not None

    # Try to edit after submit (should fail)
    response = requests.post(
        f"{API_BASE}/api/v1/submissions/{submission_id}/autosave",
        json=submission_data,
        headers=headers
    )
    assert response.status_code == 400

    # Read submitted scorecard
    response = requests.get(
        f"{API_BASE}/api/v1/submissions/{submission_id}",
        headers=headers
    )
    assert response.status_code == 200

    return session_id

def test_05_decision_aggregation_and_export(test_org):
    """Test decision view and CSV export (DEC-01 to DEC-04)."""
    headers = {"Authorization": f"Bearer {test_org['token']}"}

    # Create session with submission
    session_id = test_04_scorecard_submission_flow(test_org)

    # Get decision data
    response = requests.get(
        f"{API_BASE}/api/v1/decisions/sessions/{session_id}",
        headers=headers
    )
    assert response.status_code == 200
    decision = response.json()
    assert "session" in decision
    assert "submissions" in decision
    assert "aggregation" in decision
    assert len(decision["aggregation"]) == 2  # 2 competencies

    # Check aggregation
    agg = decision["aggregation"][0]
    assert "average" in agg
    assert "count_by_rating" in agg

    # Export CSV
    response = requests.get(
        f"{API_BASE}/api/v1/decisions/sessions/{session_id}/export",
        headers=headers
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    csv_content = response.text
    assert "Candidate Decision Summary" in csv_content
    assert "Jane Doe" in csv_content

def test_06_org_isolation():
    """Test that users cannot access data from other orgs (AUTH-05)."""
    # Create two separate orgs
    email1 = f"test-{uuid4()}@example.com"
    email2 = f"test-{uuid4()}@example.com"

    # Org 1
    response1 = requests.post(f"{API_BASE}/api/v1/auth/signup", json={
        "email": email1,
        "password": "testpass123",
        "full_name": "User 1",
        "org_name": "Org 1"
    })
    assert response1.status_code == 200
    token1 = response1.json()["access_token"]

    # Org 2
    response2 = requests.post(f"{API_BASE}/api/v1/auth/signup", json={
        "email": email2,
        "password": "testpass123",
        "full_name": "User 2",
        "org_name": "Org 2"
    })
    assert response2.status_code == 200
    token2 = response2.json()["access_token"]

    # User 1 creates a template
    headers1 = {"Authorization": f"Bearer {token1}"}
    response = requests.post(
        f"{API_BASE}/api/v1/templates",
        json={
            "name": "Org 1 Template",
            "competencies": [{"id": "c1", "name": "Comp 1", "scale_type": "numeric", "anchors": []}]
        },
        headers=headers1
    )
    assert response.status_code == 201
    template1_id = response.json()["id"]

    # User 2 tries to access User 1's template (should fail or return 404)
    headers2 = {"Authorization": f"Bearer {token2}"}
    response = requests.get(
        f"{API_BASE}/api/v1/templates/{template1_id}",
        headers=headers2
    )
    assert response.status_code == 404

    # User 2 lists templates (should not see User 1's template)
    response = requests.get(f"{API_BASE}/api/v1/templates", headers=headers2)
    assert response.status_code == 200
    templates = response.json()
    template_ids = [t["id"] for t in templates]
    assert template1_id not in template_ids

def test_07_full_mvp_flow():
    """End-to-end test of complete MVP flow (all requirements)."""
    # Signup
    email = f"test-{uuid4()}@example.com"
    response = requests.post(f"{API_BASE}/api/v1/auth/signup", json={
        "email": email,
        "password": "testpass123",
        "full_name": "Test Recruiter",
        "org_name": "Test Company"
    })
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create template (<10 min simulated)
    template_data = {
        "name": "Full Stack Engineer",
        "description": "Comprehensive technical interview",
        "competencies": [
            {"id": "c1", "name": "Technical Skills", "scale_type": "numeric", "anchors": []},
            {"id": "c2", "name": "Problem Solving", "scale_type": "numeric", "anchors": []},
            {"id": "c3", "name": "Communication", "scale_type": "strong_yes_no", "anchors": []}
        ]
    }
    response = requests.post(f"{API_BASE}/api/v1/templates", json=template_data, headers=headers)
    assert response.status_code == 201
    template_id = response.json()["id"]

    # Create interview session (<5 min simulated)
    session_data = {
        "candidate_name": "Alice Smith",
        "role": "Full Stack Engineer",
        "scorecard_template_id": template_id
    }
    response = requests.post(f"{API_BASE}/api/v1/sessions", json=session_data, headers=headers)
    assert response.status_code == 201
    session_id = response.json()["id"]

    # Complete scorecard (<15 min simulated)
    submission_data = {
        "interview_session_id": session_id,
        "data": {
            "ratings": [
                {"competency_id": "c1", "rating": 5, "evidence": "Built a full app in 30 min"},
                {"competency_id": "c2", "rating": 4, "evidence": "Solved complex algorithm"},
                {"competency_id": "c3", "rating": 3, "evidence": "Clear explanations"}
            ],
            "overall_notes": "Excellent candidate"
        }
    }
    response = requests.post(f"{API_BASE}/api/v1/submissions", json=submission_data, headers=headers)
    assert response.status_code == 200
    submission_id = response.json()["id"]

    # Submit scorecard
    response = requests.post(f"{API_BASE}/api/v1/submissions/{submission_id}/submit", headers=headers)
    assert response.status_code == 200

    # View aggregated scores
    response = requests.get(f"{API_BASE}/api/v1/decisions/sessions/{session_id}", headers=headers)
    assert response.status_code == 200
    decision = response.json()
    assert len(decision["aggregation"]) == 3

    # Export CSV
    response = requests.get(f"{API_BASE}/api/v1/decisions/sessions/{session_id}/export", headers=headers)
    assert response.status_code == 200
    assert "Alice Smith" in response.text

    print("\n✓ Full MVP flow completed successfully")
    print("  - Template created")
    print("  - Interview session created")
    print("  - Scorecard submitted")
    print("  - Decision viewed")
    print("  - CSV exported")
```

**Acceptance Criteria:**
- [ ] All 33 requirements validated through E2E tests
- [ ] Tests run with `pytest tests/e2e/`
- [ ] All tests pass
- [ ] Full flow completes in expected time windows
- [ ] No crashes during 30-min flow

### Task 4: Production Deployment - Backend (Railway)
Deploy FastAPI backend to Railway with Supabase connection.

**Files:**
- `railway.json` (~30 LOC)
- `backend/Procfile` (~5 LOC)
- `backend/runtime.txt` (~5 LOC)

**railway.json:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install -r requirements.txt"
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Procfile:**
```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**runtime.txt:**
```
python-3.11.6
```

**Deployment steps:**
1. Create Railway project
2. Connect GitHub repo (backend folder)
3. Set environment variables:
   - SUPABASE_URL
   - SUPABASE_KEY
   - SUPABASE_SERVICE_KEY
   - JWT_SECRET
   - CORS_ORIGINS (include production frontend URL)
4. Deploy
5. Verify health check: `https://your-api.railway.app/health`
6. Verify OpenAPI docs: `https://your-api.railway.app/api/docs`

**Acceptance Criteria:**
- [ ] Backend deployed to Railway
- [ ] Health check returns 200
- [ ] OpenAPI docs accessible
- [ ] Environment variables configured
- [ ] CORS allows production frontend origin
- [ ] All API endpoints respond correctly

### Task 5: Production Deployment - Frontend (Vercel)
Deploy Next.js frontend to Vercel with environment variables.

**Files:**
- `vercel.json` (~20 LOC)
- `frontend/next.config.js` (update, ~10 LOC)

**vercel.json:**
```json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/.next",
  "framework": "nextjs",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-api.railway.app/api/:path*"
    }
  ]
}
```

**Deployment steps:**
1. Create Vercel project
2. Connect GitHub repo
3. Set root directory to `frontend`
4. Set environment variables:
   - NEXT_PUBLIC_API_URL (Railway backend URL)
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
5. Deploy
6. Verify homepage loads
7. Test authentication flow

**Acceptance Criteria:**
- [ ] Frontend deployed to Vercel
- [ ] Homepage loads within 2 seconds
- [ ] All routes accessible
- [ ] API calls reach backend successfully
- [ ] Authentication works end-to-end
- [ ] No CORS errors in browser console

### Task 6: Production Smoke Tests
Run smoke tests against production environment.

**Smoke test checklist:**
1. Signup new user
2. Create template
3. Create interview session
4. Complete scorecard
5. Submit scorecard
6. View decision page
7. Export CSV
8. Logout
9. Login again

**Acceptance Criteria:**
- [ ] All smoke tests pass
- [ ] No 500 errors
- [ ] All pages load within 2 seconds
- [ ] CSV downloads correctly
- [ ] Mobile responsive (test on phone)

### Task 7: Documentation
Write deployment and usage documentation.

**Files:**
- `docs/DEPLOYMENT.md` (~100 LOC)
- `docs/API.md` (~50 LOC)
- `README.md` (update, ~80 LOC)

**DEPLOYMENT.md contents:**
- Environment setup
- Supabase configuration
- Railway deployment steps
- Vercel deployment steps
- Environment variables reference
- Troubleshooting common issues

**API.md contents:**
- API base URL
- Authentication
- Endpoint reference (link to OpenAPI docs)
- Example requests/responses

**README.md update:**
- Project overview
- Tech stack
- Quick start (local development)
- Deployment instructions
- Success criteria checklist

**Acceptance Criteria:**
- [ ] Documentation is clear and complete
- [ ] New developer can deploy from docs
- [ ] All environment variables documented
- [ ] Troubleshooting section included

## Success Criteria
- [ ] Frontend and backend integrate successfully
- [ ] All E2E tests pass locally
- [ ] Backend deployed to Railway (health check 200)
- [ ] Frontend deployed to Vercel (homepage loads)
- [ ] Production smoke tests pass
- [ ] All 33 requirements validated
- [ ] No crashes during 30-min flow
- [ ] All pages load within 2 seconds
- [ ] CSV export works
- [ ] Mobile responsive (tested)
- [ ] Documentation complete
- [ ] Ready for user acceptance testing

## must_haves
- Frontend and backend successfully integrated with working authentication
- All E2E tests passing (covering all 33 requirements)
- Backend deployed to Railway with health check returning 200
- Frontend deployed to Vercel with all pages accessible
- Production environment fully configured (environment variables, CORS, database)
- Smoke tests passing on production (signup → template → session → scorecard → submit → decision → CSV → logout)
- All pages loading within 2 seconds (performance requirement)
- CSV export downloading correctly with proper format
- No 500 errors during normal operations
- Documentation complete (DEPLOYMENT.md, API.md, README.md)
