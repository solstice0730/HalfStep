import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

test("builds a static iOS Simulator app for Appetize with preview variables", () => {
  const configPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../eas.json"
  );
  const easConfig = JSON.parse(
    readFileSync(configPath, "utf8")
  );

  assert.deepEqual(easConfig.build["appetize-sim"], {
    environment: "preview",
    distribution: "internal",
    ios: {
      simulator: true
    }
  });
});
