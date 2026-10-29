# MMM-Dyness

A MagicMirror module that displays live Dyness battery and inverter telemetry using the Dyness OpenAPI `GetRealTimeDataBySN` endpoint. It performs read-only requests and has no third-party npm dependencies.

## Install

Place this folder in your MagicMirror `modules` directory. No `npm install` is required. Add the module to `config/config.js`:

```js
{
  module: "MMM-Dyness",
  position: "top_right",
  config: {
    apiBaseUrl: "https://global-openapi.dyness.com/openapi/ems-device",
    apiId: "YOUR_DYNESS_API_ID",
    apiSecret: "YOUR_DYNESS_API_SECRET",
    deviceSn: "YOUR_DEVICE_SERIAL_NUMBER",
    updateInterval: 60000
  }
}
```

Obtain API credentials through Dyness partner registration and authorization. Select the API base URL for the region where the device is registered; cross-region requests are not supported. The protocol lists these regional hosts:

| Region | Host |
| --- | --- |
| Europe | `https://eu-openapi.dyness.com/openapi/ems-device` |
| North America | `https://na-openapi.dyness.com/openapi/ems-device` |
| Latin America | `https://latam-openapi.dyness.com/openapi/ems-device` |
| Middle East | `https://me-openapi.dyness.com/openapi/ems-device` |
| Africa | `https://af-openapi.dyness.com/openapi/ems-device` |
| South America | `https://sa-openapi.dyness.com/openapi/ems-device` |
| Global site | `https://global-openapi.dyness.com/openapi/ems-device` |
| China | `https://openapi.dyness.com.cn/openapi/ems-device` |
| Asia-Pacific | `https://apacopen-api.dyness.com/openapi/ems-device` |

The protocol's endpoint schema names the serial-number field `deviceSn`, while its Python signing sample uses `sn`. This module defaults to `deviceSn`; set `deviceSnField: "sn"` in the config if your API account expects the sample's field name.

## Display and polling

The module shows battery SOC/SOH, power, voltage, current, temperature, PV, grid, load, and BMS communication status. `updateInterval` is in milliseconds and defaults to 60 seconds; the module enforces a minimum of five seconds to remain below Dyness's two-requests-per-second limit. Battery power and status are displayed as returned by the API without assuming sign or enum meanings.

## Authentication notes

Each POST includes the Dyness `Authorization`, `Content-MD5`, `Content-Type`, and `Date` headers. The signature is Base64 HMAC-SHA1 over:

```text
POST\n{Content-MD5}\napplication/json\n{Date}\n/v2/GetRealTimeDataBySN
```

The body MD5 and HMAC inputs use UTF-8 bytes, matching the protocol's Python authentication example. The protocol overview separately labels the character encoding UTF-7; if Dyness issues an account-specific requirement that differs from its example, the signing/body encoding will need to match it exactly. API IDs and secrets are kept in the MagicMirror config and are never logged by this module.

## Tests

Run the API signing and response parsing tests with Node.js 18 or later:

```sh
npm test
```