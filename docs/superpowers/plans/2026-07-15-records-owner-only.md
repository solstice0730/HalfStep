# Records Owner-Only Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `baby_caregivers` and authorize care records only through `babies.owner_user_id`.

**Architecture:** The records repository resolves an accessible baby using its primary key and owner user ID. A forward Alembic migration drops the obsolete caregiver table, while the demo seed assigns the demo baby to the latest real social-login user when available.

**Tech Stack:** FastAPI, SQLAlchemy 2, Alembic, MySQL 8, unittest

## Global Constraints

- Preserve existing care records and users.
- Return `404 Baby not found` for a non-owner.
- Keep frontend `EXPO_PUBLIC_DEMO_BABY_ID=1` until the baby-profile API is connected.
- Do not create a PR before user review.

---

### Task 1: Owner-Only Repository and Seed

**Files:**
- Modify: `backend/tests/test_records_api.py`
- Modify: `backend/app/repositories/records_repository.py`
- Modify: `backend/app/models/records.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/scripts/seed_records_demo.py`

**Interfaces:**
- `get_accessible_baby(db, baby_id, user_id)` returns only a baby owned by `user_id`.
- `select_demo_owner(db)` returns the latest non-demo user or creates/returns `records-demo`.

- [ ] Write tests asserting owner access, non-owner `404`, and latest real user seed ownership.
- [ ] Run the focused tests and confirm they fail against caregiver-based behavior.
- [ ] Remove the caregiver model and join, then update the seed owner selection.
- [ ] Run the full backend suite and confirm all tests pass.
- [ ] Commit and push with `refactor: use owner-only records access`.

### Task 2: Drop Caregiver Table

**Files:**
- Create: `backend/alembic/versions/202607151600_drop_baby_caregivers.py`
- Modify: `docs/erd.md`
- Modify: `docs/prd-records.md`

**Interfaces:**
- Alembic revision `202607151600` follows `202607150900` and drops `baby_caregivers`.
- Downgrade recreates the prior table, indexes, foreign keys, and unique constraint.

- [ ] Add the migration and remove caregiver wording from records documentation.
- [ ] Apply migration to the Docker records database.
- [ ] Confirm `baby_caregivers` is absent and `care_logs` data remains.
- [ ] Run backend tests and compile checks.
- [ ] Commit and push with `refactor: remove baby caregivers table`.

### Task 3: Docker Verification

**Files:**
- Modify only if verification identifies a scoped defect.

- [ ] Rebuild the Docker backend against `halfstep_records_test_0715`.
- [ ] Run the demo seed after the real social user exists.
- [ ] Confirm `babies.owner_user_id` is the real login user.
- [ ] Create and requery a urine record with that user's token.
- [ ] Confirm a different user receives `404`.
- [ ] Run all frontend and backend tests and verify the branch is clean and pushed.
