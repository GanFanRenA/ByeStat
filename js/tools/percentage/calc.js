(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const tools = (ByeStat.tools = ByeStat.tools || {});
  const percentageTool = (tools.percentage = tools.percentage || {});
  const { calculate, formatOperand } = ByeStat.frequency;

  function formatExpression(expression) {
    const denominator = formatOperand(expression.denominator);
    const result = Object.is(expression.result, -0) ? 0 : expression.result;
    const formattedResult = Number.isFinite(result)
      ? result.toFixed(4)
      : "—";
    return `/ ${denominator} = ${formattedResult}`;
  }

  percentageTool.calc = { calculate, formatExpression };
})(window);
