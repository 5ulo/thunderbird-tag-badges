/* Test-only script appended to the options page in the isolated test XPI. */
(async () => {
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  try {
    for (let i = 0; i < 100 && (!document.getElementById('priority').options.length || !document.getElementById('tableMaxTags').value); i++) await pause(100);
    const locale = messenger.i18n.getMessage('locale');
    if (document.documentElement.lang !== locale) throw new Error('Document language does not match selected locale');
    if (document.querySelector('button[type="submit"]').textContent !== messenger.i18n.getMessage('save')) throw new Error('Save button was not localized');
    if (locale === 'en' && document.querySelector('button[type="submit"]').textContent !== 'Save settings') throw new Error('English Thunderbird did not show English settings');
    for (const node of document.querySelectorAll('[data-i18n]')) if (node.textContent !== messenger.i18n.getMessage(node.dataset.i18n)) throw new Error('Untranslated element: ' + node.dataset.i18n);
    const count = document.getElementById('priority').options.length;
    if (!count) throw new Error('Options did not load real tags: ' + document.getElementById('status').textContent);
    document.getElementById('tableMaxTags').value = '2';
    document.getElementById('cardMaxTags').value = '1';
    document.getElementById('size').value = 'normal';
    document.getElementById('order').value = 'priority';
    document.getElementById('priority').selectedIndex = 1;
    document.getElementById('priorityUp').click();
    const firstKey = document.getElementById('priority').options[0].value;
    document.getElementById('settings').requestSubmit();
    await pause(500);
    if (document.getElementById('status').textContent !== messenger.i18n.getMessage('saved')) throw new Error('Save status not localized');
    if (!messenger.i18n.getMessage('saveFailed', ['test-error']).includes('test-error')) throw new Error('Error substitutions failed');
    const {settings} = await messenger.storage.local.get('settings');
    if (settings?.tableMaxTags !== 2 || settings.cardMaxTags !== 1 || settings.size !== 'normal' || settings.priority[0] !== firstKey || settings.order !== 'priority') throw new Error('Options did not save new settings');
    await messenger.runtime.sendMessage({command:'smokeOptions', result:{ok:true,count,firstKey}});
  } catch (error) {
    await messenger.runtime.sendMessage({command:'smokeOptions', result:{ok:false,error:String(error)}});
  }
})();
