const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const { API_PATH, buildSignedRequest, getApiBaseUrl, parseApiResponse } = require("../lib/dyness-api");

test("builds Dyness headers from the exact UTF-8 request body and canonical string", () => {
  const now = new Date("2026-10-29T12:34:56.000Z");
  const request = buildSignedRequest({
    apiId: "example-id",
    apiSecret: "example-secret",
    deviceSn: "PBM-001",
    now
  });
  const expectedBody = '{"deviceSn":"PBM-001"}';
  const contentMd5 = crypto.createHash("md5").update(expectedBody, "utf8").digest("base64");
  const stringToSign = `POST\n${contentMd5}\napplication/json\n${now.toUTCString()}\n${API_PATH}`;
  const signature = crypto.createHmac("sha1", "example-secret").update(stringToSign, "utf8").digest("base64");

  assert.equal(request.body, expectedBody);
  assert.equal(request.headers["Content-MD5"], contentMd5);
  assert.equal(request.headers.Date, "Thu, 29 Oct 2026 12:34:56 GMT");
  assert.equal(request.headers.Authorization, `API example-id:${signature}`);
});

test("supports the alternate sn field documented in the Python example", () => {
  const request = buildSignedRequest({
    apiId: "id",
    apiSecret: "secret",
    deviceSn: "PBM-001",
    deviceSnField: "sn"
  });

  assert.equal(request.body, '{"sn":"PBM-001"}');
});

test("requires HTTPS for the configured API base URL", () => {
  assert.equal(
    getApiBaseUrl("https://global-openapi.dyness.com/openapi/ems-device/"),
    "https://global-openapi.dyness.com/openapi/ems-device"
  );
  assert.throws(() => getApiBaseUrl("http://example.test/api"), /must use HTTPS/);
});

test("accepts successful telemetry and reports API errors", () => {
  const data = { batteryInfo: { soc: "60" } };
  assert.equal(parseApiResponse({ code: "200", data }), data);
  assert.throws(() => parseApiResponse({ code: "401", info: "Waiting for Key Activation" }), /Waiting for Key Activation/);
});