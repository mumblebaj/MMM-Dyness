Module.register("MMM-Dyness", {
  defaults: {
    title: "Dyness Powerbrick Max",
    apiBaseUrl: "https://global-openapi.dyness.com/openapi/ems-device",
    apiId: "",
    apiSecret: "",
    deviceSn: "",
    deviceSnField: "deviceSn",
    updateInterval: 60000,
    requestTimeout: 30000
  },

  start() {
    this.devices = null;
    this.error = null;
    this.updatedAt = null;
    this.getDynessData();
  },

  stop() {
    clearTimeout(this.updateTimer);
  },

  getStyles() {
    return ["MMM-Dyness.css"];
  },

  getDynessData() {
    this.sendSocketNotification("GET_DYNESS_DATA", this.config);
  },

  scheduleUpdate() {
    clearTimeout(this.updateTimer);
    const interval = Math.max(5000, Number(this.config.updateInterval) || 60000);
    this.updateTimer = setTimeout(() => this.getDynessData(), interval);
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "DYNESS_DATA") {
      this.devices = payload.devices;
      this.updatedAt = payload.updatedAt;
      this.error = null;
    } else if (notification === "DYNESS_ERROR") {
      this.error = payload.message;
    } else {
      return;
    }

    this.updateDom(200);
    this.scheduleUpdate();
  },

  getDom() {
    const wrapper = document.createElement("section");
    wrapper.className = "dyness-status";

    const heading = document.createElement("div");
    heading.className = "dyness-status-header";
    const deviceImage = document.createElement("img");
    deviceImage.className = "dyness-device-image";
    deviceImage.src = this.file("PowerBrickMaxWeb.png");
    deviceImage.alt = "Dyness PowerBrick Max battery";
    deviceImage.setAttribute("aria-hidden", "true");
    heading.appendChild(deviceImage);

    const title = document.createElement("div");
    title.className = "dyness-title";
    title.textContent = this.config.title;
    heading.appendChild(title);

    const status = document.createElement("p");
    status.className = this.error ? "dyness-status-message dyness-error" : "dyness-status-message";
    status.textContent = this.error || (this.devices ? "Connected" : "Connecting");
    heading.appendChild(status);
    wrapper.appendChild(heading);

    if (this.devices) {
      const multiple = this.devices.length > 1;
      this.devices.forEach((device, index) => {
        wrapper.appendChild(this.buildDevice(device, multiple ? device.name || `Battery ${index + 1}` : null));
      });

      const footer = document.createElement("div");
      footer.className = "dyness-updated";
      footer.textContent = this.updatedAt
        ? `Updated ${new Date(this.updatedAt).toLocaleTimeString()}`
        : "";
      wrapper.appendChild(footer);
    }

    return wrapper;
  },

  getChargeState(battery) {
    const current = Number(battery.batteryCurrent);
    const hasCurrent = battery.batteryCurrent !== undefined && battery.batteryCurrent !== "" && Number.isFinite(current);
    if (String(battery.batteryStatus) === "2" || (hasCurrent && current < 0)) {
      return { label: "Discharging", className: "dyness-discharging" };
    }
    if (hasCurrent && current > 0) {
      return { label: "Charging", className: "dyness-charging" };
    }
    return { label: "Idle", className: "dyness-idle" };
  },

  buildDevice(device, label) {
    const section = document.createElement("div");
    section.className = "dyness-device";

    if (device.error || !device.data) {
      const message = document.createElement("p");
      message.className = "dyness-status-message dyness-error";
      message.textContent = `${label ? `${label}: ` : ""}${device.error || "No data"}`;
      section.appendChild(message);
      return section;
    }

    const battery = device.data.batteryInfo || {};
    const state = this.getChargeState(battery);

    if (label) {
      const name = document.createElement("div");
      name.className = "dyness-device-name";
      name.textContent = label;
      section.appendChild(name);
    }

    const voltage = Number(battery.batteryVoltage);
    const current = Number(battery.batteryCurrent);
    const power = Number.isFinite(voltage) && Number.isFinite(current) && battery.batteryVoltage !== "" && battery.batteryCurrent !== ""
      ? Math.round(voltage * current)
      : undefined;
    const range = (min, max) => (min === undefined || max === undefined ? undefined : min === max ? `${min}` : `${min} - ${max}`);
    const metrics = [
      ["State", state.label, "", state.className],
      ["State of charge", battery.soc, "%"],
      ["State of health", battery.soh, "%"],
      ["Battery voltage", battery.batteryVoltage, "V"],
      ["Battery current", battery.batteryCurrent, "A", state.className],
      ["Battery power", power, "W", state.className],
      ["Cycle count", battery.cycleCount, ""],
      ["Cell voltage", range(battery.cellMinVoltage, battery.cellMaxVoltage), "V"],
      ["Cell temperature", range(battery.cellMinTemperature, battery.cellMaxTemperature), "\u00B0C"],
      ["BMS board temp", battery.bmsBoardTemp, "\u00B0C"],
      ["Max charge current", battery.maxChargeCurrent, "A"],
      ["Max discharge current", battery.maxDischargeCurrent, "A"]
    ];

    const readings = document.createElement("div");
    readings.className = "dyness-readings";
    for (const [labelText, value, unit, className] of metrics) {
      const item = document.createElement("div");
      item.className = "dyness-reading";
      const name = document.createElement("span");
      name.className = "dyness-reading-label";
      name.textContent = labelText;
      const reading = document.createElement("strong");
      reading.className = className ? `dyness-reading-value ${className}` : "dyness-reading-value";
      reading.textContent = value === undefined || value === null || value === ""
        ? "--"
        : `${value}${unit ? ` ${unit}` : ""}`;
      item.append(name, reading);
      readings.appendChild(item);
    }
    section.appendChild(readings);
    return section;
  }
});