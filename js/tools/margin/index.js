(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const entry = ByeStat.registry.find((tool) => tool.id === "margin");
  const { calculate, formatTotal } = ByeStat.tools.margin.calc;

  function mount(root, store, workspace) {
    const language = workspace?.language;
    if (!workspace?.table?.registerSummary) {
      throw new Error(
        language?.t("margin.errors.workspace") ||
          "Margin requires the base table summary extension.",
      );
    }

    const unregister = workspace.table.registerSummary({
      id: "margin",
      className: "tool-margin",
      rowLabel: (currentLanguage) => currentLanguage.t("margin.rowTotal"),
      columnLabel: (currentLanguage) =>
        currentLanguage.t("margin.columnTotal"),
      values: calculate,
      format: formatTotal,
    });
    let active = true;

    return function unmount() {
      if (!active) return;
      active = false;
      unregister();
      root.replaceChildren();
    };
  }

  ByeStat.toolModules = ByeStat.toolModules || {};
  ByeStat.toolModules.margin = {
    id: "margin",
    name: entry.name,
    description: entry.description,
    icon: entry.icon,
    styleHref: "css/tools/margin.css",
    mount,
  };
})(window);
