(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const tools = (ByeStat.tools = ByeStat.tools || {});
  const mosaicPlotTool = (tools.mosaicPlot = tools.mosaicPlot || {});
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

  function createCell(index, label, raw, share) {
    return {
      area: Math.abs(raw),
      index,
      label,
      raw,
      share,
    };
  }

  function sumAreas(cells) {
    return cells.reduce((total, cell) => total + cell.area, 0);
  }

  function buildMosaic(state, requestedScope) {
    const scope = normalizeScope(requestedScope);
    const frequency = calculate(state, scope);

    if (scope === "column") {
      const groups = state.columns.map((label, colIndex) => {
        const cells = state.rows.map((row, rowIndex) =>
          createCell(
            rowIndex,
            row.label,
            toNumber(row.values[colIndex]),
            frequency.cells[rowIndex]?.[colIndex]?.result ?? null,
          ),
        );
        return {
          cells,
          index: colIndex,
          label,
          total: sumAreas(cells),
        };
      });
      return {
        grandTotal: groups.reduce((total, group) => total + group.total, 0),
        groups,
        orientation: "column",
        scope,
        series: state.rows.map((row) => row.label),
      };
    }

    const groups = state.rows.map((row, rowIndex) => {
      const cells = state.columns.map((label, colIndex) =>
        createCell(
          colIndex,
          label,
          toNumber(row.values[colIndex]),
          frequency.cells[rowIndex]?.[colIndex]?.result ?? null,
        ),
      );
      return {
        cells,
        index: rowIndex,
        label: row.label,
        total: sumAreas(cells),
      };
    });
    return {
      grandTotal: groups.reduce((total, group) => total + group.total, 0),
      groups,
      orientation: "row",
      scope,
      series: state.columns.slice(),
    };
  }

  function sortMosaic(chart, order) {
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

  function summarize(chart) {
    return {
      attributes: chart.series.length,
      blocks: chart.groups.reduce(
        (total, group) =>
          total + group.cells.filter((cell) => cell.area > 0).length,
        0,
      ),
      targets: chart.groups.length,
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
    if (value === null || !Number.isFinite(value)) return "—";
    return `${formatNumber(value * 100, locale)}%`;
  }

  function formatCellValue(cell, relativeFrequency, locale) {
    return relativeFrequency
      ? formatFrequency(cell.share, locale)
      : formatNumber(cell.raw, locale);
  }

  mosaicPlotTool.calc = {
    ORDER_MODES,
    SERIES_COLORS,
    buildMosaic,
    formatCellValue,
    formatFrequency,
    formatNumber,
    sortMosaic,
    summarize,
  };
})(window);
