const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {TagBadgeSettings} = require('../settings.js');
const source = fs.readFileSync(require('node:path').join(__dirname, '../experiments/tagBadges/api.js'), 'utf8');
function setup(loading) {
  const listeners = new Map();
  const pane = {nodeType:9, documentURI:'about:3pane', readyState:loading ? 'loading' : 'complete',
    querySelectorAll:() => [], addEventListener:(name,fn) => listeners.set(name,fn), removeEventListener:name => listeners.delete(name)};
  const win = {document:{nodeType:9, documentURI:'chrome://messenger/content/messenger.xhtml',
    querySelectorAll:selector => selector === 'browser, iframe' ? [{contentDocument:pane}] : []},addEventListener(){},removeEventListener(){}};
  const windows = [win];
  const imported = {
    // Simulate a shared helper that does NOT deliver a load callback to us.
    'resource:///modules/ExtensionSupport.sys.mjs':{ExtensionSupport:{registerWindowListener(){}}},
    'resource:///modules/MailServices.sys.mjs':{MailServices:{}},
    'resource://gre/modules/AddonManager.sys.mjs':{AddonManager:{getAddonByID:async()=>null}},
  };
  const sandbox = {console,ExtensionAPI:class {},ChromeUtils:{importESModule:name=>imported[name]},
    Services:{scriptloader:{loadSubScriptWithOptions:(url,options)=>{assert.equal(url,"settings.js"); assert.equal(options.allowUnsafeURL,true); options.target.TagBadgeSettings=TagBadgeSettings;}},
      prefs:{addObserver(){},removeObserver(){}},obs:{addObserver(){},removeObserver(){}},
      wm:{addListener(){},removeListener(){},getEnumerator:()=>windows}}};
  vm.runInNewContext(source,sandbox);
  const api = new sandbox.tagBadges();
  const attached = [];
  api.attachDocument = doc => {attached.push(doc);api.documents.set(doc,{schedule(){},destroy(){}});};
  const exported = api.getAPI({extension:{id:'test@local.invalid',rootURI:{resolve:p=>p}},callOnClose(){}});
  return {api,exported,pane,listeners,attached,windows};
}
test('startup finds an existing pane even if shared window helper delivers no callback', () => {
  const state=setup(false);
  assert.deepEqual(state.attached,[state.pane]);
});
test('pane inserted before startup finishes is attached after DOMContentLoaded, once', () => {
  const state=setup(true);
  assert.equal(state.attached.length,0);
  assert.ok(state.listeners.has('DOMContentLoaded'));
  state.api.rescanWindows();
  state.pane.readyState='interactive';
  state.listeners.get('DOMContentLoaded')();
  state.api.rescanWindows();
  assert.deepEqual(state.attached,[state.pane]);
});
test('saving preferences discovers missed panes without restarting or reinstalling', async () => {
  const state=setup(false);
  state.api.documents.clear();state.attached.length=0;
  await state.exported.tagBadges.configure({tableEnabled:true,cardEnabled:true});
  assert.deepEqual(state.attached,[state.pane]);
});
