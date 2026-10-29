(function () {
  "use strict";

  var ICONS = {
    arrow: "M2 8h12M10 4l4 4-4 4",
    back: "M14 8H2M6 4L2 8l4 4",
    close: "M4 4l8 8M12 4L4 12",
    plus: "M8 3v10M3 8h10"
  };

  function iconSvg(name) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("fill", "none");
    svg.setAttribute("aria-hidden", "true");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", ICONS[name] || ICONS.arrow);
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
    return svg;
  }

  function control(tag) {
    var el = document.createElement(tag);
    el.className = "jtb-control";
    return el;
  }

  class JtbText extends HTMLElement {}

  class JtbIcon extends HTMLElement {
    connectedCallback() {
      if (this._built) return;
      this._built = true;
      this.setAttribute("aria-hidden", "true");
      this.appendChild(iconSvg(this.getAttribute("name")));
    }
  }

  class JtbDivider extends HTMLElement {}

  class JtbCounter extends HTMLElement {
    static get observedAttributes() { return ["value", "noun"]; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { this.render(); }
    render() {
      var value = this.getAttribute("value") || "0";
      var noun = this.getAttribute("noun") || "item";
      var count = Number(value);
      var word = noun;
      if (count !== 1 && word.slice(-1) !== "s") word += "s";
      this.textContent = value + " " + word;
    }
  }

  class JtbButton extends HTMLElement {
    static get observedAttributes() { return ["disabled", "aria-pressed"]; }
    connectedCallback() {
      if (this._built) return;
      this._built = true;
      var button = control("button");
      button.type = "button";
      button.textContent = this.textContent.trim();
      this.textContent = "";
      this._control = button;
      this.appendChild(button);
      this.sync();
    }
    attributeChangedCallback() { this.sync(); }
    sync() {
      if (!this._control) return;
      this._control.disabled = this.hasAttribute("disabled");
      if (this.hasAttribute("aria-pressed")) this._control.setAttribute("aria-pressed", this.getAttribute("aria-pressed"));
      else this._control.removeAttribute("aria-pressed");
    }
  }

  class JtbTag extends JtbButton {}

  class JtbLink extends HTMLElement {
    static get observedAttributes() { return ["disabled"]; }
    connectedCallback() {
      if (this._built) return;
      this._built = true;
      var label = this.textContent.trim();
      this.textContent = "";
      var disabled = this.hasAttribute("disabled");
      var href = this.getAttribute("href");
      var el = control(!disabled && href ? "a" : "button");
      if (el.tagName === "A") el.href = href;
      else el.type = "button";
      el.textContent = label;
      if (this.getAttribute("variant") === "onward") {
        var icon = document.createElement("jtb-icon");
        icon.setAttribute("name", "arrow");
        el.appendChild(icon);
      }
      if (disabled) {
        el.setAttribute("aria-disabled", "true");
        el.tabIndex = -1;
        el.disabled = el.tagName === "BUTTON";
      }
      this._control = el;
      this.appendChild(el);
    }
  }

  customElements.define("jtb-text", JtbText);
  customElements.define("jtb-icon", JtbIcon);
  customElements.define("jtb-divider", JtbDivider);
  customElements.define("jtb-counter", JtbCounter);
  customElements.define("jtb-button", JtbButton);
  customElements.define("jtb-tag", JtbTag);
  customElements.define("jtb-link", JtbLink);
})();
