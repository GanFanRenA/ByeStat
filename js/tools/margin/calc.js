(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const tools = (ByeStat.tools = ByeStat.tools || {});
  const marginTool = (tools.margin = tools.margin || {});

  function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function sumRow(row) {
    return row.values.reduce((total, value) => total + toNumber(value), 0);
  }

  function calculate(state) {
    const rowTotals = state.rows.map(sumRow);
    const columnTotals = state.columns.map((label, col) =>
      state.rows.reduce(
        (total, row) => total + toNumber(row.values[col]),
        0,
      ),
    );
    const grandTotal = rowTotals.reduce((total, value) => total + value, 0);
    return { columnTotals, grandTotal, rowTotals };
  }

  function formatTotal(value) {
    if (!Number.isFinite(value)) return "0";
    const normalized = Number(value.toPrecision(15));
    return String(Object.is(normalized, -0) ? 0 : normalized);
  }

  marginTool.calc = { calculate, formatTotal };
})(window);
