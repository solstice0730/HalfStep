import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
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

test("enables iOS scene lifecycle for Xcode 27 builds", () => {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const appConfig = JSON.parse(readFileSync(resolve(projectRoot, "app.json"), "utf8"));
  const packageConfig = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf8"));
  const buildProperties = appConfig.expo.plugins.find(
    (plugin: unknown) => Array.isArray(plugin) && plugin[0] === "expo-build-properties"
  );

  assert.match(packageConfig.dependencies.expo, /^~57\.0\.(2[3-9]|[3-9]\d)$/);
  assert.equal(buildProperties?.[1]?.ios?.enableSceneSupport, true);
});

test("uses the branded icon and splash screen in standalone builds", () => {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const appConfig = JSON.parse(readFileSync(resolve(projectRoot, "app.json"), "utf8"));
  const splash = appConfig.expo.plugins.find(
    (plugin: unknown) => Array.isArray(plugin) && plugin[0] === "expo-splash-screen"
  );

  assert.equal(appConfig.expo.name, "반걸음");
  assert.equal(appConfig.expo.icon, "./assets/images/app-icon.png");
  assert.equal(appConfig.expo.ios.icon, appConfig.expo.icon);
  assert.equal(splash?.[1]?.image, appConfig.expo.icon);
  assert.equal(splash?.[1]?.backgroundColor, "#FFF8F3");
});

test("device QA bundle override does not replace the default app ID", () => {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const appConfig = JSON.parse(readFileSync(resolve(projectRoot, "app.json"), "utf8"));
  const configure = createRequire(import.meta.url)(resolve(projectRoot, "app.config.js"));
  const previous = process.env.HALFSTEP_IOS_BUNDLE_IDENTIFIER;
  try {
    delete process.env.HALFSTEP_IOS_BUNDLE_IDENTIFIER;
    assert.equal(configure({ config: appConfig.expo }).ios.bundleIdentifier, "com.solstice0730.halfstep");
    process.env.HALFSTEP_IOS_BUNDLE_IDENTIFIER = "com.josoogen.halfstep.deviceqa";
    assert.equal(configure({ config: appConfig.expo }).ios.bundleIdentifier, "com.josoogen.halfstep.deviceqa");
  } finally {
    if (previous === undefined) delete process.env.HALFSTEP_IOS_BUNDLE_IDENTIFIER;
    else process.env.HALFSTEP_IOS_BUNDLE_IDENTIFIER = previous;
  }
});
