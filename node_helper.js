const https = require("https");
const NodeHelper = require("node_helper");
const { API_PATH, buildSignedRequest, getApiBaseUrl, parseApiResponse } = require("./lib/dyness-api");

module.exports = NodeHelper.create({
  start() {
    this.requestPending = false;
    console.log(`Starting node helper for ${this.name}`);
  },

  postJson(url, headers, body, timeout) {
    return new Promise((resolve, reject) => {
      const request = https.request(
        url,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Length": Buffer.byteLength(body, "utf8")
          }
        },
        (response) => {
          const chunks = [];
          let responseBytes = 0;
          response.on("data", (chunk) => {
            responseBytes += chunk.length;
            if (responseBytes > 1024 * 1024) {
              request.destroy(new Error("Dyness API response exceeded 1 MB."));
              return;
            }
            chunks.push(chunk);
          });
          response.on("end", () => {
            const responseText = Buffer.concat(chunks).toString("utf8");
            let result;
            try {
              result = JSON.parse(responseText);
            } catch {
              reject(new Error(`Dyness API returned invalid JSON (HTTP ${response.statusCode}).`));
              return;
            }
            if (response.statusCode < 200 || response.statusCode >= 300) {
              reject(new Error(result.info || `Dyness API returned HTTP ${response.statusCode}.`));
              return;
            }
            resolve(result);
          });
        }
      );
      request.setTimeout(timeout, () => request.destroy(new Error("Dyness API request timed out.")));
      request.on("error", reject);
      request.end(body);
    });
  },

  socketNotificationReceived(notification, config) {
    if (notification === "GET_DYNESS_DATA") {
      this.getDynessData(config);
    }
  },

  async getDynessData(config) {
    if (this.requestPending) {
      return;
    }
    this.requestPending = true;

    try {
      const baseUrl = getApiBaseUrl(config.apiBaseUrl);
      const timeout = Number(config.requestTimeout) > 0 ? Number(config.requestTimeout) : 30000;
      const configured = Array.isArray(config.deviceSn) ? config.deviceSn : [config.deviceSn];
      const devices = configured
        .map((entry) => (entry && typeof entry === "object" ? entry : { sn: entry }))
        .filter((entry) => entry.sn);
      if (devices.length === 0) {
        throw new Error("Dyness apiId, apiSecret, and deviceSn are required.");
      }

      const results = [];
      for (const device of devices) {
        const sn = String(device.sn);
        try {
          const request = buildSignedRequest({ ...config, deviceSn: sn });
          const response = await this.postJson(`${baseUrl}${API_PATH}`, request.headers, request.body, timeout);
          results.push({ sn, name: device.name, data: parseApiResponse(response) });
        } catch (deviceError) {
          results.push({ sn, name: device.name, error: deviceError.message || "Unable to read device data." });
        }
      }

      this.sendSocketNotification("DYNESS_DATA", {
        devices: results,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      this.sendSocketNotification("DYNESS_ERROR", {
        message: error.message || "Unable to read Dyness battery data."
      });
    } finally {
      this.requestPending = false;
    }
  }
});