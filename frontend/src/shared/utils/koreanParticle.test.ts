import assert from "node:assert/strict";
import test from "node:test";

import { withWaGwa } from "./koreanParticle";

test("받침 유무에 따라 과/와를 붙인다", () => {
  assert.equal(withWaGwa("리온"), "리온과");
  assert.equal(withWaGwa("하루"), "하루와");
});

test("비한글 이름과 빈 문자열을 안전하게 처리한다", () => {
  assert.equal(withWaGwa("Rio"), "Rio와");
  assert.equal(withWaGwa("  "), "");
});
