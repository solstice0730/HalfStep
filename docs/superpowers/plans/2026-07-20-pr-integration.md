# PR Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate PRs #23 through #26 and make PR #22 compatible with the consolidated backend.

**Architecture:** Use PR #23's `Baby` model as the shared ownership boundary. Apply diary, records/calendar, and community migrations in a single dependency chain, then resolve the frontend once backend contracts are stable.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, MySQL, pytest, React Native, TypeScript

## Global Constraints

- Do not merge a PR with failing tests.
- Do not retain duplicate SQLAlchemy models for the same table.
- Keep one Alembic head after integration.
- Commit and push each branch before merging its PR.

---

### Task 1: Baby Profile Foundation

**Files:** PR #23 backend files and migration.

- [ ] Run the backend tests on `feature/baby-profile`.
- [ ] Confirm the `babies` schema matches downstream requirements.
- [ ] Push any required fixes and merge PR #23.

### Task 2: Diary Persistence Safety

**Files:**
- Modify: `backend/app/services/diary_service.py`
- Modify: `backend/app/repositories/diary_repository.py`
- Modify: `backend/alembic/versions/202607190002_create_diaries_table.py`
- Create: `backend/tests/test_diary_api.py`

- [ ] Add failing tests for foreign-baby creation and same-day uniqueness.
- [ ] Run the focused tests and confirm the expected failures.
- [ ] Add baby ownership validation and a unique database constraint.
- [ ] Run the full backend suite, commit, push, and merge PR #24.

### Task 3: Records And Calendar Consolidation

**Files:** PR #25 backend records/calendar files, migrations, and overlapping frontend files.

- [ ] Merge the latest `develop` into `feature/records-calendar`.
- [ ] Resolve router and model exports while retaining every merged endpoint.
- [ ] Remove the duplicate `Baby` model and baby/caregiver migration operations.
- [ ] Import the shared `Baby` model from `app.models.baby`.
- [ ] Add failing calendar tests for persisted diary indicators.
- [ ] Connect calendar month/day responses to diary data.
- [ ] Remove overlapping frontend ownership already supplied by PR #22.
- [ ] Run backend tests and type checks, commit, push, and merge PR #25.

### Task 4: Community Consolidation

**Files:** PR #26 backend community files and migrations.

- [ ] Merge the latest `develop` into `feature/community`.
- [ ] Resolve router, model exports, configuration, and docs without dropping existing features.
- [ ] Attach the first community migration to the current Alembic head.
- [ ] Run the backend suite, commit, push, and merge PR #26.

### Task 5: Integrated Frontend And AI

**Files:** PR #22 frontend feature services/screens and AI repository/service files.

- [ ] Merge the latest `develop` into `feature/ai-diary` and resolve conflicts.
- [ ] Replace the baby profile mock with PR #23 APIs.
- [ ] Replace in-memory diary storage with PR #24 APIs.
- [ ] Replace AI care-log mock reads with PR #25 data access.
- [ ] Run backend tests, frontend tests, and TypeScript checks.
- [ ] Commit and push PR #22 for final review.

### Task 6: Docker Integration Verification

- [ ] Start MySQL, backend, and frontend with Docker Compose.
- [ ] Run `alembic heads` and confirm one head.
- [ ] Run `alembic upgrade head` against an empty database.
- [ ] Verify authentication, baby profile, records, calendar, diary, and community API flows.
- [ ] Record exact verification results in the relevant PR descriptions.

