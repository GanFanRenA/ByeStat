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

  function getCellDisplayData(display, state) {
    if (!display || typeof display.values !== "function") return null;
    const result = display.values(state);
    const values = result?.cells;
    if (
      !Array.isArray(values) ||
      values.length !== state.rows.length ||
      values.some(
        (row) => !Array.isArray(row) || row.length !== state.columns.length,
      )
    ) {
      return null;
    }
    return { cells: values, summary: result.summary || null };
  }

  function resolveCellDisplay(display, value) {
    const resolved =
      typeof display.format === "function" ? display.format(value) : value;
    if (resolved === null || resolved === undefined || resolved === false) {
      return null;
    }
    if (typeof resolved === "object") {
      if (resolved.text === null || resolved.text === undefined) return null;
      return {
        label: String(resolved.label ?? resolved.text),
        text: String(resolved.text),
      };
    }
    return { label: String(resolved), text: String(resolved) };
  }

  function createCellDisplay(display, value, row, col) {
    const resolved = resolveCellDisplay(display, value);
    if (!resolved) return null;
    return h(
      "span",
      {
        class: "derived-cell-value",
        dataset: { derivedCell: display.id, row, col },
        attrs: { "aria-label": resolved.label },
        text: resolved.text,
      },
    );
  }

  function createSummaryDisplay(display, value) {
    if (!display || !value) return null;
    const resolved = resolveCellDisplay(display, value);
    if (!resolved) return null;
    return h(
      "span",
      {
        class: "derived-summary-value",
        dataset: { derivedSummary: display.id },
        attrs: { "aria-label": resolved.label },
        text: resolved.text,
      },
    );
  }

  function syncSummaryDisplay(cell, display, value) {
    const detail = cell.querySelector("[data-derived-summary]");
    const resolved =
      display && value ? resolveCellDisplay(display, value) : null;
    if (!resolved) {
      detail?.remove();
      return;
    }
    if (detail) {
      setText(detail, resolved.text);
      detail.setAttribute("aria-label", resolved.label);
      return;
    }
    const nextDetail = createSummaryDisplay(display, value);
    if (nextDetail) cell.append(nextDetail);
  }

  function syncCellDisplay(refs, state, display, displayData) {
    if (!displayData) return;
    refs.table
      .querySelectorAll("[data-derived-cell]")
      .forEach((cell) => {
        const resolved = resolveCellDisplay(
          display,
          displayData.cells[Number(cell.dataset.row)]?.[
            Number(cell.dataset.col)
          ],
        );
        if (!resolved) {
          cell.remove();
          return;
        }
        setText(cell, resolved.text);
        cell.setAttribute("aria-label", resolved.label);
      });
  }

  function createSummaryCell(
    kind,
    value,
    label,
    coordinates = {},
    display = null,
    displayValue = null,
  ) {
    return h(
      "td",
      {
        class: `margin-cell margin-${kind}`,
        dataset: { margin: kind, ...coordinates },
        attrs: { "aria-label": label },
      },
      h("span", { class: "margin-value", text: value }),
      createSummaryDisplay(display, displayValue),
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

  function renderSummaryRow(
    refs,
    state,
    summary,
    summaryData,
    display,
    displaySummary,
  ) {
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
          display,
          displaySummary?.columnTotals[col],
        ),
      );
    });
    footRow.append(
      createSummaryCell(
        "grand-total",
        formatSummaryValue(summary, summaryData.grandTotal),
        t("table.cell.grandTotalAria"),
        {},
        display,
        displaySummary?.grandTotal,
      ),
    );
    refs.tableFoot.append(footRow);
  }

  function syncSummary(refs, state, summary, display, displaySummary) {
    const summaryData = getSummaryData(summary, state);
    if (!summaryData) return;
    refs.table.querySelectorAll('[data-margin="row-total"]').forEach((cell) => {
      const row = Number(cell.dataset.row);
      setText(
        cell.firstElementChild,
        formatSummaryValue(summary, summaryData.rowTotals[row]),
      );
      syncSummaryDisplay(cell, display, displaySummary?.rowTotals[row]);
    });
    refs.table
      .querySelectorAll('[data-margin="column-total"]')
      .forEach((cell) => {
        const col = Number(cell.dataset.col);
        setText(
          cell.firstElementChild,
          formatSummaryValue(summary, summaryData.columnTotals[col]),
        );
        syncSummaryDisplay(
          cell,
          display,
          displaySummary?.columnTotals[col],
        );
      });
    const grandTotal = refs.table.querySelector('[data-margin="grand-total"]');
    if (grandTotal) {
      setText(
        grandTotal.firstElementChild,
        formatSummaryValue(summary, summaryData.grandTotal),
      );
      syncSummaryDisplay(grandTotal, display, displaySummary?.grandTotal);
    }
  }

  tableModule.summary = {
    createCellDisplay,
    createSummaryCell,
    createSummaryHeading,
    formatSummaryValue,
    getCellDisplayData,
    getSummaryData,
    renderSummaryRow,
    resolveSummaryLabel,
    syncCellDisplay,
    syncSummary,
  };
})(window);
