# AGENTS.md

## Project Overview

This project is an English online exam and learning diagnosis platform.

The system should not be treated as a simple quiz app. It is a teaching workflow platform.

Core workflow:

1. Import exam materials.
2. Generate import drafts.
3. Let teachers or admins review and edit drafts.
4. Confirm drafts into formal exams.
5. Edit and preview formal exams.
6. Publish exams to classes.
7. Students take exams.
8. Teachers view assignment analytics.
9. Students view learning reports.
10. Later features may include diagnosis, teaching materials, supplemental practice, export and deployment checks.

## Tech Stack

Frontend:

* Vue 3
* Vite
* Vue Router
* JavaScript
* CSS

Backend:

* Node.js
* Express
* Prisma
* PostgreSQL / Neon
* JWT authentication

Main roles:

* STUDENT
* TEACHER
* ADMIN

## Development Rules

Always follow this workflow:

1. Read relevant files first.
2. Make a short plan.
3. Edit only necessary files.
4. Run checks when possible.
5. Review the diff.
6. Summarize changes and risks.

Do not jump directly into large rewrites.

Do not add new modules before the main workflow is stable.

## Branch Rules

Do not directly modify `main` for risky changes.

Use feature branches such as:

* `codex/context-setup`
* `codex/platform-foundation`
* `codex/import-workflow`
* `codex/exam-workflow`
* `codex/final-e2e`

Each major task should be developed in its own branch or task thread.

## Forbidden Changes

Never commit:

* `.env`
* database passwords
* Neon connection strings
* OpenAI API keys
* `node_modules`
* build outputs
* temporary logs

Do not modify production secrets.

Do not expose private environment variables in README, examples, screenshots, or committed files.

## Backend Rules

When changing backend code, always check:

1. The relevant route file.
2. `backend/index.js` route mounting.
3. Prisma schema impact.
4. Permission middleware.
5. Frontend API caller path.
6. Empty data handling.
7. Error response format.

After backend changes, run when possible:

```bash
cd backend
npm install
npx prisma validate
npx prisma generate
node --check index.js
```

Also run `node --check` for every changed route file.

## Frontend Rules

When changing frontend code, always check:

1. Loading state.
2. Empty state.
3. Error state.
4. 401 / 403 / 500 handling.
5. Router path.
6. API path.
7. Whether each button connects to a real backend endpoint.

After frontend changes, run when possible:

```bash
cd frontend
npm install
npm run build
```

Do not create fake buttons that do not call real APIs.

## Current Priority

The current priority is stability and correctness.

Important areas:

1. Import workflow.
2. TXT / DOCX / text-based PDF parsing.
3. CET-4 exam structure.
4. Teacher / student / admin permissions.
5. Exam submission.
6. Teacher analytics.
7. Student learning reports.
8. End-to-end testing.

Do not blindly add new features before import, exam submission, analytics, and reporting are stable.

## Codex Usage Rules

Before implementing a task, Codex should first output:

1. Understanding of the task.
2. Relevant files to inspect.
3. Files it expects to modify.
4. Files it must not modify.
5. Risks.
6. Test plan.

For complex tasks, Codex should not edit files until the plan is approved.

For bug fixes, Codex should:

1. Explain the suspected root cause.
2. Propose the smallest fix.
3. Avoid unrelated refactoring.
4. Run relevant checks.
5. Summarize the fix and remaining risks.

## Import Parser Priority

The import parser is a critical part of this project.

Codex must not assume that every exam question is an A-D multiple-choice question.

The parser must understand CET-4 exam structure, including:

1. Writing.
2. Listening.
3. Banked cloze with A-O options.
4. Information matching.
5. Reading comprehension.
6. Translation.

For scanned PDF files, the basic parser should return a clear warning instead of pretending to parse successfully.

## Review Rules

At the end of each task, Codex should report:

1. Changed files.
2. What changed.
3. Commands run.
4. Test results.
5. Permissions checked.
6. Whether `.env` or secrets were touched.
7. Remaining risks.
