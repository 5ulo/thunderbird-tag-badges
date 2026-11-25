/* global messenger */
// Thunderbird selects _locales using its UI language, with English as fallback.
document.documentElement.lang = messenger.i18n.getMessage("locale");
document.documentElement.dir = messenger.i18n.getMessage("@@bidi_dir") || "ltr";
for (const element of document.querySelectorAll("[data-i18n]")) {
  element.textContent = messenger.i18n.getMessage(element.dataset.i18n);
}
for (const element of document.querySelectorAll("[data-i18n-aria-label]")) {
  element.setAttribute("aria-label", messenger.i18n.getMessage(element.dataset.i18nAriaLabel));
}
