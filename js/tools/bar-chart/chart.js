(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const tools = (ByeStat.tools = ByeStat.tools || {});
  const barChartTool = (tools.barChart = tools.barChart || {});
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  const {
    SERIES_COLORS,
    createScale,
    flattenValues,
    formatAxisNumber,
    formatFrequency,
    formatNumber,
  } = barChartTool.calc;

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

  function formatValue(value, options) {
    return options.relativeFrequency
      ? formatFrequency(value, options.locale)
      : formatNumber(value, options.locale);
  }

  function appendGrid(svg, layout, scale, options) {
    const { left, plotHeight, plotWidth, top } = layout;
    scale.ticks.forEach((tick) => {
      const y =
        top +
        ((scale.maximum - tick) / (scale.maximum - scale.minimum)) *
          plotHeight;
      svg.append(
        svgElement("line", {
          class: tick === 0 ? "bar-chart-baseline" : "bar-chart-grid",
          x1: left,
          x2: left + plotWidth,
          y1: y,
          y2: y,
        }),
        svgElement(
          "text",
          {
            class: "bar-chart-tick",
            x: left - 14,
            y: y + 4,
            "text-anchor": "end",
          },
          formatAxisNumber(tick, options.locale, options.relativeFrequency),
        ),
      );
    });
    svg.append(
      svgElement(
        "text",
        {
          class: "bar-chart-axis-title",
          x: left,
          y: 13,
        },
        options.axisValue,
      ),
    );
  }

  function appendGroup(svg, chart, group, groupIndex, layout, scale, options) {
    const { left, plotHeight, plotWidth, top } = layout;
    const slot = plotWidth / Math.max(1, chart.groups.length);
    const seriesCount = chart.series.length;
    const gap = 3;
    const available = slot * 0.76;
    const barWidth = Math.max(
      5,
      Math.min(28, (available - gap * Math.max(0, seriesCount - 1)) / seriesCount),
    );
    const groupWidth =
      barWidth * seriesCount + gap * Math.max(0, seriesCount - 1);
    const centerX = left + slot * groupIndex + slot / 2;
    const startX = centerX - groupWidth / 2;
    const range = scale.maximum - scale.minimum;
    const zeroY = top + ((scale.maximum - 0) / range) * plotHeight;
    const element = svgElement("g", { class: "bar-chart-column" });

    group.values.forEach((value, seriesIndex) => {
      const valueY =
        top + ((scale.maximum - value) / range) * plotHeight;
      const rawHeight = Math.abs(valueY - zeroY);
      const height = value === 0 ? 0 : Math.max(2, rawHeight);
      const x = startX + seriesIndex * (barWidth + gap);
      const y = value >= 0 ? zeroY - height : zeroY;
      const bar = svgElement("g", { class: "bar-chart-bar-group" });
      const valueText = formatValue(value, options);
      const title = svgElement(
        "title",
        {},
        options.barAria
          .replace("{group}", group.label)
          .replace("{series}", chart.series[seriesIndex])
          .replace("{value}", valueText),
      );
      if (height > 0) {
        bar.append(
          svgElement("rect", {
            class: "bar-chart-bar",
            fill: SERIES_COLORS[seriesIndex % SERIES_COLORS.length],
            height,
            rx: Math.min(5, barWidth / 4),
            width: barWidth,
            x,
            y,
          }),
        );
      }
      const valueLabelY =
        value >= 0
          ? Math.max(12, y - 7)
          : Math.min(top + plotHeight - 4, y + height + 15);
      bar.append(
        svgElement(
          "text",
          {
            class: "bar-chart-value",
            x: x + barWidth / 2,
            y: valueLabelY,
            "text-anchor": "middle",
          },
          valueText,
        ),
      );
      bar.append(title);
      element.append(bar);
    });

    const labelLimit = Math.max(6, Math.floor(slot / 10));
    const category = svgElement(
      "text",
      {
        class: "bar-chart-category",
        x: centerX,
        y: top + plotHeight + 28,
        "text-anchor": "middle",
      },
      truncateLabel(group.label, labelLimit),
    );
    category.append(svgElement("title", {}, group.label));
    element.append(category);
    svg.append(element);
  }

  function createChart(chart, options) {
    const margins = { bottom: 72, left: 72, right: 24, top: 38 };
    const seriesCount = Math.max(1, chart.series.length);
    const groupSlot = Math.max(112, seriesCount * 32 + 36);
    const groupCount = Math.max(1, chart.groups.length);
    const width = Math.max(
      760,
      margins.left + margins.right + groupSlot * groupCount,
    );
    const height = 400;
    const plotWidth = width - margins.left - margins.right;
    const plotHeight = height - margins.top - margins.bottom;
    const scale = createScale(flattenValues(chart));
    const details = chart.groups
      .map(
        (group) =>
          `${group.label}: ${group.values
            .map(
              (value, index) =>
                `${chart.series[index]} ${formatValue(value, options)}`,
            )
            .join(", ")}`,
      )
      .join("; ");
    const svg = svgElement("svg", {
      class: "bar-chart-svg",
      height,
      preserveAspectRatio: "xMidYMin meet",
      role: "img",
      viewBox: `0 0 ${width} ${height}`,
      width,
      "aria-label": options.ariaLabel,
    });
    svg.style.width = `${width}px`;
    svg.style.minWidth = "100%";
    svg.append(
      svgElement("title", {}, options.ariaLabel),
      svgElement("desc", {}, options.description.replace("{details}", details)),
    );
    const layout = {
      left: margins.left,
      plotHeight,
      plotWidth,
      top: margins.top,
    };
    appendGrid(svg, layout, scale, options);
    chart.groups.forEach((group, index) => {
      appendGroup(svg, chart, group, index, layout, scale, options);
    });
    return svg;
  }

  function render(host, chart, options) {
    if (!chart.groups.length) {
      host.replaceChildren(document.createTextNode(options.emptyLabel));
      host.classList.add("is-empty");
      return;
    }
    host.classList.remove("is-empty");
    host.replaceChildren(createChart(chart, options));
  }

  barChartTool.chart = { render };
})(window);
