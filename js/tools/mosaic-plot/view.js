(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const tools = (ByeStat.tools = ByeStat.tools || {});
  const mosaicPlotTool = (tools.mosaicPlot = tools.mosaicPlot || {});
  const { h, setText } = ByeStat.dom;
  const {
    ORDER_MODES,
    SERIES_COLORS,
    formatNumber,
    summarize,
  } = mosaicPlotTool.calc;
  const { render } = mosaicPlotTool.chart;

  function createOrderButton(mode, onOrder) {
    const button = h("button", {
      class: "mosaic-plot-order-button",
      type: "button",
      dataset: { order: mode },
      attrs: { "aria-pressed": "false" },
    });
    button.addEventListener("click", () => onOrder(mode));
    return button;
  }

  function createStat(labelKey) {
    const label = h("span", { class: "mosaic-plot-stat-label" });
    const value = h("strong", { class: "mosaic-plot-stat-value" });
    const element = h("div", { class: "mosaic-plot-stat" }, label, value);
    return { element, label, labelKey, value };
  }

  function createOrderButtons(onOrder) {
    const buttons = ORDER_MODES.map((mode) =>
      createOrderButton(mode, onOrder),
    );
    return {
      buttons,
      element: h(
        "div",
        { class: "mosaic-plot-order", role: "group" },
        buttons,
      ),
    };
  }

  function createView(root, language, handlers) {
    const eyebrow = h("p", { class: "mosaic-plot-eyebrow" });
    const title = h("h2", { id: "mosaic-plot-title" });
    const description = h("p", { class: "mosaic-plot-description" });
    const stats = [
      createStat("mosaicPlot.targets"),
      createStat("mosaicPlot.attributes"),
      createStat("mosaicPlot.blocks"),
    ];
    const statsElement = h(
      "div",
      { class: "mosaic-plot-stats" },
      stats.map((stat) => stat.element),
    );
    const layoutLabel = h("span", { class: "mosaic-plot-control-label" });
    const layoutValue = h("strong", { class: "mosaic-plot-layout-value" });
    const layoutControl = h(
      "div",
      { class: "mosaic-plot-control mosaic-plot-layout-control" },
      layoutLabel,
      layoutValue,
    );
    const orderLabel = h("span", { class: "mosaic-plot-control-label" });
    const order = createOrderButtons(handlers.onOrder);
    const orderControl = h(
      "div",
      { class: "mosaic-plot-control mosaic-plot-order-control" },
      orderLabel,
      order.element,
    );
    const controls = h(
      "div",
      { class: "mosaic-plot-controls" },
      layoutControl,
      orderControl,
    );
    const legend = h("div", {
      class: "mosaic-plot-legend",
      role: "list",
    });
    const chartHost = h("div", {
      class: "mosaic-plot-viewport",
      attrs: { role: "region" },
    });
    const note = h("p", { class: "mosaic-plot-note" });
    const stage = h(
      "div",
      { class: "mosaic-plot-stage" },
      legend,
      chartHost,
      note,
    );
    let lastLegendSignature = "";
    let currentScopeLabel = "";
    let currentRelativeFrequency = false;

    root.classList.add("tool-mosaic-plot");
    root.replaceChildren(
      h(
        "section",
        {
          class: "mosaic-plot-panel",
          attrs: { "aria-labelledby": title.id },
        },
        h(
          "header",
          { class: "mosaic-plot-header" },
          h(
            "div",
            { class: "mosaic-plot-heading" },
            eyebrow,
            title,
            description,
          ),
          statsElement,
        ),
        controls,
        stage,
      ),
    );

    function setLegend(series) {
      const signature = JSON.stringify(series);
      if (signature === lastLegendSignature) return;
      lastLegendSignature = signature;
      legend.replaceChildren(
        ...series.map((label, index) => {
          const swatch = h("span", {
            class: "mosaic-plot-legend-swatch",
            attrs: { "aria-hidden": "true" },
          });
          swatch.style.backgroundColor =
            SERIES_COLORS[index % SERIES_COLORS.length];
          return h(
            "span",
            {
              class: "mosaic-plot-legend-item",
              attrs: { role: "listitem" },
            },
            swatch,
            label,
          );
        }),
      );
    }

    function setOrder(mode) {
      order.buttons.forEach((button) => {
        const active = button.dataset.order === mode;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    }

    function updateStats(chart) {
      const summary = summarize(chart);
      setText(stats[0].value, formatNumber(summary.targets, language.locale));
      setText(
        stats[1].value,
        formatNumber(summary.attributes, language.locale),
      );
      setText(stats[2].value, formatNumber(summary.blocks, language.locale));
    }

    function applyLanguage() {
      setText(eyebrow, language.t("mosaicPlot.eyebrow"));
      setText(title, language.t("mosaicPlot.title"));
      setText(description, language.t("mosaicPlot.description"));
      setText(layoutLabel, language.t("mosaicPlot.layout"));
      setText(orderLabel, language.t("mosaicPlot.order"));
      order.element.setAttribute(
        "aria-label",
        language.t("mosaicPlot.orderAria"),
      );
      legend.setAttribute("aria-label", language.t("mosaicPlot.legendAria"));
      order.buttons.forEach((button) => {
        setText(
          button,
          language.t(`mosaicPlot.order.${button.dataset.order}`),
        );
      });
      stats.forEach((stat) => {
        setText(stat.label, language.t(stat.labelKey));
      });
      setText(layoutValue, currentScopeLabel || "—");
      setText(
        note,
        language.t(
          currentRelativeFrequency
            ? "mosaicPlot.note.percentage"
            : "mosaicPlot.note.number",
          { scope: currentScopeLabel || "—" },
        ),
      );
    }

    function update({ chart, orderMode, relativeFrequency, scopeLabel }) {
      currentScopeLabel = scopeLabel;
      currentRelativeFrequency = relativeFrequency;
      setLegend(chart.series);
      setOrder(orderMode);
      updateStats(chart);
      applyLanguage();
      chartHost.setAttribute("aria-label", language.t("mosaicPlot.title"));
      render(chartHost, chart, {
        areaTitle: language.t("mosaicPlot.area"),
        ariaLabel: language.t("mosaicPlot.chartAria", {
          attributes: chart.series.length,
          scope: scopeLabel,
          targets: chart.groups.length,
        }),
        description: language.t("mosaicPlot.chartDescription"),
        emptyLabel: language.t("mosaicPlot.empty"),
        locale: language.locale,
        relativeFrequency,
        valueAria: language.t("mosaicPlot.valueAria"),
      });
    }

    applyLanguage();
    return { applyLanguage, update };
  }

  mosaicPlotTool.view = { createView };
})(window);
