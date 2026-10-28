(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const tools = (ByeStat.tools = ByeStat.tools || {});
  const barChartTool = (tools.barChart = tools.barChart || {});
  const { h, setText } = ByeStat.dom;
  const {
    ORDER_MODES,
    SERIES_COLORS,
    flattenValues,
    formatFrequency,
    formatNumber,
    summarize,
  } = barChartTool.calc;
  const { render } = barChartTool.chart;

  function createOrderButton(mode, onOrder) {
    const button = h("button", {
      class: "bar-chart-order-button",
      type: "button",
      dataset: { order: mode },
      attrs: { "aria-pressed": "false" },
    });
    button.addEventListener("click", () => onOrder(mode));
    return button;
  }

  function createStat(labelKey) {
    const label = h("span", { class: "bar-chart-stat-label" });
    const value = h("strong", { class: "bar-chart-stat-value" });
    const element = h("div", { class: "bar-chart-stat" }, label, value);
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
        { class: "bar-chart-order", role: "group" },
        buttons,
      ),
    };
  }

  function createView(root, language, handlers) {
    const eyebrow = h("p", { class: "bar-chart-eyebrow" });
    const title = h("h2", { id: "bar-chart-title" });
    const description = h("p", { class: "bar-chart-description" });
    const stats = [
      createStat("barChart.total"),
      createStat("barChart.average"),
      createStat("barChart.maximum"),
    ];
    const statsElement = h(
      "div",
      { class: "bar-chart-stats" },
      stats.map((stat) => stat.element),
    );
    const layoutLabel = h("span", { class: "bar-chart-control-label" });
    const layoutValue = h("strong", { class: "bar-chart-layout-value" });
    const layoutControl = h(
      "div",
      { class: "bar-chart-control bar-chart-layout-control" },
      layoutLabel,
      layoutValue,
    );
    const orderLabel = h("span", { class: "bar-chart-control-label" });
    const order = createOrderButtons(handlers.onOrder);
    const orderControl = h(
      "div",
      { class: "bar-chart-control bar-chart-order-control" },
      orderLabel,
      order.element,
    );
    const controls = h(
      "div",
      { class: "bar-chart-controls" },
      layoutControl,
      orderControl,
    );
    const legend = h("div", { class: "bar-chart-legend", role: "list" });
    const chartHost = h("div", {
      class: "bar-chart-viewport",
      attrs: { role: "region" },
    });
    const note = h("p", { class: "bar-chart-note" });
    const stage = h(
      "div",
      { class: "bar-chart-stage" },
      legend,
      chartHost,
      note,
    );
    let lastColumnSignature = "";
    let currentScopeLabel = "";
    let currentRelativeFrequency = false;

    root.classList.add("tool-bar-chart");
    root.append(
      h(
        "section",
        {
          class: "bar-chart-panel",
          attrs: { "aria-labelledby": title.id },
        },
        h(
          "header",
          { class: "bar-chart-header" },
          h("div", { class: "bar-chart-heading" }, eyebrow, title, description),
          statsElement,
        ),
        controls,
        stage,
      ),
    );

    function setLegend(series) {
      const signature = JSON.stringify(series);
      if (signature === lastColumnSignature) return;
      lastColumnSignature = signature;
      legend.replaceChildren(
        ...series.map((label, index) => {
          const swatch = h("span", {
            class: "bar-chart-legend-swatch",
            attrs: { "aria-hidden": "true" },
          });
          swatch.style.backgroundColor =
            SERIES_COLORS[index % SERIES_COLORS.length];
          return h(
            "span",
            { class: "bar-chart-legend-item", attrs: { role: "listitem" } },
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

    function updateStats(values) {
      const summary = summarize(values);
      const format = currentRelativeFrequency
        ? (value) => formatFrequency(value, language.locale)
        : (value) => formatNumber(value, language.locale);
      setText(stats[0].value, format(summary.total));
      setText(
        stats[1].value,
        summary.average === null ? "—" : format(summary.average),
      );
      setText(
        stats[2].value,
        summary.maximum === null ? "—" : format(summary.maximum),
      );
    }

    function applyLanguage() {
      setText(eyebrow, language.t("barChart.eyebrow"));
      setText(title, language.t("barChart.title"));
      setText(description, language.t("barChart.description"));
      setText(layoutLabel, language.t("barChart.layout"));
      setText(orderLabel, language.t("barChart.order"));
      order.element.setAttribute(
        "aria-label",
        language.t("barChart.orderAria"),
      );
      legend.setAttribute("aria-label", language.t("barChart.legendAria"));
      order.buttons.forEach((button) => {
        setText(button, language.t(`barChart.order.${button.dataset.order}`));
      });
      stats.forEach((stat) => {
        setText(stat.label, language.t(stat.labelKey));
      });
      setText(layoutValue, currentScopeLabel || "—");
      setText(
        note,
        language.t(
          currentRelativeFrequency
            ? "barChart.note.percentage"
            : "barChart.note.number",
          { scope: currentScopeLabel || "—" },
        ),
      );
    }

    function update({ chart, orderMode, scopeLabel }) {
      currentScopeLabel = scopeLabel;
      currentRelativeFrequency = chart.relativeFrequency;
      setLegend(chart.series);
      setOrder(orderMode);
      updateStats(flattenValues(chart));
      applyLanguage();
      chartHost.setAttribute("aria-label", language.t("barChart.title"));
      render(chartHost, chart, {
        ariaLabel: language.t("barChart.chartAria", {
          attributes: chart.series.length,
          scope: scopeLabel,
          targets: chart.groups.length,
        }),
        axisValue: language.t(
          currentRelativeFrequency
            ? "barChart.axisValue.percentage"
            : "barChart.axisValue.number",
        ),
        barAria: language.t("barChart.barAria"),
        description: language.t("barChart.chartDescription"),
        emptyLabel: language.t("barChart.empty"),
        locale: language.locale,
        relativeFrequency: currentRelativeFrequency,
      });
    }

    applyLanguage();
    return { applyLanguage, update };
  }

  barChartTool.view = { createView };
})(window);
