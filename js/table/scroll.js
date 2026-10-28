(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const tableModule = (ByeStat.table = ByeStat.table || {});
  const EDGE_PADDING = 2;

  function getSafeTop(refs, viewport, target) {
    if (target.closest("thead")) return viewport.top + EDGE_PADDING;
    const header = refs.tableHead.querySelector("th");
    return header
      ? Math.max(viewport.top, header.getBoundingClientRect().bottom) + EDGE_PADDING
      : viewport.top + EDGE_PADDING;
  }

  function getSafeLeft(refs, viewport, target) {
    if (target.matches("tbody th, thead th:first-child")) {
      return viewport.left + EDGE_PADDING;
    }
    const rowHeader = refs.tableBody.querySelector("th");
    return rowHeader
      ? Math.max(viewport.left, rowHeader.getBoundingClientRect().right) +
          EDGE_PADDING
      : viewport.left + EDGE_PADDING;
  }

  function getSafeRight(refs, viewport, scrollbarWidth) {
    let right = viewport.right - scrollbarWidth - EDGE_PADDING;
    const marginCell = refs.tableBody.querySelector(".margin-row-total");
    if (!marginCell || global.getComputedStyle(marginCell).position !== "sticky") {
      return right;
    }
    const marginLeft = marginCell.getBoundingClientRect().left;
    return Math.min(right, marginLeft - EDGE_PADDING);
  }

  function getSafeBottom(refs, viewport, scrollbarHeight) {
    const bottom = viewport.bottom - scrollbarHeight - EDGE_PADDING;
    const footCell = refs.tableFoot.querySelector("td");
    if (!footCell || global.getComputedStyle(footCell).position !== "sticky") {
      return bottom;
    }
    const footTop = footCell.getBoundingClientRect().top;
    return Math.min(bottom, footTop - EDGE_PADDING);
  }

  function revealCell(refs, target) {
    const scroller = refs.sheetScroll;
    const cell = target?.closest?.("th, td");
    if (!scroller || !cell || !cell.isConnected) return;

    const viewport = scroller.getBoundingClientRect();
    const rect = cell.getBoundingClientRect();
    const scrollbarWidth = Math.max(0, scroller.offsetWidth - scroller.clientWidth);
    const scrollbarHeight = Math.max(0, scroller.offsetHeight - scroller.clientHeight);
    const safe = {
      top: getSafeTop(refs, viewport, cell),
      right: getSafeRight(refs, viewport, scrollbarWidth),
      bottom: getSafeBottom(refs, viewport, scrollbarHeight),
      left: getSafeLeft(refs, viewport, cell),
    };
    let left = scroller.scrollLeft;
    let top = scroller.scrollTop;

    if (rect.right > safe.right) left += rect.right - safe.right;
    else if (rect.left < safe.left) left -= safe.left - rect.left;
    if (rect.bottom > safe.bottom) top += rect.bottom - safe.bottom;
    else if (rect.top < safe.top) top -= safe.top - rect.top;
    if (Math.abs(left - scroller.scrollLeft) < 1) left = scroller.scrollLeft;
    if (Math.abs(top - scroller.scrollTop) < 1) top = scroller.scrollTop;
    if (left !== scroller.scrollLeft || top !== scroller.scrollTop) {
      scroller.scrollTo({ left, top, behavior: "auto" });
    }
  }

  function revealSelection(refs, selection) {
    const input = refs.table.querySelector(
      `[data-cell-kind="number"][data-row="${selection.row}"][data-col="${selection.col}"]`,
    );
    if (input) revealCell(refs, input);
  }

  tableModule.scroll = { revealCell, revealSelection };
})(window);
