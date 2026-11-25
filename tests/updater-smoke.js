/* Independent controller: tests the actual, uninstrumented XPI and native updater. */
var updaterProbe = class extends ExtensionAPI {
  getAPI() { return {updaterProbe: {run: async () => {
    const {MailServices} = ChromeUtils.importESModule('resource:///modules/MailServices.sys.mjs');
    const {AddonManager} = ChromeUtils.importESModule('resource://gre/modules/AddonManager.sys.mjs');
    const {ExtensionStorageIDB} = ChromeUtils.importESModule('resource://gre/modules/ExtensionStorageIDB.sys.mjs');
    const {ExtensionParent} = ChromeUtils.importESModule('resource://gre/modules/ExtensionParent.sys.mjs');
    const win = Services.wm.getMostRecentWindow('mail:3pane');
    const pause = ms => new Promise(resolve => win.setTimeout(resolve, ms));
    const id = ADDON_ID;
    const results = [];
    const check = (ok, label) => { if (!ok) throw new Error(label); results.push(label); };
    const storage = async () => {
      let extension;
      for (let i = 0; i < 100; i++) {
        extension = ExtensionParent.GlobalManager.getExtension(id);
        if (extension) break;
        await pause(100);
      }
      if (!extension) throw new Error('Target extension did not finish starting');
      await ExtensionStorageIDB.selectBackend({extension});
      return ExtensionStorageIDB.open(ExtensionStorageIDB.getStoragePrincipal(extension));
    };
    try {
      await pause(1800);
      let addon = await AddonManager.getAddonByID(id);
      if (await IOUtils.exists(MARKER_PATH)) {
        const saved = JSON.parse(await IOUtils.readUTF8(MARKER_PATH));
        check(addon?.isActive && addon.version === EXPECTED_VERSION, 'updated add-on active after full application restart');
        const db = await storage();
        const {settings} = await db.get('settings'); db.close();
        check(JSON.stringify(settings) === JSON.stringify(saved), 'updated preferences preserved after full application restart');
        const pane = win.document.getElementById('tabmail').currentAbout3Pane;
        check(pane.document.getElementById('threadTree').classList.contains('tb-no-tag-colors'), 'updated integration attached on restart before folder interaction');
        pane.displayFolder(MailServices.accounts.localFoldersServer.rootFolder.getChildNamed('UpdateTest').URI);
        pane.threadPane.updateThreadView('cards'); await pause(1600);
        const row = pane.document.querySelector('#threadTree tr[is="thread-card"]');
        check(!!row?.querySelector('.tb-tag-badges'), 'badges present after update and full application restart');
        const info = row.querySelector('.thread-card-icon-info').getBoundingClientRect();
        const star = row.querySelector('.button-star').getBoundingClientRect();
        const group = row.querySelector('.tb-tag-badges').getBoundingClientRect();
        check(Math.abs(star.right-info.right) <= 2 && star.left-group.right >= -1 && star.left-group.right <= 14, 'updated card star and badges remain right aligned after restart');
        await IOUtils.writeUTF8(REPORT_PATH, JSON.stringify({ok:true,results}));
        win.setTimeout(() => Services.startup.quit(Ci.nsIAppStartup.eAttemptQuit), 100);
        return;
      }
      check(addon?.version === '0.0.0', 'isolated bootstrap version installed');
      const saved = {tableEnabled:true, cardEnabled:true, tableMaxTags:1, cardMaxTags:2, position:'after', size:'normal', order:'alphabetical', priority:[], pill:false, radius:7, nativeRowColors:false, debug:false};
      const initialStorage = await storage();
      const changes = await initialStorage.set({settings:saved});
      ExtensionStorageIDB.notifyListeners(id, changes);
      initialStorage.close();
      try { MailServices.accounts.localFoldersServer; } catch (_) { MailServices.accounts.createLocalMailAccount(); }
      const root = MailServices.accounts.localFoldersServer.rootFolder;
      root.createSubfolder('UpdateTest', null); await pause(500);
      const folder = root.getChildNamed('UpdateTest');
      folder.QueryInterface(Ci.nsIMsgLocalMailFolder).addMessage('From - Wed Nov 25 12:00:00 2026\r\nFrom: test@example.invalid\r\nSubject: Native update test\r\nMessage-ID: <native-update@example.invalid>\r\nDate: Wed, 25 Nov 2026 12:00:00 +0100\r\n\r\nTest.\r\n');
      [...folder.messages][0].setStringProperty('keywords', '$label1 $label2');
      const pane = win.document.getElementById('tabmail').currentAbout3Pane;
      pane.displayFolder(folder.URI); pane.threadPane.updateThreadView('table');
      await pause(1600);
      const install = await new Promise((resolve, reject) => addon.findUpdates({
        onUpdateAvailable: (_, update) => resolve(update),
        onNoUpdateAvailable: () => reject(new Error('No update found through GitHub update_url')),
        onUpdateFinished: (_, error) => { if (error) reject(new Error('Update check failed: ' + error)); },
      }, AddonManager.UPDATE_WHEN_USER_REQUESTED));
      check(install.version === EXPECTED_VERSION, 'native updater finds published GitHub version (received ' + install.version + ')');
      check(install.sourceURI.spec.startsWith('https://github.com/5ulo/thunderbird-tag-badges/releases/download/'), 'updater uses versioned GitHub XPI asset');
      await install.install(); await pause(2000);
      addon = await AddonManager.getAddonByID(id);
      check(addon?.isActive && addon.version === EXPECTED_VERSION, 'native updater downloads verifies and installs XPI');
      const updatedStorage = await storage();
      const {settings} = await updatedStorage.get('settings');
      updatedStorage.close();
      check(JSON.stringify(settings) === JSON.stringify(saved), 'all saved preferences survive native update');
      const row = pane.document.querySelector('#threadTree tr[is="thread-row"]');
      check(!!row?.querySelector('.tb-tag-badges'), 'badges reconnect to existing message pane after update');
      check(pane.document.getElementById('threadTree').classList.contains('tb-no-tag-colors'), 'row color preference applies after update');
      check(typeof addon.getFullDescription === 'function', 'full description available after native update');
      await IOUtils.writeUTF8(MARKER_PATH, JSON.stringify(saved));
      await IOUtils.writeUTF8(REPORT_PATH, JSON.stringify({ok:true,results}));
    } catch (error) {
      await IOUtils.writeUTF8(REPORT_PATH, JSON.stringify({ok:false,results,error:String(error),stack:error.stack}));
    }
    win.setTimeout(() => Services.startup.quit(Ci.nsIAppStartup.eAttemptQuit), 100);
  }}}; }
};
