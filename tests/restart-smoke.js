/* Independent controller for two starts of the same profile with a production XPI. */
var restartProbe = class extends ExtensionAPI {
  getAPI() { return {restartProbe: {run: async () => {
    const {MailServices} = ChromeUtils.importESModule('resource:///modules/MailServices.sys.mjs');
    const {AddonManager} = ChromeUtils.importESModule('resource://gre/modules/AddonManager.sys.mjs');
    const win = Services.wm.getMostRecentWindow('mail:3pane');
    const pause = ms => new Promise(resolve => win.setTimeout(resolve, ms));
    const results = [];
    const check = (ok, label) => { results.push({label,ok}); };
    try {
      await pause(2500);
      const pane = win.document.getElementById('tabmail').currentAbout3Pane;
      const addon = await AddonManager.getAddonByID('tag-badges-thread-pane@local.invalid');
      check(addon?.isActive, 'production add-on enabled');
      let first = false;
      try {MailServices.accounts.localFoldersServer;} catch (_) { MailServices.accounts.createLocalMailAccount(); }
      const root = MailServices.accounts.localFoldersServer.rootFolder;
      if (!root.containsChildNamed('RestartTest')) {
        first = true;
        root.createSubfolder('RestartTest', null); await pause(500);
        const folder = root.getChildNamed('RestartTest');
        folder.QueryInterface(Ci.nsIMsgLocalMailFolder).addMessage('From - Wed Nov 25 12:00:00 2026\r\nFrom: test@example.invalid\r\nSubject: Restart test\r\nMessage-ID: <restart@example.invalid>\r\nDate: Wed, 25 Nov 2026 12:00:00 +0100\r\n\r\nTest.\r\n');
        [...folder.messages][0].setStringProperty('keywords', '$label1 $label2');
      }
      if (!first) {
        check(pane.document.getElementById('threadTree').classList.contains('tb-no-tag-colors'), 'integration attached on subsequent startup before folder interaction');
      }
      pane.displayFolder(root.getChildNamed('RestartTest').URI);
      Services.prefs.setIntPref('mail.threadpane.listview', 0); pane.threadPane.updateThreadView('cards'); await pause(1800);
      let row = pane.document.querySelector('#threadTree tr[is="thread-card"]');
      check(!!row?.querySelector('.tb-tag-badges'), 'badges present on ' + (first ? 'first' : 'subsequent') + ' startup');
      check(pane.document.getElementById('threadTree').classList.contains('tb-no-tag-colors'), 'row color preference active after startup');
      if (row?.querySelector('.tb-tag-badges')) {
        const info = row.querySelector('.thread-card-icon-info').getBoundingClientRect();
        const star = row.querySelector('.button-star').getBoundingClientRect();
        const group = row.querySelector('.tb-tag-badges').getBoundingClientRect();
        check(Math.abs(star.right-info.right) <= 2, 'star anchored at right edge of card icon area');
        check(star.left-group.right >= -1 && star.left-group.right <= 14, 'badges directly beside star on right');
        results.push({geometry:{info:{left:info.left,right:info.right},star:{left:star.left,right:star.right},group:{left:group.left,right:group.right}}});
      }
      const errors = Services.console.getMessageArray().filter(m => /Tag Badges|tag-badges|window listener/i.test(m.message)).map(m => m.message);
      await IOUtils.writeUTF8(REPORT_PATH, JSON.stringify({ok:results.filter(r => 'ok' in r).every(r => r.ok),first,results,errors}));
    } catch (error) { await IOUtils.writeUTF8(REPORT_PATH, JSON.stringify({ok:false,results,error:String(error),stack:error.stack})); }
    win.setTimeout(() => Services.startup.quit(Ci.nsIAppStartup.eAttemptQuit), 100);
  }}}; }
};
