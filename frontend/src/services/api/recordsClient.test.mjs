import assert from "node:assert/strict";
import test from "node:test";

import { createRecordsClient } from "./recordsClient.ts";

function recordingFetch(responseBody, status = 200) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(responseBody), {
      headers: { "Content-Type": "application/json" },
      status
    });
  };
  return { calls, fetchImpl };
}

test("list sends filters and bearer authentication", async () => {
  const fake = recordingFetch({ success: true, data: [{ id: "7", type: "URINE" }], meta: { cursor: null, hasNext: false } });
  const client = createRecordsClient("http://localhost:8000/api", fake.fetchImpl);

  const result = await client.list("token-1", { babyId: 1, date: "2026-07-15", type: "URINE", limit: 20 });

  assert.equal(fake.calls[0].url, "http://localhost:8000/api/records?babyId=1&date=2026-07-15&type=URINE&limit=20");
  assert.equal(fake.calls[0].init.headers.Authorization, "Bearer token-1");
  assert.equal(result.records[0].id, "7");
  assert.equal(result.hasNext, false);
});

test("create sends the record body to its type endpoint", async () => {
  const created = { id: "8", type: "FEEDING", occurredAt: "2026-07-15T09:00:00" };
  const fake = recordingFetch({ success: true, data: created }, 201);
  const client = createRecordsClient("http://localhost:8000/api/", fake.fetchImpl);
  const body = { babyId: 1, occurredAt: "2026-07-15T09:00:00", feedingType: "FORMULA", amountMl: 120 };

  const result = await client.create("token-2", "FEEDING", body);

  assert.equal(fake.calls[0].url, "http://localhost:8000/api/records/feeding");
  assert.equal(fake.calls[0].init.method, "POST");
  assert.equal(fake.calls[0].init.headers.Authorization, "Bearer token-2");
  assert.deepEqual(JSON.parse(fake.calls[0].init.body), body);
  assert.deepEqual(result, created);
});

test("request rejects an expired session", async () => {
  const fake = recordingFetch({ detail: "Invalid token" }, 401);
  const client = createRecordsClient("http://localhost:8000/api", fake.fetchImpl);

  await assert.rejects(
    client.list("expired", { babyId: 1, date: "2026-07-15" }),
    /로그인이 만료되었습니다/
  );
});
