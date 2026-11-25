/* Exercise native filtering, redraw and row recycling while badges precede subjects. */
(async () => {
  const win = Services.wm.getMostRecentWindow('mail:3pane');
  const pause = ms => new Promise(resolve => win.setTimeout(resolve,ms));
  const results = [];
  const check = (ok, name) => { if (!ok) throw new Error(name); results.push(name); };
  try {
    await pause(1800);
    const pane = win.document.getElementById('tabmail').currentAbout3Pane;
    try {MailServices.accounts.localFoldersServer;} catch (_) {MailServices.accounts.createLocalMailAccount();}
    const root = MailServices.accounts.localFoldersServer.rootFolder;
    root.createSubfolder('QuickFilterRegression',null);await pause(500);
    const folder = root.getChildNamed('QuickFilterRegression');
    const local = folder.QueryInterface(Ci.nsIMsgLocalMailFolder);
    for (let i=0;i<60;i++) local.addMessage(`From - Wed Nov 25 12:00:00 2026\r\nFrom: test@example.invalid\r\nSubject: Filter subject ${String(i).padStart(2,'0')}\r\nMessage-ID: <filter-${i}@example.invalid>\r\nDate: Wed, 25 Nov 2026 12:00:00 +0100\r\n\r\nTest.\r\n`);
    for (const [i,hdr] of [...folder.messages].entries()) hdr.setStringProperty('keywords', i%3===2 ? '' : i%3===1 ? '$label2' : '$label1 $label2');
    this.settings = this.shared.TagBadgeSettings.normalize({position:'before',size:'normal'});
    pane.displayFolder(folder.URI);
    Services.prefs.setIntPref('mail.threadpane.listview',1);pane.threadPane.updateThreadView('table');
    await pause(1800);
    for (const state of this.documents.values()) state.schedule();
    await pause(1200);
    const tree=pane.document.getElementById('threadTree');
    const assertSubjects = label => {
      const rows=[...tree.querySelectorAll('tr[is="thread-row"]')].filter(r=>!r.dataset.properties?.split(' ').includes('dummy'));
      check(rows.length>0,label+' has message rows');
      for (const row of rows) {
        const line=row.querySelector('.subject-line');
        const subject=line?.querySelector(':scope > span');
        const cell=row.querySelector('.subjectcol-column');
        const expected=JSON.parse(cell.getAttribute('data-l10n-args')).title;
        if (!subject || line.querySelector('span')!==subject || subject.textContent!==expected) throw new Error(`${label}: native subject mismatch for row ${row.index ?? row._index}: expected "${expected}", got "${subject?.textContent}"`);
      }
      check(true,label+' preserves every visible native subject');
    };
    assertSubjects('initial badges before subject');
    for (const state of [...this.documents.values()]) state.destroy();
    tree.querySelector('.subject-line > span').textContent='';
    this.attachDocument(pane.document);
    await pause(1800);
    assertSubjects('reattach repairs an already empty native subject');
    for (const tag of ['$label1','$label2','$label1']) {
      pane.quickFilterBar.setFilterValue('tags',{mode:'OR',tags:{[tag]:true}});
      pane.quickFilterBar.updateSearch();await pause(1600);
      assertSubjects('tag filter '+tag);
      const rows=[...tree.querySelectorAll('tr[is="thread-row"]')];
      for (const row of rows) {
        const fill=row.fillRow || row._fillRow;
        fill.call(row);
      }
      await pause(1000);
      assertSubjects('native row redraw under '+tag);
      tree.scrollTop=tree.scrollHeight;await pause(1200);
      assertSubjects('scrolled filtered rows '+tag);
      tree.scrollTop=0;await pause(1000);
    }
    pane.quickFilterBar.setFilterValue('tags',null);
    pane.quickFilterBar.updateSearch();await pause(1600);
    assertSubjects('filter removed');
    this.settings.position='after';
    for (const state of this.documents.values()) state.schedule();
    await pause(1200);
    tree.invalidate();await pause(1200);
    assertSubjects('badges after subject and native invalidation');
    this.settings.tableEnabled=false;
    for (const state of this.documents.values()) state.schedule();
    await pause(1000);
    assertSubjects('table badges disabled');
    check(!tree.querySelector('.tb-tag-badges'),'disabling integration removes all badges');
    await IOUtils.writeUTF8(SMOKE_RESULT_PATH,JSON.stringify({ok:true,results}));
  } catch(error) {await IOUtils.writeUTF8(SMOKE_RESULT_PATH,JSON.stringify({ok:false,results,error:String(error),stack:error.stack}));}
})();
