const crypto = require("node:crypto");

const API_PATH = "/v2/GetRealTimeDataBySN";
const CONTENT_TYPE = "application/json";

function buildSignedRequest({ apiId, apiSecret, deviceSn, deviceSnField = "deviceSn", now = new Date() }) {
  if (!apiId || !apiSecret || !deviceSn) {
    throw new Error("Dyness apiId, apiSecret, and deviceSn are required.");
  }

  if (deviceSnField !== "deviceSn" && deviceSnField !== "sn") {
    throw new Error('deviceSnField must be either "deviceSn" or "sn".');
  }

  const body = JSON.stringify({ [deviceSnField]: String(deviceSn) });
  const bodyBytes = Buffer.from(body, "utf8");
  const contentMd5 = crypto.createHash("md5").update(bodyBytes).digest("base64");
  const date = now.toUTCString();
  const stringToSign = ["POST", contentMd5, CONTENT_TYPE, date, API_PATH].join("\n");
  const signature = crypto
    .createHmac("sha1", Buffer.from(apiSecret, "utf8"))
    .update(Buffer.from(stringToSign, "utf8"))
    .digest("base64");

  return {
    body,
    headers: {
      Authorization: `API ${apiId}:${signature}`,
      "Content-MD5": contentMd5,
      "Content-Type": CONTENT_TYPE,
      Date: date
    }
  };
}

function getApiBaseUrl(apiBaseUrl) {
  const url = new URL(apiBaseUrl);
  if (url.protocol !== "https:") {
    throw new Error("Dyness API URL must use HTTPS.");
  }
  if (url.search || url.hash) {
    throw new Error("Dyness API base URL must not include a query or fragment.");
  }

  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}

function parseApiResponse(response) {
  if (!response || String(response.code) !== "200") {
    const error = new Error(response?.info || `Dyness API returned code ${response?.code ?? "unknown"}.`);
    error.code = response?.code;
    throw error;
  }
  if (!response.data || typeof response.data !== "object") {
    throw new Error("Dyness API response did not contain device data.");
  }
  return response.data;
}

module.exports = {
  API_PATH,
  buildSignedRequest,
  getApiBaseUrl,
  parseApiResponse
};