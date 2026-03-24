# Operational Patterns — Ralph Loop

## Safe Operations
- Edit any file under apps/, infra/, supabase/migrations/, packages/
- Create new files in these directories
- Run: npx tsc --noEmit (typecheck)
- Run: npx eslint (lint)
- Git commit with descriptive messages

## Dangerous Operations (ASK/SKIP)
- Do NOT push to remote
- Do NOT modify files outside the content platform worktree
- Do NOT run npm install (dependencies may not match)
- Do NOT delete existing breadcrumb metadata
- Do NOT modify salesblock-io or jobtracker repos

## Quality Gates
- TypeScript must compile: npx tsc --noEmit
- ESLint must pass: npx eslint src/ --ext .ts,.tsx (if configured per app)
- No hardcoded userId strings (grep for 00000000-0000-0000-0000)
- All @crumb edge targets must point to real files

## Project-Specific Patterns
- Supabase client: use createServerClient(accessToken) for authenticated routes
- Middleware location: apps/{app}/src/middleware.ts (Next.js convention)
- API wrapper location: apps/{app}/src/lib/api-handler.ts
- Import aliases: @/ maps to src/ in both apps
- Env vars: NEXT_PUBLIC_ prefix for client-side, plain for server-side
