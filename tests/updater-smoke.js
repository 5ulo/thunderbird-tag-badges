/* Independent controller: tests the actual, uninstrumented XPI and native updater. */
var updaterProbe = class extends ExtensionAPI {
  getAPI() { return {updaterProbe: {run: async () => {
    const {MailServices} = ChromeUtils.importESModule('resource:///modules/MailServices.sys.mjs');
    const {AddonManager} = ChromeUtils.importESModule('resource://gre/modules/AddonManager.sys.mjs');
    const {ExtensionParent} = ChromeUtils.importESModule('resource://gre/modules/ExtensionParent.sys.mjs');
    const win = Services.wm.getMostRecentWindow('mail:3pane');
    const pause = ms => new Promise(resolve => win.setTimeout(resolve, ms));
    const id = ADDON_ID;
    const results = [];
    const check = (ok, label) => { if (!ok) throw new Error(label); results.push(label); };
    const background = async () => {
      for (let i = 0; i < 100; i++) {
        const extension = ExtensionParent.GlobalManager.getExtension(id);
        const view = extension && [...extension.views].find(v => v.viewType === 'background');
        if (view) return view.xulBrowser.contentWindow.wrappedJSObject.messenger;
        await pause(100);
      }
      throw new Error('Background page unavailable');
    };
    try {
      await pause(1800);
      let addon = await AddonManager.getAddonByID(id);
      check(addon?.version === '0.0.0', 'isolated bootstrap version installed');
      const saved = {tableEnabled:true, cardEnabled:true, tableMaxTags:1, cardMaxTags:2, position:'after', size:'normal', order:'alphabetical', priority:[], pill:false, radius:7, nativeRowColors:false, debug:false};
      await (await background()).storage.local.set({settings:saved});
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
      check(install.version === EXPECTED_VERSION, 'native updater finds published GitHub version');
      check(install.sourceURI.spec.startsWith('https://github.com/5ulo/thunderbird-tag-badges/releases/download/'), 'updater uses versioned GitHub XPI asset');
      await install.install(); await pause(2000);
      addon = await AddonManager.getAddonByID(id);
      check(addon?.isActive && addon.version === EXPECTED_VERSION, 'native updater downloads verifies and installs XPI');
      const {settings} = await (await background()).storage.local.get('settings');
      check(JSON.stringify(settings) === JSON.stringify(saved), 'all saved preferences survive native update');
      const row = pane.document.querySelector('#threadTree tr[is="thread-row"]');
      check(!!row?.querySelector('.tb-tag-badges'), 'badges reconnect to existing message pane after update');
      check(pane.document.getElementById('threadTree').classList.contains('tb-no-tag-colors'), 'row color preference applies after update');
      check(typeof addon.getFullDescription === 'function', 'full description available after native update');
      await IOUtils.writeUTF8(REPORT_PATH, JSON.stringify({ok:true,results}));
    } catch (error) {
      await IOUtils.writeUTF8(REPORT_PATH, JSON.stringify({ok:false,results,error:String(error),stack:error.stack}));
    }
  }}}; }
};
