# Records Frontend Connection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the existing home quick-record controls to the four care-record creation APIs and show saved records for the selected date on the Records screen.

**Architecture:** A dependency-injected records client owns HTTP and authentication behavior, while a small singleton binds it to the Expo API base URL. Home and Records screens consume the singleton and retain their current visual structure. The selected baby comes from `EXPO_PUBLIC_DEMO_BABY_ID`, defaulting to `1`.

**Tech Stack:** Expo 54, React Native 0.81, TypeScript, Node 24 built-in test runner, FastAPI records API

## Global Constraints

- Preserve the existing diary and calendar behavior.
- Do not add a state-management or test-framework dependency.
- Every protected request sends `Authorization: Bearer {accessToken}`.
- Show loading, empty, error, and retry states for record lookup.
- Commit and push each independently verified deliverable to `feature/records`.

---

### Task 1: Records API Client

**Files:**
- Create: `frontend/src/features/records/types/records.ts`
- Create: `frontend/src/services/api/recordsClient.ts`
- Create: `frontend/src/services/api/recordsApi.ts`
- Create: `frontend/src/services/api/recordsClient.test.mjs`
- Modify: `frontend/src/config/env.ts`
- Modify: `frontend/.env.example`
- Modify: `frontend/package.json`

**Interfaces:**
- Produces: `createRecordsClient(baseUrl, fetchImpl)`, `recordsApi.list(accessToken, query)`, and `recordsApi.create(accessToken, type, body)`.
- Produces: `CareRecord`, `RecordType`, and the four creation body types.

- [ ] **Step 1: Write failing client tests**

Test list and create calls with a recording `fetchImpl`. Assert the encoded query, Bearer header, JSON body, response data, and rejected non-2xx response.

- [ ] **Step 2: Verify the tests fail**

Run: `npm.cmd run test:records`

Expected: FAIL because `recordsClient.ts` does not exist.

- [ ] **Step 3: Implement the typed client and environment binding**

Implement a client whose public shape is:

```ts
createRecordsClient(baseUrl, fetchImpl).list(accessToken, { babyId, date, type?, cursor?, limit? })
createRecordsClient(baseUrl, fetchImpl).create(accessToken, "FEEDING" | "SLEEP" | "URINE" | "STOOL", body)
```

Add `demoBabyId: Number(process.env.EXPO_PUBLIC_DEMO_BABY_ID ?? "1")` and document the environment variable.

- [ ] **Step 4: Verify tests and typecheck**

Run: `npm.cmd run test:records && npm.cmd run typecheck`

Expected: all records client tests PASS and TypeScript exits 0.

- [ ] **Step 5: Commit and push**

```bash
git commit -m "feat: add records frontend client"
git push origin feature/records
```

### Task 2: Home Quick Records

**Files:**
- Modify: `frontend/src/features/home/screens/HomeScreen.tsx`

**Interfaces:**
- Consumes: `recordsApi.create`, `env.demoBabyId`, and `useAuth().accessToken`.

- [ ] **Step 1: Add failing pure mapping tests**

Add request-mapping cases to `recordsClient.test.mjs` for formula amount, breast duration, sleep start/end, urine, and stool payloads through exported pure builders.

- [ ] **Step 2: Verify mapping tests fail**

Run: `npm.cmd run test:records`

Expected: FAIL because the quick-record payload builders are absent.

- [ ] **Step 3: Connect existing home controls**

Use the authenticated token for API calls. Validate a positive feeding number, store sleep only when it ends, and replace the single diaper action with a sheet offering `소변` and `대변`. Keep medicine local because it is outside the records API scope. Disable save actions while a request is pending and preserve inputs after failures.

- [ ] **Step 4: Verify tests and typecheck**

Run: `npm.cmd run test:records && npm.cmd run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git commit -m "feat: connect home quick records"
git push origin feature/records
```

### Task 3: Records Screen Requery

**Files:**
- Create: `frontend/src/features/records/utils/recordPresentation.ts`
- Modify: `frontend/src/features/records/screens/RecordsScreen.tsx`
- Modify: `frontend/src/services/api/recordsClient.test.mjs`

**Interfaces:**
- Consumes: `recordsApi.list`, `env.demoBabyId`, and `useAuth().accessToken`.
- Produces: `formatRecordDate(year, monthIndex, day)` and `describeRecord(record)`.

- [ ] **Step 1: Write failing presentation tests**

Test local `YYYY-MM-DD` formatting and Korean descriptions for the four record types.

- [ ] **Step 2: Verify presentation tests fail**

Run: `npm.cmd run test:records`

Expected: FAIL because `recordPresentation.ts` does not exist.

- [ ] **Step 3: Add selected-date requery UI**

Use the current year and month for the calendar, fetch records on screen focus and selected-date changes, and render a compact timeline below the calendar. Wrap the fixed content in a vertical `ScrollView` so the new section cannot overlap on short screens. Render progress text, an empty message, an error with `다시 시도`, and record rows with time/type/description.

- [ ] **Step 4: Verify tests and typecheck**

Run: `npm.cmd run test:records && npm.cmd run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git commit -m "feat: show saved records by date"
git push origin feature/records
```

### Task 4: Integrated Verification

**Files:**
- Modify only if verification reveals a scoped defect.

- [ ] **Step 1: Run frontend verification**

Run: `npm.cmd run test:records && npm.cmd run typecheck`

Expected: all tests pass and TypeScript exits 0.

- [ ] **Step 2: Run backend regression tests**

Run from `backend`: `python -m unittest discover -s tests -v`

Expected: all records API tests pass.

- [ ] **Step 3: Verify Docker API persistence**

Start the Docker backend with development OAuth enabled, obtain a token, create one quick record, then query the same baby and date. Expected: create returns `201` and the created ID is present in the list response.

- [ ] **Step 4: Inspect final scope and push**

Confirm `git diff develop...HEAD -- frontend` contains only the planned client, home, records, environment, and test changes. Do not create a PR or issue comment before user review.
