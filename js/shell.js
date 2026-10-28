(function (global) {
  "use strict";

  const ByeStat = global.ByeStat;
  const { h, setText } = ByeStat.dom;
  const language = ByeStat.shellLanguage.createLanguage();
  const store = ByeStat.store.createStore();
  const app = document.querySelector("#app-shell");
  const loadedScripts = new Set();
  const activeTools = new Map();
  const toolListeners = new Set();
  const baseRoot = h("div", { class: "base-root" });
  const toolRoot = h("div", { class: "tool-root" });
  let shellError = null;
  let shellErrorElement = null;

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

  function getToolName(tool) {
    return tool.nameKey ? language.t(tool.nameKey) : tool.name;
  }

  function applyTitle() {
    if (shellError) {
      setText(shellError.title, language.t("shell.errors.toolTitle"));
      setText(shellError.body, language.t("shell.errors.toolBody"));
    }
    const names = [...activeTools.values()].map(getToolName);
    document.title = names.length
      ? language.t("shell.toolTitle", { tool: names.join(" + ") })
      : language.t("meta.title");
  }

  function syncSidebar() {
    sidebar.setActive([...activeTools.keys()]);
  }

  function notifyToolListeners() {
    const activeIds = new Set(activeTools.keys());
    toolListeners.forEach((listener) => {
      try {
        listener(activeIds);
      } catch (error) {
        console.error("工具状态订阅回调失败。", error);
      }
    });
  }

  function subscribeToolListeners(listener) {
    if (typeof listener !== "function") return () => {};
    toolListeners.add(listener);
    listener(new Set(activeTools.keys()));
    return () => toolListeners.delete(listener);
  }

  function revealTool(entry, root) {
    const section = ByeStat.toolSections?.find(
      (candidate) => candidate.id === entry.section,
    );
    if (!section?.scrollOnOpen) return;
    root.scrollIntoView({ block: "start" });
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

  function unloadTool(id) {
    const tool = activeTools.get(id);
    if (!tool) return;
    activeTools.delete(id);
    if (typeof tool.cleanup === "function") tool.cleanup();
    tool.style?.remove();
    tool.root.remove();
    syncSidebar();
    applyTitle();
    notifyToolListeners();
  }

  function unloadAllTools() {
    [...activeTools.keys()].forEach(unloadTool);
    syncSidebar();
    applyTitle();
  }

  function clearShellError() {
    shellError = null;
    shellErrorElement?.remove();
    shellErrorElement = null;
  }

  function deactivateTool(id) {
    unloadTool(id);
  }

  function showLoadError(error) {
    console.error(error);
    unloadAllTools();
    clearShellError();
    shellError = { title: h("h1"), body: h("p") };
    shellErrorElement = h(
      "section",
      { class: "shell-error" },
      shellError.title,
      shellError.body,
    );
    toolRoot.append(shellErrorElement);
    syncSidebar();
    applyTitle();
  }

  async function mountTool(entry) {
    for (const source of entry.scripts) await loadScript(source);
    const module = ByeStat.toolModules?.[entry.id];
    if (!module || typeof module.mount !== "function") {
      throw new Error(language.t("shell.errors.invalidMount", { id: entry.id }));
    }
    const style = await loadStyle(module.styleHref);
    const mountRoot = h("div", {
      class: "tool-mount",
      dataset: { toolId: entry.id },
    });
    toolRoot.append(mountRoot);
    const tool = {
      cleanup: null,
      id: module.id,
      name: module.name,
      nameKey: entry.i18n?.name,
      root: mountRoot,
      style,
    };
    activeTools.set(entry.id, tool);
    try {
      tool.cleanup = module.mount(mountRoot, store, {
        language,
        table: baseTable,
        tools: {
          isActive: (id) => activeTools.has(id),
          subscribe: subscribeToolListeners,
        },
      });
    } catch (error) {
      unloadTool(entry.id);
      throw error;
    }
    syncSidebar();
    applyTitle();
    notifyToolListeners();
    revealTool(entry, mountRoot);
  }

  async function navigateToTool(id) {
    const entry = ByeStat.registry.find((tool) => tool.id === id);
    clearShellError();
    if (!entry) {
      showLoadError(new Error(language.t("shell.errors.unknownTool", { id })));
      return;
    }
    try {
      await mountTool(entry);
    } catch (error) {
      showLoadError(error);
    }
  }

  function toggleActiveTool(id) {
    if (activeTools.has(id)) deactivateTool(id);
    else navigateToTool(id);
  }

  ByeStat.navigateToTool = navigateToTool;
  store.subscribeStatus(sidebar.applySaveStatus);
  language.subscribe(applyTitle);
  syncSidebar();
  applyTitle();
})(window);
