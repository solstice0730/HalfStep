import assert from "node:assert/strict";
import test from "node:test";

import { ageGroupForMonths } from "./community";

test("아기 개월 수를 커뮤니티 월령 그룹으로 매핑한다", () => {
  assert.equal(ageGroupForMonths(0), "M0_2");
  assert.equal(ageGroupForMonths(3), "M3_5");
  assert.equal(ageGroupForMonths(5), "M3_5");
  assert.equal(ageGroupForMonths(8), "M6_8");
  assert.equal(ageGroupForMonths(11), "M9_11");
  assert.equal(ageGroupForMonths(17), "M12_17");
  assert.equal(ageGroupForMonths(24), "M18_24");
  assert.equal(ageGroupForMonths(25), null);
  assert.equal(ageGroupForMonths(-1), null);
});
