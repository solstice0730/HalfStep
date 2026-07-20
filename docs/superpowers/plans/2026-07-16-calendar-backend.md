# Calendar Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement authenticated monthly calendar summaries and daily care-record timelines for issue #9.

**Architecture:** A calendar router delegates access control and aggregation to a calendar service. The repository reads `care_logs` in Korean-calendar-day UTC ranges, while response formatting remains isolated from the existing record creation API.

**Tech Stack:** FastAPI, SQLAlchemy 2, MySQL 8, unittest, Docker Compose

## Global Constraints

- Backend only; do not modify frontend files.
- Use `babies.owner_user_id` for authorization.
- Use Korean calendar boundaries and UTC database timestamps.
- Return diary placeholders until issue #19 is implemented.
- Do not create a PR before user review.

---

### Task 1: Monthly Calendar API

**Files:**
- Create: `backend/app/api/endpoints/calendar.py`
- Create: `backend/app/repositories/calendar_repository.py`
- Create: `backend/app/services/calendar.py`
- Modify: `backend/app/api/router.py`
- Create: `backend/tests/test_calendar_api.py`

**Interfaces:**
- `GET /api/calendar?babyId=&year=&month=`
- `calendar_service.get_month(db, user, baby_id, year, month) -> dict`

- [ ] Write tests for an empty month, record-day aggregation, leap-year February, invalid month, authentication, and non-owner access.
- [ ] Run focused tests and verify they fail because the calendar route does not exist.
- [ ] Implement the monthly range query and response aggregation.
- [ ] Run focused and full backend tests.
- [ ] Commit and push with `feat: add monthly records calendar api`.

### Task 2: Daily Timeline API

**Files:**
- Modify: `backend/app/api/endpoints/calendar.py`
- Modify: `backend/app/repositories/calendar_repository.py`
- Modify: `backend/app/services/calendar.py`
- Modify: `backend/tests/test_calendar_api.py`

**Interfaces:**
- `GET /api/calendar/daily?babyId=&date=`
- `calendar_service.get_day(db, user, baby_id, target_date) -> dict`

- [ ] Write tests for time ordering, all record summaries, total sleep minutes, Korean midnight boundaries, empty dates, and authorization.
- [ ] Run focused tests and verify they fail because the daily route is absent.
- [ ] Implement the daily query, timeline summaries, and day summary.
- [ ] Run focused and full backend tests.
- [ ] Commit and push with `feat: add daily records timeline api`.

### Task 3: Documentation and Docker Verification

**Files:**
- Modify: `docs/api-spec.md`

- [ ] Update calendar response examples with `recordCount`, `recordCounts`, `hasDiary: false`, and `diary: null`.
- [ ] Rebuild the Docker backend against `halfstep_records_test_0715`.
- [ ] Create records spanning multiple dates and types.
- [ ] Verify monthly and daily API responses, owner access, non-owner `404`, and invalid input `422`.
- [ ] Run all backend tests, compile checks, and confirm no frontend files changed.
- [ ] Commit and push documentation or verification fixes.
