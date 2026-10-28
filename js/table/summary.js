(function (global) {
  "use strict";

  const ByeStat = global.ByeStat;
  const { h, setText } = ByeStat.dom;
  const { columnName } = ByeStat.storeState;
  const tableModule = (ByeStat.table = ByeStat.table || {});

  function getSummaryData(summary, state) {
    if (!summary || typeof summary.values !== "function") return null;
    const values = summary.values(state);
    if (
      !values ||
      !Array.isArray(values.rowTotals) ||
      !Array.isArray(values.columnTotals)
    ) {
      return null;
    }
    return values;
  }

  function formatSummaryValue(summary, value) {
    return typeof summary.format === "function"
      ? summary.format(value)
      : String(value ?? "");
  }

  function createSummaryCell(kind, value, label, coordinates = {}) {
    return h(
      "td",
      {
        class: `margin-cell margin-${kind}`,
        dataset: { margin: kind, ...coordinates },
        attrs: { "aria-label": label },
      },
      h("span", { class: "margin-value", text: value }),
    );
  }

  function createSummaryHeading(label, edge) {
    return h(
      "th",
      {
        scope: edge === "column" ? "col" : "row",
        class: "margin-heading-cell",
        dataset: { margin: `${edge}-heading` },
      },
      h("span", { class: "margin-heading-label", text: label }),
    );
  }

  function resolveSummaryLabel(label, language, fallbackKey) {
    const resolved = typeof label === "function" ? label(language) : label;
    return resolved || language.t(fallbackKey);
  }

  function renderSummaryRow(refs, state, summary, summaryData) {
    if (!summaryData) return;
    const t = refs.language.t;
    const footRow = h(
      "tr",
      { class: "margin-foot-row" },
      createSummaryHeading(
        resolveSummaryLabel(
          summary.columnLabel,
          refs.language,
          "margin.columnTotal",
        ),
        "row",
      ),
    );
    state.columns.forEach((label, col) => {
      footRow.append(
        createSummaryCell(
          "column-total",
          formatSummaryValue(summary, summaryData.columnTotals[col]),
          t("table.cell.columnTotalAria", { column: columnName(col) }),
          { col },
        ),
      );
    });
    footRow.append(
      createSummaryCell(
        "grand-total",
        formatSummaryValue(summary, summaryData.grandTotal),
        t("table.cell.grandTotalAria"),
      ),
    );
    refs.tableFoot.append(footRow);
  }

  function syncSummary(refs, state, summary) {
    const summaryData = getSummaryData(summary, state);
    if (!summaryData) return;
    refs.table.querySelectorAll('[data-margin="row-total"]').forEach((cell) => {
      const row = Number(cell.dataset.row);
      setText(
        cell.firstElementChild,
        formatSummaryValue(summary, summaryData.rowTotals[row]),
      );
    });
    refs.table
      .querySelectorAll('[data-margin="column-total"]')
      .forEach((cell) => {
        const col = Number(cell.dataset.col);
        setText(
          cell.firstElementChild,
          formatSummaryValue(summary, summaryData.columnTotals[col]),
        );
      });
    const grandTotal = refs.table.querySelector('[data-margin="grand-total"]');
    if (grandTotal) {
      setText(
        grandTotal.firstElementChild,
        formatSummaryValue(summary, summaryData.grandTotal),
      );
    }
  }

  tableModule.summary = {
    createSummaryCell,
    createSummaryHeading,
    formatSummaryValue,
    getSummaryData,
    renderSummaryRow,
    resolveSummaryLabel,
    syncSummary,
  };
})(window);
