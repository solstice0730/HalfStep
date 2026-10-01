import assert from "node:assert/strict";
import test from "node:test";

import { withEge, withI, withUi, withWaGwa } from "./koreanParticle";

test("받침 유무에 따라 과/와를 붙인다", () => {
  assert.equal(withWaGwa("리온"), "리온과");
  assert.equal(withWaGwa("하루"), "하루와");
});

test("비한글 이름과 빈 문자열을 안전하게 처리한다", () => {
  assert.equal(withWaGwa("Rio"), "Rio와");
  assert.equal(withWaGwa("  "), "");
});

test("받침 있는 이름에만 호칭 '이'를 붙인다", () => {
  assert.equal(withI("하린"), "하린이");
  assert.equal(withI("하루"), "하루");
  assert.equal(withEge("하린"), "하린이에게");
  assert.equal(withEge("수아"), "수아에게");
  assert.equal(withUi("하린"), "하린이의");
  assert.equal(withUi("Rio"), "Rio의");
  assert.equal(withEge(""), "");
});
