/* global messenger, TagBadgeSettings */
const form = document.getElementById("settings");
const status = document.getElementById("status");
function readForm() {
  return TagBadgeSettings.normalize(Object.fromEntries(Object.keys(TagBadgeSettings.defaults).map(key => {
    const field = document.getElementById(key);
    return [key, field.type === "checkbox" ? field.checked : field.type === "number" ? Number(field.value) : field.value];
  })));
}
function fill(settings) {
  for (const [key, value] of Object.entries(settings)) {
    const field = document.getElementById(key);
    if (field.type === "checkbox") field.checked = value;
    else field.value = value;
  }
  preview();
}
function preview() {
  const settings = readForm();
  document.getElementById("radius").disabled = settings.pill;
  document.getElementById("position").disabled = !settings.tableEnabled;
  const sample = document.getElementById("sample");
  sample.querySelectorAll(".sample-badge").forEach(node => node.remove());
  const subject = document.getElementById("sampleSubject");
  const fragment = document.createDocumentFragment();
  if (settings.tableEnabled) {
    const tags = [["Dôležité", "#d70022"], ["Práca", "#ffcc00"], ["Projekt", "#315cbd"]];
    for (const [name, color] of tags.slice(0, settings.maxTags || tags.length)) {
      const badge = document.createElement("span");
      badge.className = "sample-badge";
      badge.textContent = name;
      badge.style.background = color;
      badge.style.color = TagBadgeSettings.foreground(color);
      badge.style.borderRadius = settings.pill ? "999px" : `${settings.radius}px`;
      fragment.append(badge);
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
(async () => {
  try {
    const {settings} = await messenger.storage.local.get("settings");
    fill(TagBadgeSettings.normalize(settings));
  } catch (error) {status.textContent = `Načítanie zlyhalo: ${error.message}`;}
})();
