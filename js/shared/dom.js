(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});

  function appendChildren(element, children) {
    children.flat(Infinity).forEach((child) => {
      if (child === null || child === undefined || child === false) return;
      element.append(
        child instanceof Node ? child : document.createTextNode(String(child)),
      );
    });
  }

  function h(tag, properties = {}, ...children) {
    const element = document.createElement(tag);

    Object.entries(properties || {}).forEach(([key, value]) => {
      if (value === null || value === undefined) return;

      if (key === "class") {
        element.className = value;
      } else if (key === "text") {
        element.textContent = value;
      } else if (key === "dataset") {
        Object.assign(element.dataset, value);
      } else if (key === "attrs") {
        Object.entries(value).forEach(([name, attributeValue]) => {
          element.setAttribute(name, String(attributeValue));
        });
      } else if (key.startsWith("on") && typeof value === "function") {
        element.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key in element) {
        element[key] = value;
      } else if (value !== false) {
        element.setAttribute(key, String(value));
      }
    });

    appendChildren(element, children);
    return element;
  }

  function icon(paths, viewBox = "0 0 24 24") {
    const namespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(namespace, "svg");
    svg.setAttribute("viewBox", viewBox);
    svg.setAttribute("aria-hidden", "true");

    paths.forEach((pathData) => {
      const path = document.createElementNS(namespace, "path");
      path.setAttribute("d", pathData);
      svg.append(path);
    });

    return svg;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function setText(element, value) {
    element.textContent = String(value);
  }

  ByeStat.dom = { appendChildren, clone, h, icon, setText };
})(window);
