import assert from "node:assert/strict";
import test from "node:test";

import { toLocalIsoDate } from "./date";

test("로컬 날짜를 YYYY-MM-DD로 만든다 (UTC로 넘어가지 않음)", () => {
  // 로컬 자정 직후: toISOString()은 UTC+9 환경에서 전날을 돌려주지만 toLocalIsoDate는 당일이어야 한다.
  const justAfterMidnight = new Date(2026, 9, 1, 0, 30);
  assert.equal(toLocalIsoDate(justAfterMidnight), "2026-10-01");
  assert.equal(toLocalIsoDate(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
});
