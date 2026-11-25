/* global messenger, TagBadgeSettings */
async function applySettings() {
  const {settings} = await messenger.storage.local.get("settings");
  await messenger.tagBadges.configure(TagBadgeSettings.normalize(settings));
}
// Register before the initial read so changes during startup cannot be lost.
let updates = Promise.resolve();
function update() {
  updates = updates.then(applySettings).catch(error => console.error("Tag Badges:", error));
}
messenger.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.settings) update();
});
update();

messenger.runtime.onMessage.addListener(message => {
  if (message?.command === "listTags") return messenger.tagBadges.listTags();
});
