(function (global) {
  "use strict";

  const ByeStat = global.ByeStat;
  const { h, icon, setText } = ByeStat.dom;

  function getToolText(entry, field, language) {
    const key = entry.i18n?.[field];
    return key ? language.t(key) : entry[field];
  }

  function createToolItem(entry, onToggleTool, navigationRefs) {
    const name = h("strong");
    const description = h("small");
    const item = h(
      "button",
      {
        class: "tool-nav-item",
        type: "button",
        dataset: { toolId: entry.id },
      },
      h(
        "span",
        { class: "tool-nav-icon", attrs: { "aria-hidden": "true" } },
        icon(entry.icon || ["M5 5h14v14H5z"]),
      ),
      h("span", { class: "tool-nav-copy" }, name, description),
    );
    item.addEventListener("click", () => onToggleTool(entry.id));
    navigationRefs.set(entry.id, { description, entry, item, name });
    return item;
  }

  function createSections(onToggleTool, navigationRefs) {
    const entries = ByeStat.registry || [];
    const sections = (ByeStat.toolSections || []).map((section) => {
      const label = h("p", {
        class: "sidebar-label",
        id: `sidebar-section-${section.id}`,
      });
      const toolEntries = entries.filter(
        (entry) => (entry.section || "analysis") === section.id,
      );
      const toolList = h(
        "div",
        { class: "tool-list" },
        toolEntries.map((entry) =>
          createToolItem(entry, onToggleTool, navigationRefs),
        ),
      );
      const element = h(
        "section",
        {
          class: "sidebar-section",
          dataset: { section: section.id },
          attrs: { "aria-labelledby": label.id },
        },
        label,
        toolList,
      );
      return { element, label, section };
    });
    return {
      container: h(
        "div",
        { class: "sidebar-sections" },
        sections.map((entry) => entry.element),
      ),
      sections,
    };
  }

  function createSidebar({ language, onToggleTool }) {
    const navigationRefs = new Map();
    let lastSaveStatus = "saved";
    const saveText = h("strong");
    const saveNote = h("small");
    const saveState = h(
      "div",
      { class: "save-state", role: "status", attrs: { "aria-live": "polite" } },
      h("span", { class: "save-dot", attrs: { "aria-hidden": "true" } }),
      h("span", { class: "save-copy" }, saveText, saveNote),
    );
    const brandSubtitle = h("small");
    const brand = h(
      "a",
      { class: "brand", href: "./index.html" },
      h(
        "span",
        { class: "brand-mark", attrs: { "aria-hidden": "true" } },
        icon(["M5 17.5V13", "M12 17.5V7", "M19 17.5V9.5", "M3.5 20.5h17"]),
      ),
      h("span", { class: "brand-copy" }, h("strong", { text: "ByeStat" }), brandSubtitle),
    );
    const sectionNavigation = createSections(onToggleTool, navigationRefs);
    const navigation = h(
      "nav",
      { class: "sidebar-nav" },
      sectionNavigation.container,
    );
    const sidebar = h(
      "aside",
      { class: "app-sidebar" },
      h("div", { class: "sidebar-brand-row" }, brand, language.createToggle()),
      navigation,
      h("div", { class: "sidebar-footer" }, saveState),
    );

    function applySaveStatus(status) {
      lastSaveStatus = status;
      saveState.classList.toggle("is-saving", status === "saving");
      saveState.classList.toggle("has-error", status === "error");
      setText(saveText, language.t(`shell.save.${status}`));
    }

    function applyLanguage() {
      brand.setAttribute("aria-label", language.t("shell.brandHome"));
      sidebar.setAttribute("aria-label", language.t("shell.nav.sidebarAria"));
      navigation.setAttribute(
        "aria-label",
        language.t("shell.nav.toolNavigationAria"),
      );
      setText(brandSubtitle, language.t("shell.workspace"));
      sectionNavigation.sections.forEach(({ label, section }) => {
        setText(label, language.t(section.i18n?.name || "shell.nav.tools"));
      });
      setText(saveNote, language.t("shell.save.note"));
      navigationRefs.forEach(({ description, entry, name }) => {
        setText(name, getToolText(entry, "name", language) || entry.id);
        setText(
          description,
          getToolText(entry, "description", language) ||
            language.t("shell.nav.defaultDescription"),
        );
      });
      applySaveStatus(lastSaveStatus);
    }

    function setActive(ids) {
      const activeIds = new Set(Array.isArray(ids) ? ids : ids ? [ids] : []);
      navigationRefs.forEach(({ item }, toolId) => {
        const active = activeIds.has(toolId);
        item.classList.toggle("is-active", active);
        if (active) item.setAttribute("aria-current", "page");
        else item.removeAttribute("aria-current");
      });
    }

    language.subscribe(applyLanguage);
    applyLanguage();
    return { applySaveStatus, setActive, sidebar };
  }

  ByeStat.shellSidebar = { createSidebar };
})(window);
