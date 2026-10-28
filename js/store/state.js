(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const STORAGE_KEY = "byestat-table-v1";
  const NUMBER_PATTERN = /^-?(?:\d+\.?\d*|\.\d+)$/;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getDefaultState() {
    return {
      cornerLabel: "项目 / 指标",
      columns: ["指标 A", "指标 B", "指标 C", "指标 D"],
      rows: [
        { label: "项目 1", values: ["12", "8", "24", "16"] },
        { label: "项目 2", values: ["18", "14", "20", "11"] },
        { label: "项目 3", values: ["9", "21", "15", "25"] },
        { label: "项目 4", values: ["22", "17", "13", "19"] },
      ],
    };
  }

  function columnName(index) {
    let value = index + 1;
    let result = "";

    while (value > 0) {
      const remainder = (value - 1) % 26;
      result = String.fromCharCode(65 + remainder) + result;
      value = Math.floor((value - 1) / 26);
    }

    return result;
  }

  function normalizeNumber(value) {
    const text = String(value ?? "")
      .trim()
      .replace(/[，。]/g, ".")
      .replace(/[−–—]/g, "-")
      .replace(/,/g, "");

    if (!NUMBER_PATTERN.test(text)) return "0";
    const withoutTrailingDot = text.endsWith(".") ? text.slice(0, -1) : text;
    return Number.isFinite(Number(withoutTrailingDot)) ? withoutTrailingDot : "0";
  }

  function normalizeState(candidate) {
    const fallback = getDefaultState();
    if (!candidate || typeof candidate !== "object") return fallback;

    const columns =
      Array.isArray(candidate.columns) && candidate.columns.length
        ? candidate.columns.map((label, index) => {
            const text = String(label ?? "").trim();
            return text || `指标 ${columnName(index)}`;
          })
        : fallback.columns;

    const sourceRows = Array.isArray(candidate.rows) ? candidate.rows : [];
    const rows = sourceRows.map((row, rowIndex) => ({
      label: String(row?.label ?? "").trim() || `项目 ${rowIndex + 1}`,
      values: columns.map((_, colIndex) =>
        normalizeNumber(row?.values?.[colIndex]),
      ),
    }));

    return {
      cornerLabel:
        String(candidate.cornerLabel ?? "").trim() || fallback.cornerLabel,
      columns,
      rows: rows.length ? rows : fallback.rows,
    };
  }

  function nextRowLabel(state) {
    const used = new Set(state.rows.map((row) => row.label));
    for (let index = 1; index < 10000; index += 1) {
      const candidate = `项目 ${index}`;
      if (!used.has(candidate)) return candidate;
    }
    return `项目 ${state.rows.length + 1}`;
  }

  function nextColumnLabel(state) {
    const used = new Set(state.columns);
    for (let index = 0; index < 702; index += 1) {
      const candidate = `指标 ${columnName(index)}`;
      if (!used.has(candidate)) return candidate;
    }
    return `指标 ${state.columns.length + 1}`;
  }

  ByeStat.storeState = {
    STORAGE_KEY,
    clone,
    columnName,
    getDefaultState,
    nextColumnLabel,
    nextRowLabel,
    normalizeNumber,
    normalizeState,
  };
})(window);
