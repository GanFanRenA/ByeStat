(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const tools = (ByeStat.tools = ByeStat.tools || {});
  const mosaicPlotTool = (tools.mosaicPlot = tools.mosaicPlot || {});
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  const {
    SERIES_COLORS,
    formatCellValue,
  } = mosaicPlotTool.calc;

  function svgElement(tag, attributes = {}, text = null) {
    const element = document.createElementNS(SVG_NAMESPACE, tag);
    Object.entries(attributes).forEach(([name, value]) => {
      element.setAttribute(name, String(value));
    });
    if (text !== null) element.textContent = text;
    return element;
  }

  function truncateLabel(label, limit) {
    const text = String(label);
    if (text.length <= limit) return text;
    return `${text.slice(0, Math.max(1, limit - 1))}…`;
  }

  function createValueTitle(cell, group, chart, options) {
    const value = formatCellValue(
      cell,
      options.relativeFrequency,
      options.locale,
    );
    return options.valueAria
      .replace("{target}", group.label)
      .replace("{attribute}", cell.label)
      .replace("{value}", value);
  }

  function appendCell(cell, group, chart, geometry, options) {
    const { height, width, x, y } = geometry;
    if (height <= 0 || width <= 0) return;

    const cellGroup = svgElement("g", { class: "mosaic-plot-cell" });
    const rect = svgElement("rect", {
      class: "mosaic-plot-area",
      fill: SERIES_COLORS[cell.index % SERIES_COLORS.length],
      height,
      width,
      x,
      y,
    });
    rect.append(
      svgElement(
        "title",
        {},
        createValueTitle(cell, group, chart, options),
      ),
    );
    cellGroup.append(rect);

    if (width >= 46 && height >= 18) {
      const value = formatCellValue(
        cell,
        options.relativeFrequency,
        options.locale,
      );
      const limit = Math.max(3, Math.floor(width / 6));
      const label = svgElement(
        "text",
        {
          class: "mosaic-plot-value",
          x: x + width / 2,
          y: y + height / 2 + 3,
          "text-anchor": "middle",
        },
        truncateLabel(value, limit),
      );
      cellGroup.append(label);
    }

    return cellGroup;
  }

  function appendTarget(
    group,
    chart,
    x,
    width,
    layout,
    options,
  ) {
    const { plotHeight, top } = layout;
    const groupElement = svgElement("g", {
      class: "mosaic-plot-target",
      "data-target-index": group.index,
    });
    let y = top;

    group.cells.forEach((cell, cellIndex) => {
      const remaining = top + plotHeight - y;
      const rawHeight = (cell.area / group.total) * plotHeight;
      const height = Math.max(0, Math.min(remaining, rawHeight));
      const geometry = { height, width, x, y };
      const cellElement = appendCell(
        cell,
        group,
        chart,
        geometry,
        options,
      );
      if (cellElement) groupElement.append(cellElement);
      y += height;

      if (cellIndex === group.cells.length - 1) {
        y = top + plotHeight;
      }
    });

    groupElement.append(
      svgElement("rect", {
        class: "mosaic-plot-target-outline",
        height: plotHeight,
        width,
        x,
        y: top,
      }),
    );

    const labelLimit = Math.max(4, Math.floor(width / 7));
    const category = svgElement(
      "text",
      {
        class: "mosaic-plot-target-label",
        x: x + width / 2,
        y: top - 14,
        "text-anchor": "middle",
      },
      truncateLabel(group.label, labelLimit),
    );
    category.setAttribute("aria-label", group.label);
    groupElement.append(category);
    return groupElement;
  }

  function formatDetails(chart, options) {
    return chart.groups
      .map(
        (group) =>
          `${group.label}: ${group.cells
            .map(
              (cell) =>
                `${cell.label} ${formatCellValue(
                  cell,
                  options.relativeFrequency,
                  options.locale,
                )}`,
            )
            .join(", ")}`,
      )
      .join("; ");
  }

  function createChart(chart, options) {
    const groups = chart.groups.filter((group) => group.total > 0);
    const margins = { bottom: 30, left: 26, right: 26, top: 54 };
    const width = Math.max(
      880,
      margins.left + margins.right + groups.length * 150,
    );
    const height = 470;
    const gap = groups.length > 1 ? 3 : 0;
    const plotHeight = height - margins.top - margins.bottom;
    const plotWidth = width - margins.left - margins.right;
    const availableWidth = plotWidth - gap * Math.max(0, groups.length - 1);
    const details = formatDetails(chart, options);
    const svg = svgElement("svg", {
      class: "mosaic-plot-svg",
      height,
      preserveAspectRatio: "xMinYMin meet",
      role: "img",
      viewBox: `0 0 ${width} ${height}`,
      width,
      "aria-label": options.ariaLabel,
    });
    svg.style.width = `${width}px`;
    svg.style.minWidth = "100%";
    svg.append(
      svgElement("title", {}, options.ariaLabel),
      svgElement(
        "desc",
        {},
        options.description.replace("{details}", details),
      ),
      svgElement(
        "text",
        {
          class: "mosaic-plot-area-title",
          x: margins.left,
          y: 17,
        },
        options.areaTitle,
      ),
      svgElement("line", {
        class: "mosaic-plot-area-rule",
        x1: margins.left,
        x2: width - margins.right,
        y1: 27,
        y2: 27,
      }),
    );

    let x = margins.left;
    groups.forEach((group) => {
      const groupWidth = (group.total / chart.grandTotal) * availableWidth;
      svg.append(
        appendTarget(
          group,
          chart,
          x,
          groupWidth,
          {
            plotHeight,
            plotWidth,
            top: margins.top,
          },
          options,
        ),
      );
      x += groupWidth + gap;
    });
    return svg;
  }

  function render(host, chart, options) {
    if (!chart.groups.length || chart.grandTotal <= 0) {
      host.replaceChildren(document.createTextNode(options.emptyLabel));
      host.classList.add("is-empty");
      return;
    }
    host.classList.remove("is-empty");
    host.replaceChildren(createChart(chart, options));
  }

  mosaicPlotTool.chart = { render };
})(window);
