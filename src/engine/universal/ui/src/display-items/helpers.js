/* global window document console PROCEED_DATA */

export function appendElem(parent, type, attributes) {
  let elem = document.createElement(type);
  if (parent) {
    parent.appendChild(elem);
  }
  if (attributes) {
    Object.keys(attributes).forEach(function (key) {
      elem.setAttribute(key, attributes[key]);
    });
  }
  return elem;
}
