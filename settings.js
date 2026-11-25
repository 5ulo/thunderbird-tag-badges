/* Shared by the background page, options page and Experiment sandbox. */
(function (root) {
  const defaults = Object.freeze({tableEnabled: true, cardEnabled: true,
    position: "before", tableMaxTags: 0, cardMaxTags: 0, size: "compact", order: "thunderbird", priority: [], pill: true, radius: 4,
    nativeRowColors: false, debug: false});
  function normalize(input = {}) {
    if (!input || typeof input !== "object") input = {};
    const result = {...defaults, priority: []};
    for (const key of ["tableEnabled", "cardEnabled", "pill", "nativeRowColors", "debug"]) {
      if (typeof input[key] === "boolean") result[key] = input[key];
    }
    if (["before", "after"].includes(input.position)) result.position = input.position;
    for (const [key, max] of [["tableMaxTags", 1000], ["cardMaxTags", 1000], ["radius", 100]]) {
      const value = input[key];
      if (typeof value === "number" && Number.isFinite(value)) result[key] = Math.min(max, Math.max(0, Math.floor(value)));
    }
    // Migrate the original shared limit without overwriting explicit per-view limits.
    for (const key of ["tableMaxTags", "cardMaxTags"]) {
      if (input[key] === undefined && typeof input.maxTags === "number" && Number.isFinite(input.maxTags)) {
        result[key] = Math.min(1000, Math.max(0, Math.floor(input.maxTags)));
      }
    }
    if (["compact", "normal"].includes(input.size)) result.size = input.size;
    if (["thunderbird", "alphabetical", "priority"].includes(input.order)) result.order = input.order;
    if (Array.isArray(input.priority)) result.priority = [...new Set(input.priority.filter(key => typeof key === "string"))];
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
  function sortTags(tags, settings) {
    const result = [...tags];
    if (settings.order === "alphabetical") result.sort((a, b) => a.tag.localeCompare(b.tag));
    if (settings.order === "priority") {
      const ranks = new Map(settings.priority.map((key, i) => [key, i]));
      result.sort((a, b) => (ranks.get(a.key) ?? Infinity) - (ranks.get(b.key) ?? Infinity));
    }
    return result;
  }
  root.TagBadgeSettings = {defaults, normalize, foreground, sortTags};
})(this);
