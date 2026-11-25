/* Shared by the background page, options page and Experiment sandbox. */
(function (root) {
  const defaults = Object.freeze({tableEnabled: true, cardEnabled: true,
    position: "before", maxTags: 0, pill: true, radius: 4,
    nativeRowColors: false, debug: false});
  function normalize(input = {}) {
    if (!input || typeof input !== "object") input = {};
    const result = {...defaults};
    for (const key of ["tableEnabled", "cardEnabled", "pill", "nativeRowColors", "debug"]) {
      if (typeof input[key] === "boolean") result[key] = input[key];
    }
    if (["before", "after"].includes(input.position)) result.position = input.position;
    for (const [key, max] of [["maxTags", 1000], ["radius", 100]]) {
      const value = input[key];
      if (typeof value === "number" && Number.isFinite(value)) result[key] = Math.min(max, Math.max(0, Math.floor(value)));
    }
    return result;
  }
  function foreground(color) {
    const rgb = /^#([0-9a-f]{6})$/i.exec(color);
    if (!rgb) return "#ffffff";
    const values = rgb[1].match(/../g).map(v => parseInt(v, 16) / 255)
      .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    const luminance = values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
    return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? "#000000" : "#ffffff";
  }
  root.TagBadgeSettings = {defaults, normalize, foreground};
})(this);
