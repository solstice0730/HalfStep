import assert from "node:assert/strict";
import test from "node:test";

import { demoApiUrlForHost, env, setDemoApiHost } from "./env";

test("accepts only private IPv4 hosts for the local demo server", () => {
  assert.equal(demoApiUrlForHost("172.20.10.2"), "http://172.20.10.2:8000/api");
  assert.equal(demoApiUrlForHost(" 192.168.166.66 "), "http://192.168.166.66:8000/api");
  assert.equal(demoApiUrlForHost("10.0.0.1"), "http://10.0.0.1:8000/api");
  for (const host of ["8.8.8.8", "example.com", "172.32.0.1", "192.168.1.999", "192.168.1.1/path", "127.0.0.1"]) {
    assert.equal(demoApiUrlForHost(host), null);
  }
});

test("a saved demo host takes effect without rebuilding", () => {
  assert.equal(setDemoApiHost("172.20.10.2"), true);
  assert.equal(env.apiBaseUrl, "http://172.20.10.2:8000/api");
  assert.equal(setDemoApiHost("8.8.8.8"), false);
  assert.equal(env.apiBaseUrl, "http://172.20.10.2:8000/api");
});
