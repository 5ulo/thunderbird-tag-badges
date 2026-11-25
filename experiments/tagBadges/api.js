/* global ChromeUtils, ExtensionAPI, Services */
var tagBadges = (() => {
const {ExtensionSupport} = ChromeUtils.importESModule("resource:///modules/ExtensionSupport.sys.mjs");
const {MailServices} = ChromeUtils.importESModule("resource:///modules/MailServices.sys.mjs");
return class extends ExtensionAPI {
  getAPI(context) {
    this.context = context;
    this.shared = {};
    Services.scriptloader.loadSubScript(context.extension.rootURI.resolve("settings.js"), this.shared);
    this.settings = this.shared.TagBadgeSettings.normalize();
    this.windows = new Map();
    this.documents = new Map();
    this.pendingDocuments = new Map();
    // Browser load events do not always cross the embedded browser boundary.
    // Observe newly created documents too, including the first startup pane.
    this.documentObserver = doc => {
      if (doc.documentURI !== "about:3pane") return;
      const ready = () => {
        this.pendingDocuments.delete(doc);
        this.attachDocument(doc);
      };
      if (doc.readyState === "loading") {
        this.pendingDocuments.set(doc, ready);
        doc.addEventListener("DOMContentLoaded", ready, {once: true});
      } else ready();
    };
    Services.obs.addObserver(this.documentObserver, "document-element-inserted");
    this.tagObserver = () => {
      this.tags = null;
      for (const state of this.documents.values()) state.schedule();
    };
    Services.prefs.addObserver("mailnews.tags.", this.tagObserver);
    this.listenerId = `${context.extension.id}:badges`;
    ExtensionSupport.registerWindowListener(this.listenerId, {
      chromeURLs: ["chrome://messenger/content/messenger.xhtml"],
      onLoadWindow: win => this.attachWindow(win),
      onUnloadWindow: win => this.detachWindow(win),
    });
    context.callOnClose(this);
    return {tagBadges: {configure: async settings => {
      this.settings = this.shared.TagBadgeSettings.normalize(settings);
      for (const state of this.documents.values()) state.schedule();
    }}};
  }

  log(message, error) {
    if (this.settings.debug) console.log("[Tag Badges]", message, error || "");
  }

  attachWindow(win) {
    const scan = doc => {
      if (!doc || doc.nodeType !== 9) return;
      if (doc.location?.href === "about:3pane") this.attachDocument(doc);
      for (const browser of doc.querySelectorAll("browser, iframe")) {
        try { if (browser.contentDocument !== doc) scan(browser.contentDocument); } catch (_) {}
      }
    };
    const load = event => scan(event.target);
    win.addEventListener("load", load, true);
    this.windows.set(win, load);
    scan(win.document);
  }

  detachWindow(win) {
    const load = this.windows.get(win);
    if (load) win.removeEventListener("load", load, true);
    this.windows.delete(win);
    for (const [doc, state] of this.documents) {
      if (doc.defaultView?.top === win || !doc.defaultView) state.destroy();
    }
  }

  attachDocument(doc) {
    if (this.documents.has(doc)) return;
    const win = doc.defaultView;
    const tree = doc.getElementById("threadTree");
    if (!tree) return;
    const style = doc.createElement("style");
    style.textContent = `
      .tb-tag-badges { display: inline-flex; align-items: center; gap: 4px;
        min-width: 0; max-width: 100%; overflow: hidden; vertical-align: middle; pointer-events: auto; }
      .tb-tag-badge { display: inline-block; flex: 0 0 auto; box-sizing: border-box;
        padding: 1px 6px; font-size: 0.85em; line-height: 1.25; font-weight: 500;
        max-width: 24ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        background: var(--tb-badge-bg) !important; color: var(--tb-badge-fg) !important;
        border-radius: var(--tb-badge-radius); opacity: 1 !important; }
      .tb-table-badges .subject-line { display: flex; align-items: center; min-width: 0; }
      .tb-table-badges .subject-line > span { flex: 0 1 auto; min-width: 0; overflow: hidden;
        text-overflow: ellipsis; white-space: nowrap; }
      .tb-table-badges .subject-line > img { flex-shrink: 0; }
      /* Give badges their intrinsic width; only the subject yields space.
         Shrinking both by their content width clips tags for long subjects. */
      .subject-line > .tb-tag-badges { flex: 0 0 auto; }
      .tb-tags-before { margin-inline-end: 6px; }
      .tb-tags-after { margin-inline-start: 6px; }
      tr.tb-card-badges .thread-card-tags-info { display: none !important; }
      tr.tb-card-badges .thread-card-icon-info { min-width: 0; }
      tr.tb-card-badges .thread-card-icon-info > .tb-tag-badges { flex-shrink: 1; }
      /* Override only the native tag variables, preserving hover/selection rules. */
      #threadTree.tb-no-tag-colors tr { --tag-color: initial !important;
        --tag-contrast-color: initial !important; }
    `;
    doc.head.append(style);
    let frame = 0;
    let destroyed = false;
    const render = () => {
      frame = 0;
      if (destroyed) return;
      observer.disconnect();
      try {
        tree.classList.toggle("tb-no-tag-colors", !this.settings.nativeRowColors);
        for (const row of tree.querySelectorAll('tr[is="thread-row"], tr[is="thread-card"]')) {
          try { this.renderRow(row); } catch (error) { this.log("Nepodarilo sa vykresliť riadok", error); }
        }
      } finally {
        if (!destroyed) observer.observe(tree, {subtree: true, childList: true,
          characterData: true, attributes: true, attributeFilter: ["data-properties", "rows"]});
      }
    };
    const schedule = () => { if (!destroyed && !frame) frame = win.requestAnimationFrame(render); };
    const observer = new win.MutationObserver(schedule);
    const destroy = () => {
      destroyed = true;
      observer.disconnect();
      if (frame) win.cancelAnimationFrame(frame);
      win.removeEventListener("unload", destroy);
      tree.classList.remove("tb-no-tag-colors");
      for (const badge of tree.querySelectorAll(".tb-tag-badges")) badge.remove();
      for (const row of tree.querySelectorAll(".tb-card-badges, .tb-table-badges")) row.classList.remove("tb-card-badges", "tb-table-badges");
      style.remove();
      this.documents.delete(doc);
    };
    this.documents.set(doc, {schedule, destroy});
    win.addEventListener("unload", destroy, {once: true});
    render();
    this.log("Pripojené about:3pane");
  }

  renderRow(row) {
    const card = row.getAttribute("is") === "thread-card";
    const enabled = card ? this.settings.cardEnabled : this.settings.tableEnabled;
    const old = row.querySelector(".tb-tag-badges");
    const dummy = (row.dataset.properties || "").split(" ").includes("dummy");
    row.classList.remove("tb-card-badges", "tb-table-badges");
    if (!enabled || dummy) { old?.remove(); return; }
    const view = row.view || row.ownerDocument.defaultView.gDBView;
    const index = row.index ?? row._index;
    if (!view || !Number.isInteger(index) || index < 0) { old?.remove(); return; }
    const header = view.getMsgHdrAt(index);
    if (!header) { old?.remove(); return; }
    const keywords = new Set(header.getStringProperty("keywords").split(/\s+/));
    if (header.label) keywords.add(`$label${header.label}`);
    this.tags ||= MailServices.tags.getAllTags();
    const all = this.tags.filter(tag => keywords.has(tag.key));
    const shown = this.settings.maxTags ? all.slice(0, this.settings.maxTags) : all;
    const subject = row.querySelector(".subject-line > span");
    const native = row.querySelector(".thread-card-tags-info");
    if (!shown.length || (card ? !native : !subject)) { old?.remove(); return; }
    const doc = row.ownerDocument;
    const badges = old || doc.createElement("div");
    badges.className = `tb-tag-badges ${card ? "" : `tb-tags-${this.settings.position}`}`;
    badges.replaceChildren();
    badges.title = all.map(tag => tag.tag).join(", ");
    badges.setAttribute("aria-label", badges.title);
    for (const tag of shown) {
      const badge = doc.createElement("span");
      badge.className = "tb-tag-badge";
      badge.textContent = tag.tag;
      const color = /^#[0-9a-f]{6}$/i.test(tag.color) ? tag.color : "#606060";
      badge.style.setProperty("--tb-badge-bg", color);
      badge.style.setProperty("--tb-badge-fg", this.shared.TagBadgeSettings.foreground(color));
      badge.style.setProperty("--tb-badge-radius", this.settings.pill ? "999px" : `${this.settings.radius}px`);
      badges.append(badge);
    }
    if (card) {
      native.before(badges);
      row.classList.add("tb-card-badges");
    } else {
      row.classList.add("tb-table-badges");
      if (this.settings.position === "before") subject.before(badges);
      else subject.after(badges);
    }
  }

  onShutdown(isAppShutdown) {
    if (!isAppShutdown) Services.obs.notifyObservers(null, "startupcache-invalidate");
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    Services.obs.removeObserver(this.documentObserver, "document-element-inserted");
    for (const [doc, ready] of this.pendingDocuments) doc.removeEventListener("DOMContentLoaded", ready);
    this.pendingDocuments.clear();
    ExtensionSupport.unregisterWindowListener(this.listenerId);
    Services.prefs.removeObserver("mailnews.tags.", this.tagObserver);
    for (const win of [...this.windows.keys()]) this.detachWindow(win);
    for (const state of [...this.documents.values()]) state.destroy();
  }
};
})();
