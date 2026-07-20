# PR Integration Design

## Goal

Integrate PRs #23 through #26 into `develop` in dependency order, then update PR #22 against the consolidated backend without duplicate models, migrations, or frontend implementations.

## Ownership

- PR #23 owns the shared `Baby` model, baby profile APIs, and the `babies` migration.
- PR #24 owns diary persistence and depends on PR #23.
- PR #25 owns care records and calendar APIs. It imports PR #23's `Baby` model and does not create `babies`.
- PR #26 owns community models and APIs.
- PR #22 owns the integrated frontend and AI generation backend.

## Integration Order

1. Verify and merge PR #23.
2. Update PR #24 with baby ownership enforcement, one-diary-per-day database enforcement, and API tests; then merge it.
3. Update PR #25 onto the new `develop`, remove duplicate baby and frontend ownership, connect calendar output to persisted diaries, verify, and merge it.
4. Update PR #26 onto the new `develop`, resolve shared router/model/config files, linearize migrations, verify, and merge it.
5. Update PR #22 onto the consolidated `develop`, retain its frontend screens, replace temporary stores with the merged APIs, and verify the complete application.

## Migration Policy

All unpublished feature migrations are rebased into one linear chain. A feature migration may only create tables owned by that feature. The final `alembic heads` command must return exactly one head, and `alembic upgrade head` must succeed on an empty MySQL database.

## Safety

- Diary creation validates that the authenticated user owns the requested baby before reading or writing a diary.
- The database enforces one diary per baby and date.
- Protected endpoints continue to return authorization-safe 404 responses for inaccessible resources.
- Every branch is tested before push and every PR is checked again before merge.
