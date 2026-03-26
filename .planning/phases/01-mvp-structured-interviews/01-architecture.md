---
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/001_initial_schema.sql
  - supabase/migrations/002_rls_policies.sql
  - backend/app/main.py
  - backend/app/models.py
  - backend/app/database.py
  - backend/requirements.txt
  - frontend/src/lib/api.ts
  - frontend/src/types/index.ts
  - frontend/next.config.js
autonomous: true
---

# 01-Architecture: Database Schema + API Contracts + Routing

## Goal
Establish the complete data model, API contracts, and routing foundation for the Scorecard MVP—ensuring all subsequent frontend and backend work has a clear contract to build against.

## Requirements Covered
- AUTH-05 (org-scoped data isolation)
- DATA-03 (Supabase persistence)
- Foundation for all SCORE-*, INT-*, SUB-*, DEC-* requirements

## Tasks

### Task 1: Supabase Database Schema
Create PostgreSQL schema with proper types, constraints, and indexes.

**Files:**
- `supabase/migrations/001_initial_schema.sql` (~150 LOC)

**Tables:**

```sql
-- organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- scorecard_templates table
CREATE TABLE scorecard_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  competencies JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- interview_sessions table
CREATE TABLE interview_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  role TEXT NOT NULL,
  scorecard_template_id UUID NOT NULL REFERENCES scorecard_templates(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- scorecard_submissions table (append-only)
CREATE TABLE scorecard_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  submitter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMPTZ,
  auto_saved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT one_submission_per_interviewer UNIQUE (interview_session_id, submitter_id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_scorecard_templates_org_id ON scorecard_templates(org_id);
CREATE INDEX idx_interview_sessions_org_id ON interview_sessions(org_id);
CREATE INDEX idx_interview_sessions_status ON interview_sessions(status);
CREATE INDEX idx_scorecard_submissions_interview_session_id ON scorecard_submissions(interview_session_id);
CREATE INDEX idx_scorecard_submissions_status ON scorecard_submissions(status);
```

**Acceptance Criteria:**
- [ ] All tables created with proper constraints
- [ ] UUID primary keys on all tables
- [ ] Timestamps (created_at, updated_at) on all tables
- [ ] Indexes on foreign keys and frequently queried columns
- [ ] JSONB fields for competencies and submission data
- [ ] Check constraints on status enums
- [ ] Migration runs without errors

### Task 2: Row-Level Security (RLS) Policies
Implement org-scoped RLS policies to enforce multi-tenant isolation.

**Files:**
- `supabase/migrations/002_rls_policies.sql` (~120 LOC)

**Policies:**

```sql
-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_submissions ENABLE ROW LEVEL SECURITY;

-- Organizations: users can only see their own org
CREATE POLICY org_isolation ON organizations
  FOR ALL USING (id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

-- Users: users can only see users in their org
CREATE POLICY user_org_isolation ON users
  FOR ALL USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

-- Scorecard templates: org-scoped
CREATE POLICY template_org_isolation ON scorecard_templates
  FOR ALL USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

-- Interview sessions: org-scoped
CREATE POLICY session_org_isolation ON interview_sessions
  FOR ALL USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

-- Scorecard submissions: org-scoped + immutability after submit
CREATE POLICY submission_org_isolation ON scorecard_submissions
  FOR SELECT USING (
    interview_session_id IN (
      SELECT id FROM interview_sessions WHERE org_id IN (
        SELECT org_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY submission_insert ON scorecard_submissions
  FOR INSERT WITH CHECK (
    submitter_id = auth.uid() AND
    interview_session_id IN (
      SELECT id FROM interview_sessions WHERE org_id IN (
        SELECT org_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY submission_update ON scorecard_submissions
  FOR UPDATE USING (
    submitter_id = auth.uid() AND
    status = 'draft'
  );
```

**Acceptance Criteria:**
- [ ] RLS enabled on all tables
- [ ] Policies enforce org-level isolation
- [ ] Users cannot access data from other orgs
- [ ] Submissions immutable after status = 'submitted'
- [ ] Policies tested with multiple org_id scenarios

### Task 3: FastAPI Backend Foundation
Set up FastAPI application structure, database connection, and base models.

**Files:**
- `backend/requirements.txt` (~15 LOC)
- `backend/app/main.py` (~80 LOC)
- `backend/app/database.py` (~40 LOC)
- `backend/app/models.py` (~200 LOC)

**requirements.txt:**
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
pydantic-settings==2.1.0
supabase==2.3.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
httpx==0.26.0
```

**main.py structure:**
```python
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from .database import get_db

app = FastAPI(
    title="Scorecard API",
    version="1.0.0",
    docs_url="/api/docs"
)

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health")
def health_check():
    return {"status": "healthy"}

# API versioning
from .routers import auth, templates, sessions, submissions, decisions

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(templates.router, prefix="/api/v1/templates", tags=["templates"])
app.include_router(sessions.router, prefix="/api/v1/sessions", tags=["sessions"])
app.include_router(submissions.router, prefix="/api/v1/submissions", tags=["submissions"])
app.include_router(decisions.router, prefix="/api/v1/decisions", tags=["decisions"])
```

**database.py:**
```python
from supabase import create_client, Client
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str

    class Config:
        env_file = ".env"

settings = Settings()

def get_supabase_client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def get_supabase_admin() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
```

**models.py (Pydantic schemas):**
```python
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from uuid import UUID

# Competency models
class RatingAnchor(BaseModel):
    level: int
    description: str

class Competency(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    scale_type: Literal["numeric", "strong_yes_no"] = "numeric"
    anchors: List[RatingAnchor] = []

# Template models
class ScorecardTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    competencies: List[Competency] = []

class ScorecardTemplate(BaseModel):
    id: UUID
    org_id: UUID
    name: str
    description: Optional[str]
    competencies: List[Competency]
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime

# Interview session models
class InterviewSessionCreate(BaseModel):
    candidate_name: str
    role: str
    scorecard_template_id: UUID

class InterviewSession(BaseModel):
    id: UUID
    org_id: UUID
    candidate_name: str
    role: str
    scorecard_template_id: UUID
    status: Literal["scheduled", "in_progress", "completed", "cancelled"]
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime

# Submission models
class CompetencyRating(BaseModel):
    competency_id: str
    rating: Optional[int] = None
    evidence: Optional[str] = None

class ScorecardSubmissionData(BaseModel):
    ratings: List[CompetencyRating]
    overall_notes: Optional[str] = None

class ScorecardSubmissionCreate(BaseModel):
    interview_session_id: UUID
    data: ScorecardSubmissionData

class ScorecardSubmission(BaseModel):
    id: UUID
    interview_session_id: UUID
    submitter_id: UUID
    data: ScorecardSubmissionData
    status: Literal["draft", "submitted"]
    submitted_at: Optional[datetime]
    auto_saved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
```

**Acceptance Criteria:**
- [ ] FastAPI app starts without errors
- [ ] Supabase client connects successfully
- [ ] Pydantic models match database schema
- [ ] Health check endpoint returns 200
- [ ] CORS configured for localhost:3000
- [ ] OpenAPI docs accessible at /api/docs

### Task 4: API Endpoint Contracts (OpenAPI Specification)
Define all REST API endpoints with request/response schemas.

**Files:**
- `backend/docs/api_spec.yaml` (~250 LOC)

**Endpoints:**

**Auth:**
- POST `/api/v1/auth/signup` → Create org + user
- POST `/api/v1/auth/login` → Get JWT token
- POST `/api/v1/auth/logout` → Invalidate session
- GET `/api/v1/auth/me` → Get current user

**Templates:**
- GET `/api/v1/templates` → List all templates (org-scoped)
- POST `/api/v1/templates` → Create template
- GET `/api/v1/templates/{id}` → Get template by ID
- PUT `/api/v1/templates/{id}` → Update template
- DELETE `/api/v1/templates/{id}` → Delete template

**Sessions:**
- GET `/api/v1/sessions` → List all interview sessions (org-scoped)
- POST `/api/v1/sessions` → Create interview session
- GET `/api/v1/sessions/{id}` → Get session by ID
- PATCH `/api/v1/sessions/{id}/status` → Update session status
- DELETE `/api/v1/sessions/{id}` → Delete session

**Submissions:**
- GET `/api/v1/submissions?interview_session_id={id}` → List submissions for session
- POST `/api/v1/submissions` → Create or update submission (upsert)
- GET `/api/v1/submissions/{id}` → Get submission by ID
- POST `/api/v1/submissions/{id}/submit` → Mark as submitted (immutable)
- POST `/api/v1/submissions/{id}/autosave` → Auto-save draft

**Decisions:**
- GET `/api/v1/decisions/sessions/{id}` → Get aggregated data for session
- GET `/api/v1/decisions/sessions/{id}/export` → Export to CSV

**Acceptance Criteria:**
- [ ] All endpoints documented with OpenAPI spec
- [ ] Request/response schemas defined
- [ ] Error responses documented (400, 401, 403, 404, 500)
- [ ] Authentication requirements specified
- [ ] Org-scoping implicit in all endpoints

### Task 5: Next.js Routing Structure
Set up Next.js app router with page structure and TypeScript types.

**Files:**
- `frontend/src/app/layout.tsx` (~30 LOC)
- `frontend/src/app/page.tsx` (~20 LOC)
- `frontend/src/app/(auth)/login/page.tsx` (stub, ~10 LOC)
- `frontend/src/app/(auth)/signup/page.tsx` (stub, ~10 LOC)
- `frontend/src/app/(dashboard)/dashboard/page.tsx` (stub, ~10 LOC)
- `frontend/src/app/(dashboard)/templates/page.tsx` (stub, ~10 LOC)
- `frontend/src/app/(dashboard)/templates/[id]/page.tsx` (stub, ~10 LOC)
- `frontend/src/app/(dashboard)/templates/new/page.tsx` (stub, ~10 LOC)
- `frontend/src/app/(dashboard)/sessions/page.tsx` (stub, ~10 LOC)
- `frontend/src/app/(dashboard)/sessions/[id]/page.tsx` (stub, ~10 LOC)
- `frontend/src/app/(dashboard)/sessions/new/page.tsx` (stub, ~10 LOC)
- `frontend/src/app/(dashboard)/submissions/[id]/page.tsx` (stub, ~10 LOC)
- `frontend/src/app/(dashboard)/decisions/[sessionId]/page.tsx` (stub, ~10 LOC)
- `frontend/src/types/index.ts` (~150 LOC)
- `frontend/src/lib/api.ts` (~100 LOC)

**Route Structure:**
```
/                           → Landing page (redirect to /dashboard if logged in)
/login                      → Login page
/signup                     → Signup page
/dashboard                  → Dashboard (recent sessions + templates)
/templates                  → List all templates
/templates/new              → Create new template
/templates/[id]             → View/edit template
/sessions                   → List all interview sessions
/sessions/new               → Create new session
/sessions/[id]              → View session details
/submissions/[id]           → Fill out scorecard (interviewer view)
/decisions/[sessionId]      → Aggregated decision view (recruiter view)
```

**types/index.ts:**
```typescript
export type RatingAnchor = {
  level: number;
  description: string;
};

export type Competency = {
  id: string;
  name: string;
  description?: string;
  scale_type: "numeric" | "strong_yes_no";
  anchors: RatingAnchor[];
};

export type ScorecardTemplate = {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  competencies: Competency[];
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export type InterviewSession = {
  id: string;
  org_id: string;
  candidate_name: string;
  role: string;
  scorecard_template_id: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export type CompetencyRating = {
  competency_id: string;
  rating?: number;
  evidence?: string;
};

export type ScorecardSubmission = {
  id: string;
  interview_session_id: string;
  submitter_id: string;
  data: {
    ratings: CompetencyRating[];
    overall_notes?: string;
  };
  status: "draft" | "submitted";
  submitted_at?: string;
  auto_saved_at?: string;
  created_at: string;
  updated_at: string;
};
```

**lib/api.ts (stub):**
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}
```

**Acceptance Criteria:**
- [ ] All route files created with stub components
- [ ] TypeScript types match backend Pydantic models
- [ ] API client utility configured with base URL
- [ ] App runs with `npm run dev` (no errors)
- [ ] All pages render "Coming soon" placeholders

## Success Criteria
- [ ] Database migrations run successfully
- [ ] RLS policies enforce org isolation
- [ ] FastAPI backend starts and serves OpenAPI docs
- [ ] Next.js frontend starts with all routes accessible
- [ ] TypeScript types match database schema
- [ ] No compilation errors in backend or frontend
- [ ] API contracts documented and agreed upon
- [ ] Ready for parallel frontend + backend development

## must_haves
- Complete database schema with all 5 tables (organizations, users, scorecard_templates, interview_sessions, scorecard_submissions)
- RLS policies enforcing org-scoped isolation on all tables
- FastAPI app structure with Supabase client connection
- Pydantic models matching database schema
- Next.js routing structure with all 13 pages defined
- TypeScript types matching backend models
- OpenAPI documentation at /api/docs
