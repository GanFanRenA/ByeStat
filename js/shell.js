(function (global) {
  "use strict";

  const ByeStat = global.ByeStat;
  const { h, setText } = ByeStat.dom;
  const language = ByeStat.shellLanguage.createLanguage();
  const store = ByeStat.store.createStore();
  const app = document.querySelector("#app-shell");
  const loadedScripts = new Set();
  const baseRoot = h("div", { class: "base-root" });
  const toolRoot = h("div", { class: "tool-root" });
  let activeTool = null;
  let activeStyle = null;
  let shellError = null;

  const sidebar = ByeStat.shellSidebar.createSidebar({
    language,
    onToggleTool: toggleActiveTool,
  });
  const baseTable = ByeStat.baseTable.mount(baseRoot, store, language);
  app.replaceChildren(
    h(
      "div",
      { class: "shell-frame" },
      sidebar.sidebar,
      h("div", { class: "shell-content" }, h("main", {}, baseRoot, toolRoot)),
    ),
  );

  function applyTitle() {
    if (shellError) {
      setText(shellError.title, language.t("shell.errors.toolTitle"));
      setText(shellError.body, language.t("shell.errors.toolBody"));
    }
    if (activeTool) {
      const name = activeTool.nameKey
        ? language.t(activeTool.nameKey)
        : activeTool.name;
      document.title = language.t("shell.toolTitle", { tool: name });
    } else {
      document.title = language.t("meta.title");
    }
  }

  function loadScript(source) {
    if (loadedScripts.has(source)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = h("script", { src: source, async: false });
      script.onload = () => {
        loadedScripts.add(source);
        resolve();
      };
      script.onerror = () =>
        reject(new Error(language.t("shell.errors.script", { source })));
      document.head.append(script);
    });
  }

  function loadStyle(source) {
    return new Promise((resolve, reject) => {
      const link = h("link", {
        rel: "stylesheet",
        href: source,
        dataset: { toolStyle: "true" },
      });
      link.onload = () => resolve(link);
      link.onerror = () =>
        reject(new Error(language.t("shell.errors.style", { source })));
      document.head.append(link);
    });
  }

  function unloadTool() {
    if (activeTool?.cleanup) activeTool.cleanup();
    activeStyle?.remove();
    activeTool = null;
    activeStyle = null;
  }

  function deactivateTool() {
    unloadTool();
    shellError = null;
    sidebar.setActive(null);
    toolRoot.replaceChildren();
    applyTitle();
  }

  function showLoadError(error) {
    console.error(error);
    unloadTool();
    shellError = { title: h("h1"), body: h("p") };
    sidebar.setActive(null);
    toolRoot.replaceChildren(
      h("section", { class: "shell-error" }, shellError.title, shellError.body),
    );
    applyTitle();
  }

  async function mountTool(entry) {
    unloadTool();
    shellError = null;
    for (const source of entry.scripts) await loadScript(source);
    const module = ByeStat.toolModules?.[entry.id];
    if (!module || typeof module.mount !== "function") {
      throw new Error(language.t("shell.errors.invalidMount", { id: entry.id }));
    }
    activeStyle = await loadStyle(module.styleHref);
    const mountRoot = h("div", { class: "tool-mount" });
    toolRoot.replaceChildren(mountRoot);
    const cleanup = module.mount(mountRoot, store, {
      language,
      table: baseTable,
    });
    activeTool = {
      cleanup,
      id: module.id,
      name: module.name,
      nameKey: entry.i18n?.name,
    };
    sidebar.setActive(module.id);
    applyTitle();
  }

  async function navigateToTool(id) {
    const entry = ByeStat.registry.find((tool) => tool.id === id);
    if (!entry) {
      showLoadError(
        new Error(language.t("shell.errors.unknownTool", { id })),
      );
      return;
    }
    try {
      await mountTool(entry);
    } catch (error) {
      showLoadError(error);
    }
  }

  function toggleActiveTool(id) {
    if (activeTool?.id === id) deactivateTool();
    else navigateToTool(id);
  }

  ByeStat.navigateToTool = navigateToTool;
  store.subscribeStatus(sidebar.applySaveStatus);
  language.subscribe(applyTitle);
  sidebar.setActive(null);
  applyTitle();
})(window);
