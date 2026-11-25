/* global messenger, TagBadgeSettings */
const form = document.getElementById("settings");
const status = document.getElementById("status");
let availableTags = [];
function readForm() {
  return TagBadgeSettings.normalize(Object.fromEntries(Object.keys(TagBadgeSettings.defaults).map(key => {
    const field = document.getElementById(key);
    if (key === "priority") return [key, [...field.options].map(option => option.value)];
    return [key, field.type === "checkbox" ? field.checked : field.type === "number" ? Number(field.value) : field.value];
  })));
}
function fill(settings) {
  for (const [key, value] of Object.entries(settings)) {
    const field = document.getElementById(key);
    if (key === "priority") {
      const ranks = new Map(value.map((key, i) => [key, i]));
      const rank = key => ranks.get(key) ?? (value.length + availableTags.findIndex(tag => tag.key === key));
      const sorted = [...field.options].sort((a,b) => rank(a.value) - rank(b.value));
      field.replaceChildren(...sorted);
    } else if (field.type === "checkbox") field.checked = value;
    else field.value = value;
  }
  preview();
}
function preview() {
  const settings = readForm();
  document.getElementById("radius").disabled = settings.pill;
  document.getElementById("position").disabled = !settings.tableEnabled;
  document.getElementById("priorityPanel").hidden = settings.order !== "priority";
  const sample = document.getElementById("sample");
  sample.querySelectorAll(".sample-badge").forEach(node => node.remove());
  const subject = document.getElementById("sampleSubject");
  const fragment = document.createDocumentFragment();
  if (settings.tableEnabled) {
    const tags = TagBadgeSettings.sortTags([
      {key: "$label1", tag: "Dôležité", color: "#d70022"},
      {key: "$label2", tag: "Práca", color: "#ffcc00"},
      {key: "project", tag: "Projekt", color: "#315cbd"}], settings);
    const shown = tags.slice(0, settings.tableMaxTags || tags.length);
    for (const {tag: name, color} of shown) {
      const badge = document.createElement("span");
      badge.className = "sample-badge";
      badge.textContent = name;
      badge.style.fontSize = settings.size === "normal" ? "15px" : "13px";
      badge.style.padding = settings.size === "normal" ? "2px 8px" : "1px 6px";
      badge.style.background = color;
      badge.style.color = TagBadgeSettings.foreground(color);
      badge.style.borderRadius = settings.pill ? "999px" : `${settings.radius}px`;
      fragment.append(badge);
    }
    if (shown.length < tags.length) {
      const more = document.createElement("span");
      more.className = "sample-badge";
      more.textContent = `+${tags.length - shown.length}`;
      fragment.append(more);
    }
  }
  if (settings.position === "before") subject.before(fragment);
  else subject.after(fragment);
}
form.addEventListener("input", () => {status.textContent = "Neuložené zmeny"; preview();});
form.addEventListener("submit", async event => {
  event.preventDefault();
  try {
    await messenger.storage.local.set({settings: readForm()});
    status.textContent = "Nastavenia uložené.";
  } catch (error) {status.textContent = `Uloženie zlyhalo: ${error.message}`;}
});
document.getElementById("reset").addEventListener("click", () => {
  fill(TagBadgeSettings.defaults);
  status.textContent = "Predvolené hodnoty pripravené. Uložte nastavenia.";
});
for (const [id, delta] of [["priorityUp", -1], ["priorityDown", 1]]) {
  document.getElementById(id).addEventListener("click", () => {
    const list = document.getElementById("priority");
    const index = list.selectedIndex;
    const target = index + delta;
    if (index < 0 || target < 0 || target >= list.options.length) return;
    const options = [...list.options];
    [options[index], options[target]] = [options[target], options[index]];
    list.replaceChildren(...options);
    list.selectedIndex = target;
    status.textContent = "Neuložené zmeny";
    preview();
  });
}
(async () => {
  try {
    const tags = await messenger.runtime.sendMessage({command: "listTags"});
    availableTags = tags;
    for (const tag of tags) {
      const option = document.createElement("option");
      option.value = tag.key;
      option.textContent = tag.tag;
      document.getElementById("priority").append(option);
    }
    const {settings} = await messenger.storage.local.get("settings");
    fill(TagBadgeSettings.normalize(settings));
  } catch (error) {status.textContent = `Načítanie zlyhalo: ${error.message}`;}
})();
