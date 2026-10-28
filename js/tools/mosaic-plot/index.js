(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const entry = ByeStat.registry.find((tool) => tool.id === "mosaic-plot");
  const { buildMosaic, sortMosaic } = ByeStat.tools.mosaicPlot.calc;
  const { createView } = ByeStat.tools.mosaicPlot.view;

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
        language?.t("mosaicPlot.errors.workspace") ||
          "Mosaic plot requires table, tool, and language workspaces.",
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
      view.update({
        chart: sortMosaic(
          buildMosaic(store.getState(), scope),
          orderMode,
        ),
        orderMode,
        relativeFrequency: toolState.isActive("percentage"),
        scopeLabel: language.t(`table.scope.${scope}`),
      });
    }

    const unsubscribeTools = toolState.subscribe(render);
    const unsubscribeStore = store.subscribe(render);
    const unsubscribeScope = table.subscribeAnalysisScope(render);
    const unsubscribeLanguage = language.subscribe(render);
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
  ByeStat.toolModules["mosaic-plot"] = {
    id: "mosaic-plot",
    description: entry.description,
    icon: entry.icon,
    mount,
    name: entry.name,
    styleHref: "css/tools/mosaic-plot.css",
  };
})(window);
