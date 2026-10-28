(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const tools = (ByeStat.tools = ByeStat.tools || {});
  const barChartTool = (tools.barChart = tools.barChart || {});
  const ORDER_MODES = ["source", "desc", "asc"];
  const SERIES_COLORS = [
    "#1c7f6d",
    "#4f8fbe",
    "#d09a3f",
    "#b86661",
    "#6f78b8",
    "#5d9b70",
    "#b2769d",
    "#77858a",
  ];
  const { calculate, normalizeScope, toNumber } = ByeStat.frequency;

  function sum(values) {
    return values.reduce((total, value) => total + toNumber(value), 0);
  }

  function buildChart(state, requestedScope, relativeFrequency) {
    const scope = normalizeScope(requestedScope);
    const frequency = relativeFrequency ? calculate(state, scope) : null;
    const cellValue = (row, col) =>
      relativeFrequency
        ? (frequency.cells[row]?.[col]?.result ?? 0) * 100
        : toNumber(state.rows[row]?.values[col]);

    if (scope === "column") {
      return {
        groups: state.columns.map((label, col) => ({
          index: col,
          label,
          total: sum(state.rows.map((row) => row.values[col])),
          values: state.rows.map((_, row) => cellValue(row, col)),
        })),
        orientation: "column",
        relativeFrequency,
        scope,
        series: state.rows.map((row) => row.label),
      };
    }

    return {
      groups: state.rows.map((row, rowIndex) => ({
        index: rowIndex,
        label: row.label,
        total: sum(row.values),
        values: state.columns.map((_, col) => cellValue(rowIndex, col)),
      })),
      orientation: "row",
      relativeFrequency,
      scope,
      series: state.columns.slice(),
    };
  }

  function sortChart(chart, order) {
    if (!ORDER_MODES.includes(order) || order === "source") return chart;
    const direction = order === "desc" ? -1 : 1;
    return {
      ...chart,
      groups: chart.groups
        .map((group, index) => ({ group, index }))
        .sort(
          (left, right) =>
            (left.group.total - right.group.total) * direction ||
            left.index - right.index,
        )
        .map(({ group }) => group),
    };
  }

  function flattenValues(chart) {
    return chart.groups.flatMap((group) => group.values);
  }

  function summarize(values) {
    if (!values.length) {
      return { average: null, maximum: null, total: 0 };
    }
    const summary = values.reduce(
      (result, value) => ({
        maximum: Math.max(result.maximum, value),
        total: result.total + value,
      }),
      { maximum: -Infinity, total: 0 },
    );
    return {
      average: summary.total / values.length,
      maximum: summary.maximum,
      total: summary.total,
    };
  }

  function niceStep(span, targetTicks) {
    const rough = span / Math.max(1, targetTicks - 1);
    const power = 10 ** Math.floor(Math.log10(rough));
    const fraction = rough / power;
    const niceFraction =
      fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
    return niceFraction * power;
  }

  function roundTick(value) {
    return Number(value.toPrecision(12));
  }

  function createScale(values) {
    let minimum = 0;
    let maximum = 0;
    values.forEach((value) => {
      if (!Number.isFinite(value)) return;
      minimum = Math.min(minimum, value);
      maximum = Math.max(maximum, value);
    });
    if (minimum === maximum) maximum = minimum === 0 ? 1 : minimum + 1;

    const step = niceStep(maximum - minimum, 6);
    const scaleMinimum = roundTick(Math.floor(minimum / step) * step);
    let scaleMaximum = roundTick(Math.ceil(maximum / step) * step);
    if (scaleMaximum === scaleMinimum) scaleMaximum = scaleMinimum + step;

    const ticks = [];
    const count = Math.round((scaleMaximum - scaleMinimum) / step);
    for (let index = 0; index <= Math.min(count, 20); index += 1) {
      ticks.push(roundTick(scaleMinimum + index * step));
    }
    if (ticks.at(-1) !== scaleMaximum) ticks.push(scaleMaximum);
    return {
      maximum: scaleMaximum,
      minimum: scaleMinimum,
      step,
      ticks,
    };
  }

  function normalizeNumber(value) {
    if (!Number.isFinite(value)) return 0;
    const normalized = Number(value.toPrecision(15));
    return Object.is(normalized, -0) ? 0 : normalized;
  }

  function formatNumber(value, locale) {
    return new Intl.NumberFormat(locale || "zh-CN", {
      maximumFractionDigits: 2,
    }).format(normalizeNumber(value));
  }

  function formatFrequency(value, locale) {
    return `${formatNumber(value, locale)}%`;
  }

  function formatAxisNumber(value, locale, relativeFrequency) {
    const formatted = new Intl.NumberFormat(locale || "zh-CN", {
      maximumFractionDigits: 1,
      notation: "compact",
    }).format(normalizeNumber(value));
    return relativeFrequency ? `${formatted}%` : formatted;
  }

  barChartTool.calc = {
    ORDER_MODES,
    SERIES_COLORS,
    buildChart,
    createScale,
    flattenValues,
    formatAxisNumber,
    formatFrequency,
    formatNumber,
    sortChart,
    summarize,
  };
})(window);
