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
    this.data = null;
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
      this.data = payload.data;
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

    const heading = document.createElement("header");
    heading.className = "dyness-status-header";
    const deviceImage = document.createElement("img");
    deviceImage.className = "dyness-device-image";
    deviceImage.src = this.file("PowerBrickMaxWeb.png");
    deviceImage.alt = "Dyness PowerBrick Max battery";
    deviceImage.setAttribute("aria-hidden", "true");
    heading.appendChild(deviceImage);

    const title = document.createElement("h2");
    title.textContent = this.config.title;
    heading.appendChild(title);

    const status = document.createElement("p");
    status.className = this.error ? "dyness-status-message dyness-error" : "dyness-status-message";
    status.textContent = this.error || (this.data ? "Connected" : "Connecting");
    heading.appendChild(status);
    wrapper.appendChild(heading);

    if (this.data) {
      const battery = this.data.batteryInfo || {};
      const pv = this.data.pvInfo || {};
      const grid = this.data.gridInfo || {};
      const load = this.data.loadInfo || {};
      const metrics = [
        ["State of charge", battery.soc, "%"],
        ["State of health", battery.soh, "%"],
        ["Battery power", battery.batteryPower, "W"],
        ["Battery voltage", battery.batteryVoltage, "V"],
        ["Battery current", battery.batteryCurrent, "A"],
        ["Battery temperature", battery.batteryTemperature, "°C"],
        ["PV power", pv.pvTotalPower, "W"],
        ["Grid power", grid.activePower, "W"],
        ["Load power", load.loadTotalPower, "W"],
        ["BMS status", battery.bmsCommunicationStatus, ""]
      ];

      const readings = document.createElement("div");
      readings.className = "dyness-readings";
      for (const [label, value, unit] of metrics) {
        const item = document.createElement("div");
        item.className = "dyness-reading";
        const name = document.createElement("span");
        name.className = "dyness-reading-label";
        name.textContent = label;
        const reading = document.createElement("strong");
        reading.className = "dyness-reading-value";
        reading.textContent = value === undefined || value === null || value === ""
          ? "--"
          : `${value}${unit ? ` ${unit}` : ""}`;
        item.append(name, reading);
        readings.appendChild(item);
      }
      wrapper.appendChild(readings);

      const footer = document.createElement("footer");
      footer.className = "dyness-updated";
      footer.textContent = this.updatedAt
        ? `Updated ${new Date(this.updatedAt).toLocaleTimeString()}`
        : "";
      wrapper.appendChild(footer);
    }

    return wrapper;
  }
});