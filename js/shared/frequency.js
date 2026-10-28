(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const SCOPES = ["total", "row", "column"];

  function normalizeScope(value) {
    return SCOPES.includes(value) ? value : "total";
  }

  function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function sum(values) {
    return values.reduce((total, value) => total + toNumber(value), 0);
  }

  function createExpression(numerator, denominator) {
    return {
      denominator,
      numerator,
      result: denominator === 0 ? null : numerator / denominator,
    };
  }

  function getTotals(state) {
    const rowTotals = state.rows.map((row) => sum(row.values));
    const columnTotals = state.columns.map((_, col) =>
      sum(state.rows.map((row) => row.values[col])),
    );
    return {
      columnTotals,
      grandTotal: rowTotals.reduce((total, value) => total + value, 0),
      rowTotals,
    };
  }

  function getDenominator(totals, scope, row, col) {
    if (scope === "row") return totals.rowTotals[row];
    if (scope === "column") return totals.columnTotals[col];
    return totals.grandTotal;
  }

  function createSummary(totals) {
    const { columnTotals, grandTotal, rowTotals } = totals;
    return {
      columnTotals: columnTotals.map((value) =>
        createExpression(value, grandTotal),
      ),
      grandTotal: createExpression(grandTotal, grandTotal),
      rowTotals: rowTotals.map((value) => createExpression(value, grandTotal)),
    };
  }

  function calculate(state, requestedScope) {
    const scope = normalizeScope(requestedScope);
    const totals = getTotals(state);
    const cells = state.rows.map((row, rowIndex) =>
      row.values.map((value, colIndex) =>
        createExpression(
          toNumber(value),
          getDenominator(totals, scope, rowIndex, colIndex),
        ),
      ),
    );
    return {
      scope,
      summary: scope === "total" ? createSummary(totals) : null,
      cells,
    };
  }

  function formatOperand(value) {
    if (!Number.isFinite(value)) return "0";
    const normalized = Number(value.toPrecision(15));
    return String(Object.is(normalized, -0) ? 0 : normalized);
  }

  ByeStat.frequency = {
    SCOPES,
    calculate,
    formatOperand,
    normalizeScope,
    toNumber,
  };
})(window);
