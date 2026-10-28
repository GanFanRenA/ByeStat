(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const entry = ByeStat.registry.find((tool) => tool.id === "bar-chart");
  const { buildChart, sortChart } = ByeStat.tools.barChart.calc;
  const { createView } = ByeStat.tools.barChart.view;

  function mount(root, store, workspace) {
    const language = workspace?.language;
    const table = workspace?.table;
    const toolState = workspace?.tools;
    if (
      !store ||
      !language ||
      !table?.getAnalysisScope ||
      !table?.subscribeAnalysisScope ||
      !toolState?.isActive ||
      !toolState?.subscribe
    ) {
      throw new Error(
        language?.t("barChart.errors.workspace") ||
          "Bar chart requires table, tool, and language workspaces.",
      );
    }

    let active = true;
    let orderMode = "source";
    const view = createView(root, language, {
      onOrder(mode) {
        orderMode = mode;
        render();
      },
    });

    function render() {
      if (!active) return;
      const scope = table.getAnalysisScope();
      const chart = sortChart(
        buildChart(
          store.getState(),
          scope,
          toolState.isActive("percentage"),
        ),
        orderMode,
      );
      view.update({
        chart,
        orderMode,
        scopeLabel: language.t(`table.scope.${scope}`),
      });
    }

    const unsubscribeTools = toolState.subscribe(render);
    const unsubscribeStore = store.subscribe(render);
    const unsubscribeScope = table.subscribeAnalysisScope(render);
    const unsubscribeLanguage = language.subscribe(() => {
      view.applyLanguage();
      render();
    });
    render();

    return function unmount() {
      if (!active) return;
      active = false;
      unsubscribeTools();
      unsubscribeStore();
      unsubscribeScope();
      unsubscribeLanguage();
      root.replaceChildren();
    };
  }

  ByeStat.toolModules = ByeStat.toolModules || {};
  ByeStat.toolModules["bar-chart"] = {
    id: "bar-chart",
    name: entry.name,
    description: entry.description,
    icon: entry.icon,
    styleHref: "css/tools/bar-chart.css",
    mount,
  };
})(window);
