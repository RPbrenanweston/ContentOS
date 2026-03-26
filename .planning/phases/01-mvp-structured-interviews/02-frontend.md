---
wave: 2
depends_on: ["01-architecture.md"]
files_modified:
  - frontend/src/app/(auth)/login/page.tsx
  - frontend/src/app/(auth)/signup/page.tsx
  - frontend/src/app/(dashboard)/dashboard/page.tsx
  - frontend/src/app/(dashboard)/templates/page.tsx
  - frontend/src/app/(dashboard)/templates/new/page.tsx
  - frontend/src/app/(dashboard)/templates/[id]/page.tsx
  - frontend/src/app/(dashboard)/sessions/page.tsx
  - frontend/src/app/(dashboard)/sessions/new/page.tsx
  - frontend/src/app/(dashboard)/sessions/[id]/page.tsx
  - frontend/src/app/(dashboard)/submissions/[id]/page.tsx
  - frontend/src/app/(dashboard)/decisions/[sessionId]/page.tsx
  - frontend/src/components/auth/LoginForm.tsx
  - frontend/src/components/auth/SignupForm.tsx
  - frontend/src/components/templates/TemplateList.tsx
  - frontend/src/components/templates/TemplateBuilder.tsx
  - frontend/src/components/templates/CompetencyEditor.tsx
  - frontend/src/components/sessions/SessionList.tsx
  - frontend/src/components/sessions/SessionForm.tsx
  - frontend/src/components/submissions/ScorecardForm.tsx
  - frontend/src/components/decisions/DecisionView.tsx
  - frontend/src/lib/auth.ts
  - frontend/src/lib/api.ts
  - frontend/src/hooks/useAutoSave.ts
  - frontend/tailwind.config.js
  - frontend/package.json
autonomous: true
---

# 02-Frontend: Dashboard, Scorecard Builder, Interview Workflow, Decision Views

## Goal
Build all user-facing interfaces for the Scorecard MVP—authentication, template builder, interview workflow, scorecard submission, and decision aggregation—with responsive design and auto-save functionality.

## Requirements Covered
- AUTH-01, AUTH-02, AUTH-04 (signup, login, logout)
- SCORE-01 to SCORE-06 (template creation and management)
- INT-01 to INT-04 (interview session management)
- SUB-01 to SUB-07 (scorecard submission and auto-save)
- DEC-01 to DEC-04 (decision views and export)
- UI-01 to UI-05 (dashboard, forms, error handling)

## Tasks

### Task 1: Authentication UI (Login + Signup)
Build login and signup forms with validation and error handling.

**Files:**
- `frontend/src/app/(auth)/login/page.tsx` (~40 LOC)
- `frontend/src/app/(auth)/signup/page.tsx` (~45 LOC)
- `frontend/src/components/auth/LoginForm.tsx` (~120 LOC)
- `frontend/src/components/auth/SignupForm.tsx` (~150 LOC)
- `frontend/src/lib/auth.ts` (~80 LOC)

**LoginForm.tsx:**
```typescript
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full border rounded-md px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 block w-full border rounded-md px-3 py-2"
        />
      </div>
      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Logging in..." : "Log In"}
      </button>
    </form>
  );
}
```

**SignupForm.tsx (similar structure with org_name field):**
- Email, password, full_name, org_name fields
- Validation for password strength (min 8 chars)
- Creates org + user in one call
- Redirects to dashboard on success

**auth.ts:**
```typescript
import { apiRequest } from "./api";

export async function login(email: string, password: string) {
  const data = await apiRequest<{ access_token: string; user: any }>(
    "/api/v1/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }
  );
  localStorage.setItem("access_token", data.access_token);
  return data.user;
}

export async function signup(params: {
  email: string;
  password: string;
  full_name: string;
  org_name: string;
}) {
  const data = await apiRequest<{ access_token: string; user: any }>(
    "/api/v1/auth/signup",
    {
      method: "POST",
      body: JSON.stringify(params),
    }
  );
  localStorage.setItem("access_token", data.access_token);
  return data.user;
}

export async function logout() {
  await apiRequest("/api/v1/auth/logout", { method: "POST" });
  localStorage.removeItem("access_token");
}

export function getToken() {
  return localStorage.getItem("access_token");
}
```

**Acceptance Criteria:**
- [ ] Login form validates email and password
- [ ] Signup form creates org + user
- [ ] Error messages display clearly (AUTH-02, UI-05)
- [ ] Successful login redirects to /dashboard
- [ ] Token stored in localStorage
- [ ] Forms are mobile-responsive

### Task 2: Dashboard Page
Display recent interviews and templates with quick actions.

**Files:**
- `frontend/src/app/(dashboard)/dashboard/page.tsx` (~80 LOC)
- `frontend/src/components/dashboard/RecentSessions.tsx` (~100 LOC)
- `frontend/src/components/dashboard/RecentTemplates.tsx` (~80 LOC)

**dashboard/page.tsx:**
```typescript
import { RecentSessions } from "@/components/dashboard/RecentSessions";
import { RecentTemplates } from "@/components/dashboard/RecentTemplates";
import Link from "next/link";

export default function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="space-x-4">
          <Link
            href="/sessions/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            New Interview
          </Link>
          <Link
            href="/templates/new"
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            New Template
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Recent Interviews</h2>
          <RecentSessions />
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-4">Templates</h2>
          <RecentTemplates />
        </section>
      </div>
    </div>
  );
}
```

**RecentSessions.tsx:**
- Fetch last 5 interview sessions via API
- Display candidate name, role, status, created date
- Link to session detail page
- Show "No interviews yet" if empty

**RecentTemplates.tsx:**
- Fetch all templates via API
- Display template name, description, competency count
- Link to template detail page
- Show "No templates yet" if empty

**Acceptance Criteria:**
- [ ] Dashboard loads within 2 seconds (UI-01)
- [ ] Recent interviews display correctly
- [ ] Templates display correctly
- [ ] Quick action buttons visible (UI-04)
- [ ] Links navigate to correct pages
- [ ] Responsive layout on mobile/tablet

### Task 3: Scorecard Template Builder
Create a visual builder for scorecard templates with competencies and anchors.

**Files:**
- `frontend/src/app/(dashboard)/templates/new/page.tsx` (~50 LOC)
- `frontend/src/app/(dashboard)/templates/[id]/page.tsx` (~60 LOC)
- `frontend/src/components/templates/TemplateBuilder.tsx` (~250 LOC)
- `frontend/src/components/templates/CompetencyEditor.tsx` (~180 LOC)

**TemplateBuilder.tsx structure:**
```typescript
"use client";
import { useState } from "react";
import { Competency } from "@/types";
import { CompetencyEditor } from "./CompetencyEditor";
import { apiRequest } from "@/lib/api";
import { useRouter } from "next/navigation";

export function TemplateBuilder({ initialData }: { initialData?: any }) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [competencies, setCompetencies] = useState<Competency[]>(
    initialData?.competencies || []
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  function addCompetency() {
    const newComp: Competency = {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      scale_type: "numeric",
      anchors: [],
    };
    setCompetencies([...competencies, newComp]);
  }

  function updateCompetency(id: string, updates: Partial<Competency>) {
    setCompetencies(competencies.map(c =>
      c.id === id ? { ...c, ...updates } : c
    ));
  }

  function removeCompetency(id: string) {
    setCompetencies(competencies.filter(c => c.id !== id));
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Template name is required");
      return;
    }
    if (competencies.length === 0) {
      setError("At least one competency is required");
      return;
    }

    setSaving(true);
    try {
      const payload = { name, description, competencies };
      if (initialData?.id) {
        await apiRequest(`/api/v1/templates/${initialData.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/api/v1/templates", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      router.push("/templates");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">
        {initialData?.id ? "Edit Template" : "Create Template"}
      </h1>

      {/* Left sidebar: metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="space-y-4 sticky top-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Template Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                placeholder="e.g. Engineering Interview"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                rows={4}
                placeholder="Optional description..."
              />
            </div>
            <button
              onClick={addCompetency}
              className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
            >
              + Add Competency
            </button>
          </div>
        </div>

        {/* Right panel: competency list */}
        <div className="lg:col-span-2 space-y-4">
          {competencies.length === 0 ? (
            <div className="text-gray-500 text-center py-12">
              No competencies yet. Click "Add Competency" to start.
            </div>
          ) : (
            competencies.map((comp) => (
              <CompetencyEditor
                key={comp.id}
                competency={comp}
                onUpdate={(updates) => updateCompetency(comp.id, updates)}
                onRemove={() => removeCompetency(comp.id)}
              />
            ))
          )}
        </div>
      </div>

      {error && <div className="text-red-600 mt-4">{error}</div>}

      <div className="mt-8 flex justify-end space-x-4">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Template"}
        </button>
      </div>
    </div>
  );
}
```

**CompetencyEditor.tsx:**
- Collapsible card for each competency
- Name, description, scale type dropdown (numeric vs strong_yes_no)
- Anchor editor (add/remove rating levels with descriptions)
- Remove competency button

**Acceptance Criteria:**
- [ ] Template name and description editable (SCORE-01)
- [ ] Add/remove competencies (SCORE-02)
- [ ] Configure scale type per competency (SCORE-03)
- [ ] Add behavioral anchors (SCORE-04)
- [ ] Save template to database (SCORE-05)
- [ ] Layout matches UI-02 (list on left, editor on right)
- [ ] Mobile-responsive (stacks vertically)
- [ ] Error messages for required fields (UI-05)

### Task 4: Interview Session Management
Create and manage interview sessions with status updates.

**Files:**
- `frontend/src/app/(dashboard)/sessions/page.tsx` (~60 LOC)
- `frontend/src/app/(dashboard)/sessions/new/page.tsx` (~40 LOC)
- `frontend/src/app/(dashboard)/sessions/[id]/page.tsx` (~100 LOC)
- `frontend/src/components/sessions/SessionList.tsx` (~120 LOC)
- `frontend/src/components/sessions/SessionForm.tsx` (~150 LOC)

**SessionForm.tsx:**
```typescript
"use client";
import { useState, useEffect } from "react";
import { ScorecardTemplate } from "@/types";
import { apiRequest } from "@/lib/api";
import { useRouter } from "next/navigation";

export function SessionForm() {
  const [candidateName, setCandidateName] = useState("");
  const [role, setRole] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templates, setTemplates] = useState<ScorecardTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const data = await apiRequest<ScorecardTemplate[]>("/api/v1/templates");
        setTemplates(data);
      } catch (err) {
        setError("Failed to load templates");
      }
    }
    fetchTemplates();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!candidateName || !role || !templateId) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        candidate_name: candidateName,
        role,
        scorecard_template_id: templateId,
      };
      await apiRequest("/api/v1/sessions", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      router.push("/sessions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-1">
          Candidate Name *
        </label>
        <input
          type="text"
          value={candidateName}
          onChange={(e) => setCandidateName(e.target.value)}
          className="w-full border rounded-md px-3 py-2"
          placeholder="John Doe"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Role *</label>
        <input
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full border rounded-md px-3 py-2"
          placeholder="Senior Engineer"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">
          Scorecard Template *
        </label>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="w-full border rounded-md px-3 py-2"
        >
          <option value="">Select a template...</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Interview"}
      </button>
    </form>
  );
}
```

**sessions/[id]/page.tsx:**
- Display session details (candidate, role, status, template)
- Status update buttons (mark in_progress, mark completed)
- List of scorecards submitted for this session
- Link to scorecard submission page for current user

**SessionList.tsx:**
- Table view of all sessions
- Columns: candidate, role, status, created date, actions
- Filter by status (dropdown)
- Link to session detail page

**Acceptance Criteria:**
- [ ] Create interview session (INT-01)
- [ ] Update session status to in_progress (INT-02)
- [ ] Update session status to completed (INT-03)
- [ ] View all sessions (INT-04)
- [ ] Form validates required fields (UI-05)
- [ ] Status buttons clearly visible (UI-04)
- [ ] Sessions load within 2 seconds

### Task 5: Scorecard Submission Interface
Build the interviewer scorecard form with auto-save.

**Files:**
- `frontend/src/app/(dashboard)/submissions/[id]/page.tsx` (~80 LOC)
- `frontend/src/components/submissions/ScorecardForm.tsx` (~300 LOC)
- `frontend/src/hooks/useAutoSave.ts` (~60 LOC)

**ScorecardForm.tsx:**
```typescript
"use client";
import { useState, useEffect } from "react";
import { CompetencyRating, ScorecardSubmission, Competency } from "@/types";
import { apiRequest } from "@/lib/api";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useRouter } from "next/navigation";

export function ScorecardForm({ sessionId }: { sessionId: string }) {
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [ratings, setRatings] = useState<CompetencyRating[]>([]);
  const [overallNotes, setOverallNotes] = useState("");
  const [submission, setSubmission] = useState<ScorecardSubmission | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Fetch template competencies and existing submission
  useEffect(() => {
    async function fetchData() {
      try {
        const session = await apiRequest(`/api/v1/sessions/${sessionId}`);
        const template = await apiRequest(`/api/v1/templates/${session.scorecard_template_id}`);
        setCompetencies(template.competencies);

        // Check for existing draft submission
        const submissions = await apiRequest<ScorecardSubmission[]>(
          `/api/v1/submissions?interview_session_id=${sessionId}`
        );
        const mySubmission = submissions.find(s => s.status === "draft");
        if (mySubmission) {
          setSubmission(mySubmission);
          setRatings(mySubmission.data.ratings);
          setOverallNotes(mySubmission.data.overall_notes || "");
        } else {
          // Initialize empty ratings
          setRatings(template.competencies.map((c: Competency) => ({
            competency_id: c.id,
            rating: undefined,
            evidence: "",
          })));
        }
      } catch (err) {
        setError("Failed to load scorecard");
      }
    }
    fetchData();
  }, [sessionId]);

  // Auto-save hook (every 30 seconds)
  useAutoSave(
    async () => {
      if (!submission?.id) return;
      await apiRequest(`/api/v1/submissions/${submission.id}/autosave`, {
        method: "POST",
        body: JSON.stringify({
          data: { ratings, overall_notes: overallNotes },
        }),
      });
    },
    30000,
    [ratings, overallNotes]
  );

  function updateRating(competencyId: string, updates: Partial<CompetencyRating>) {
    setRatings(ratings.map(r =>
      r.competency_id === competencyId ? { ...r, ...updates } : r
    ));
  }

  async function handleSubmit() {
    // Validate all competencies rated
    const incomplete = ratings.filter(r => r.rating === undefined);
    if (incomplete.length > 0) {
      setError(`Please rate all competencies (${incomplete.length} remaining)`);
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest(`/api/v1/submissions/${submission!.id}/submit`, {
        method: "POST",
      });
      router.push(`/sessions/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit scorecard");
    } finally {
      setSubmitting(false);
    }
  }

  if (submission?.status === "submitted") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <p className="text-green-800 font-medium">
            This scorecard has been submitted and is now read-only.
          </p>
        </div>
        {/* Read-only view of ratings */}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Complete Scorecard</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {competencies.map((comp, idx) => {
          const rating = ratings.find(r => r.competency_id === comp.id);
          return (
            <div key={comp.id} className="border rounded-lg p-6 bg-white shadow-sm">
              <h3 className="text-lg font-semibold mb-2">
                {idx + 1}. {comp.name}
              </h3>
              {comp.description && (
                <p className="text-gray-600 text-sm mb-4">{comp.description}</p>
              )}

              {/* Rating buttons */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Rating *</label>
                <div className="flex space-x-2">
                  {comp.scale_type === "numeric" ? (
                    [1, 2, 3, 4, 5].map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => updateRating(comp.id, { rating: level })}
                        className={`px-4 py-2 border rounded-md ${
                          rating?.rating === level
                            ? "bg-blue-600 text-white"
                            : "bg-white hover:bg-gray-50"
                        }`}
                      >
                        {level}
                      </button>
                    ))
                  ) : (
                    ["Strong No", "No", "Yes", "Strong Yes"].map((label, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => updateRating(comp.id, { rating: idx + 1 })}
                        className={`px-4 py-2 border rounded-md text-sm ${
                          rating?.rating === idx + 1
                            ? "bg-blue-600 text-white"
                            : "bg-white hover:bg-gray-50"
                        }`}
                      >
                        {label}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Evidence notes */}
              <div>
                <label className="block text-sm font-medium mb-2">Evidence / Notes</label>
                <textarea
                  value={rating?.evidence || ""}
                  onChange={(e) =>
                    updateRating(comp.id, { evidence: e.target.value })
                  }
                  className="w-full border rounded-md px-3 py-2"
                  rows={3}
                  placeholder="What did you observe? Examples, quotes, behaviors..."
                />
              </div>

              {/* Show anchors if defined */}
              {comp.anchors.length > 0 && (
                <div className="mt-4 text-sm text-gray-600">
                  <p className="font-medium mb-1">Rating Guide:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {comp.anchors.map(anchor => (
                      <li key={anchor.level}>
                        <strong>{anchor.level}:</strong> {anchor.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}

        {/* Overall notes */}
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <label className="block text-sm font-medium mb-2">Overall Notes</label>
          <textarea
            value={overallNotes}
            onChange={(e) => setOverallNotes(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
            rows={4}
            placeholder="Any additional observations or context..."
          />
        </div>
      </div>

      <div className="mt-8 flex justify-end space-x-4">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Scorecard"}
        </button>
      </div>

      <p className="text-sm text-gray-500 mt-4">
        Your work is automatically saved every 30 seconds.
      </p>
    </div>
  );
}
```

**useAutoSave.ts:**
```typescript
import { useEffect, useRef } from "react";

export function useAutoSave(
  saveFn: () => Promise<void>,
  interval: number,
  deps: any[]
) {
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      saveFn().catch(console.error);
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, deps);
}
```

**Acceptance Criteria:**
- [ ] Interviewer can open scorecard (SUB-01)
- [ ] Add evidence notes per competency (SUB-02)
- [ ] Rate each competency (SUB-03)
- [ ] Auto-save every 30 seconds (SUB-04)
- [ ] Submit scorecard (SUB-05)
- [ ] Submitted scorecard is read-only (SUB-06, SUB-07)
- [ ] Interface is compact and fast (UI-03)
- [ ] Mobile-friendly (secondary requirement)
- [ ] Clear error messages (UI-05)

### Task 6: Decision Aggregation View
Show recruiter all scorecards for a candidate with aggregated scores.

**Files:**
- `frontend/src/app/(dashboard)/decisions/[sessionId]/page.tsx` (~80 LOC)
- `frontend/src/components/decisions/DecisionView.tsx` (~250 LOC)

**DecisionView.tsx:**
```typescript
"use client";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";

type AggregatedData = {
  session: any;
  template: any;
  submissions: any[];
  aggregation: {
    competency_id: string;
    competency_name: string;
    average: number;
    ratings: number[];
    count_by_rating: Record<number, number>;
  }[];
};

export function DecisionView({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<AggregatedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await apiRequest<AggregatedData>(
          `/api/v1/decisions/sessions/${sessionId}`
        );
        setData(result);
      } catch (err) {
        console.error("Failed to load decision data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [sessionId]);

  async function handleExport() {
    setExporting(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/decisions/sessions/${sessionId}/export`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scorecard-${sessionId}.csv`;
      a.click();
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data found</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            Decision: {data.session.candidate_name}
          </h1>
          <p className="text-gray-600">Role: {data.session.role}</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {exporting ? "Exporting..." : "Export to CSV"}
        </button>
      </div>

      {/* Summary stats */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
        <p className="text-sm text-gray-600">
          <strong>{data.submissions.length}</strong> scorecards submitted
        </p>
      </div>

      {/* Aggregated scores by competency */}
      <div className="space-y-6">
        {data.aggregation.map((agg) => (
          <div key={agg.competency_id} className="border rounded-lg p-6 bg-white shadow-sm">
            <h3 className="text-lg font-semibold mb-4">{agg.competency_name}</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Average Rating</p>
                <p className="text-3xl font-bold text-blue-600">
                  {agg.average.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Distribution</p>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map(level => (
                    <div key={level} className="text-center">
                      <div className="text-xs text-gray-500">{level}</div>
                      <div className="text-lg font-medium">
                        {agg.count_by_rating[level] || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Individual ratings */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Individual Ratings:</p>
              <div className="space-y-2">
                {data.submissions.map((sub) => {
                  const rating = sub.data.ratings.find(
                    (r: any) => r.competency_id === agg.competency_id
                  );
                  return (
                    <div key={sub.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">{sub.submitter_name}</span>
                      <span className="font-medium">
                        {rating?.rating || "N/A"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* All submissions with evidence */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Full Scorecards</h2>
        <div className="space-y-6">
          {data.submissions.map((sub) => (
            <div key={sub.id} className="border rounded-lg p-6 bg-gray-50">
              <h3 className="font-semibold mb-4">
                {sub.submitter_name} - Submitted {new Date(sub.submitted_at).toLocaleString()}
              </h3>
              <div className="space-y-4">
                {sub.data.ratings.map((rating: any) => {
                  const comp = data.template.competencies.find(
                    (c: any) => c.id === rating.competency_id
                  );
                  return (
                    <div key={rating.competency_id} className="bg-white p-4 rounded-md">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">{comp?.name}</span>
                        <span className="text-blue-600 font-bold">{rating.rating}</span>
                      </div>
                      {rating.evidence && (
                        <p className="text-sm text-gray-700">{rating.evidence}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] View all scorecards for candidate (DEC-01)
- [ ] Display aggregated score summary (DEC-02)
- [ ] Show all interviewer names and ratings (DEC-03)
- [ ] Export to CSV (DEC-04)
- [ ] CSV includes all competencies, ratings, notes (DATA-01)
- [ ] CSV formatted for ATS import (DATA-02)
- [ ] Page loads within 2 seconds

### Task 7: Styling and Responsive Design
Apply Tailwind CSS for consistent styling and mobile responsiveness.

**Files:**
- `frontend/tailwind.config.js` (~30 LOC)
- `frontend/src/app/globals.css` (~50 LOC)
- `frontend/package.json` (add dependencies)

**Dependencies:**
```json
{
  "dependencies": {
    "next": "^14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.3.3",
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.1",
    "postcss": "^8.4.33",
    "autoprefixer": "^10.4.17"
  }
}
```

**tailwind.config.js:**
```js
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2563eb",
        secondary: "#10b981",
      },
    },
  },
  plugins: [],
};
```

**Acceptance Criteria:**
- [ ] All pages use consistent color scheme
- [ ] Forms have proper spacing and alignment
- [ ] Buttons have hover states
- [ ] Mobile responsive (stacks vertically on small screens)
- [ ] No horizontal scroll on mobile
- [ ] Loading states clearly visible

## Success Criteria
- [ ] All pages render without errors
- [ ] Authentication flow works end-to-end
- [ ] Template builder creates and saves templates
- [ ] Interview sessions can be created and updated
- [ ] Scorecard submission works with auto-save
- [ ] Decision view shows aggregated data
- [ ] CSV export downloads correctly
- [ ] All components are mobile-responsive
- [ ] Error messages display clearly
- [ ] All UI requirements (UI-01 to UI-05) met
- [ ] No console errors in browser

## must_haves
- Functional login and signup forms (AUTH-01, AUTH-02, AUTH-04)
- Template builder with competency editor (SCORE-01 to SCORE-05)
- Interview session creation form (INT-01)
- Scorecard submission form with auto-save every 30 seconds (SUB-01 to SUB-07)
- Decision aggregation view with CSV export (DEC-01 to DEC-04)
- Dashboard showing recent interviews and templates (UI-01)
- All forms validate required fields with clear error messages (UI-05)
- Mobile-responsive layout (UI-03 secondary requirement)
