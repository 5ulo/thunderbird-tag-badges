/* Test-only script appended to the options page in the isolated test XPI. */
(async () => {
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  try {
    for (let i = 0; i < 100 && (!document.getElementById('priority').options.length || !document.getElementById('tableMaxTags').value); i++) await pause(100);
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
    const {settings} = await messenger.storage.local.get('settings');
    if (settings?.tableMaxTags !== 2 || settings.cardMaxTags !== 1 || settings.size !== 'normal' || settings.priority[0] !== firstKey || settings.order !== 'priority') throw new Error('Options did not save new settings');
    await messenger.runtime.sendMessage({command:'smokeOptions', result:{ok:true,count,firstKey}});
  } catch (error) {
    await messenger.runtime.sendMessage({command:'smokeOptions', result:{ok:false,error:String(error)}});
  }
})();
