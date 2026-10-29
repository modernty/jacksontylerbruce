(function () {
  "use strict";

  var ORIGIN_ID = "origin:tyler";
  var PLACEHOLDER = "NEEDS TYLER";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var stage = document.getElementById("stage");
  var edgesEl = document.getElementById("edges");
  var pointsEl = document.getElementById("points");
  var detail = document.getElementById("detail");
  var statusEl = document.getElementById("status");

  var camera = { yaw: 0.55, pitch: 0.22, distance: 8.2, fov: 0.86 };
  var rest = { yaw: 0.55, pitch: 0.22 };
  var map = null;
  var nodes = [];
  var byId = {};
  var selected = null;
  var dragging = false;
  var moved = 0;
  var last = null;

  function publishText(value) {
    if (typeof value !== "string") return "";
    if (value.indexOf(PLACEHOLDER) !== -1) return "";
    return value.trim();
  }

  function isPublic(node) {
    return !!(node && node.visible !== false && node.confidential !== true && node.pos && node.pos.length === 3);
  }

  function kindLabel(type) {
    return {
      origin: "Origin",
      project: "Project",
      idea: "Idea",
      tool: "Tool",
      client: "Client",
      discipline: "Discipline"
    }[type] || type || "";
  }

  function basis(yaw, pitch, distance) {
    var cp = Math.cos(pitch);
    var sp = Math.sin(pitch);
    var cy = Math.cos(yaw);
    var sy = Math.sin(yaw);
    var eye = [distance * sy * cp, distance * sp, distance * cy * cp];
    var forward = [-eye[0] / distance, -eye[1] / distance, -eye[2] / distance];
    var up = [0, 1, 0];
    var right = [
      forward[1] * up[2] - forward[2] * up[1],
      forward[2] * up[0] - forward[0] * up[2],
      forward[0] * up[1] - forward[1] * up[0]
    ];
    var rl = Math.hypot(right[0], right[1], right[2]) || 1;
    right = [right[0] / rl, right[1] / rl, right[2] / rl];
    up = [
      right[1] * forward[2] - right[2] * forward[1],
      right[2] * forward[0] - right[0] * forward[2],
      right[0] * forward[1] - right[1] * forward[0]
    ];
    return { eye: eye, right: right, up: up, forward: forward };
  }

  function project(pos, width, height) {
    var frame = basis(camera.yaw, camera.pitch, camera.distance);
    var dx = pos[0] - frame.eye[0];
    var dy = pos[1] - frame.eye[1];
    var dz = pos[2] - frame.eye[2];
    var x = dx * frame.right[0] + dy * frame.right[1] + dz * frame.right[2];
    var y = dx * frame.up[0] + dy * frame.up[1] + dz * frame.up[2];
    var z = dx * frame.forward[0] + dy * frame.forward[1] + dz * frame.forward[2];
    var scale = (height * 0.5) / Math.tan(camera.fov * 0.5);
    return {
      x: width * 0.5 + (x / z) * scale,
      y: height * 0.5 - (y / z) * scale,
      z: z
    };
  }

  function readNodeParam() {
    return new URLSearchParams(window.location.search).get("node");
  }

  function writeNodeParam(id) {
    var url = new URL(window.location.href);
    if (id) url.searchParams.set("node", id);
    else url.searchParams.delete("node");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  function relations(id) {
    var rank = { client: 0, idea: 1, tool: 2, discipline: 3, manual: 4, semantic: 5 };
    var ranked = (map.edges || []).filter(function (edge) {
      return edge.from === id || edge.to === id;
    }).map(function (edge) {
      var otherId = edge.from === id ? edge.to : edge.from;
      var other = byId[otherId];
      return other ? { edge: edge, other: other } : null;
    }).filter(Boolean).sort(function (a, b) {
      var ra = rank[a.edge.kind] == null ? 9 : rank[a.edge.kind];
      var rb = rank[b.edge.kind] == null ? 9 : rank[b.edge.kind];
      return ra - rb || (b.edge.weight || 0) - (a.edge.weight || 0);
    });
    var explicit = ranked.filter(function (item) { return item.edge.kind !== "semantic"; });
    return (explicit.length ? explicit : ranked).slice(0, 4);
  }

  function setText(el, value) {
    var text = publishText(value);
    el.textContent = text;
    el.hidden = !text;
  }

  function renderDetail(node) {
    if (!node) {
      detail.hidden = true;
      return;
    }
    document.getElementById("detail-kind").textContent = kindLabel(node.type);
    document.getElementById("detail-label").textContent = node.label || node.id;
    var meta = [publishText(node.year), publishText(node.role), publishText(node.status)].filter(Boolean);
    if (node.archived) meta.push("Archived");
    setText(document.getElementById("detail-meta"), meta.join(" · "));
    setText(document.getElementById("detail-summary"), node.summary);
    setText(document.getElementById("detail-patterns"), node.patterns);
    var list = document.getElementById("detail-relations");
    list.replaceChildren();
    relations(node.id).forEach(function (item) {
      var li = document.createElement("li");
      li.textContent = publishText(item.edge.reason) || item.other.label;
      list.appendChild(li);
    });
    detail.hidden = false;
  }

  function paint() {
    var width = stage.clientWidth;
    var height = stage.clientHeight;
    var placed = nodes.map(function (node) {
      return { node: node, at: project(node.pos, width, height) };
    }).sort(function (a, b) { return b.at.z - a.at.z; });

    placed.forEach(function (item) {
      var el = item.node.el;
      el.style.left = item.at.x + "px";
      el.style.top = item.at.y + "px";
      el.style.zIndex = String(Math.round(1000 - item.at.z));
      var depth = Math.max(0.25, Math.min(1, 7.2 / item.at.z));
      var base = item.node.type === "origin" ? 8 : item.node.type === "project" ? 6 : 4.5;
      el.style.setProperty("--s", (base * (0.85 + depth * 0.3)) + "px");
      var quiet = item.node.type === "origin" || item.node.type === "project" ? 0.92 : 0.38;
      el.style.setProperty("--o", String(item.node.id === selected ? 1 : quiet * depth));
    });

    var lookup = {};
    placed.forEach(function (item) { lookup[item.node.id] = item.at; });
    var lines = [];
    if (selected && byId[selected]) {
      relations(selected).forEach(function (item) {
        var a = lookup[selected];
        var b = lookup[item.other.id];
        if (!a || !b) return;
        lines.push("<line x1=\"" + a.x + "\" y1=\"" + a.y + "\" x2=\"" + b.x + "\" y2=\"" + b.y + "\"></line>");
      });
    }
    edgesEl.setAttribute("viewBox", "0 0 " + width + " " + height);
    edgesEl.innerHTML = lines.join("");
  }

  function select(id, fromUser) {
    if (id && !byId[id]) id = null;
    selected = id;
    nodes.forEach(function (node) {
      node.el.classList.toggle("is-selected", node.id === id);
      node.el.setAttribute("aria-pressed", node.id === id ? "true" : "false");
    });
    renderDetail(id ? byId[id] : null);
    writeNodeParam(id);
    paint();
    if (fromUser && id) document.getElementById("detail-label").focus();
  }

  function build(data) {
    map = data;
    nodes = (data.nodes || []).filter(isPublic);
    byId = {};
    pointsEl.replaceChildren();
    nodes.forEach(function (node) {
      byId[node.id] = node;
      var button = document.createElement("button");
      button.type = "button";
      button.className = "node" + (node.id === ORIGIN_ID ? " is-origin" : "");
      button.dataset.nodeId = node.id;
      button.setAttribute("aria-label", node.label || node.id);
      button.setAttribute("aria-pressed", "false");
      var dot = document.createElement("span");
      dot.className = "dot";
      dot.setAttribute("aria-hidden", "true");
      var name = document.createElement("span");
      name.className = "name";
      name.textContent = node.id === ORIGIN_ID ? "Tyler" : (node.label || "");
      button.appendChild(dot);
      button.appendChild(name);
      button.addEventListener("pointerdown", function (event) {
        event.stopPropagation();
      });
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        select(node.id, true);
      });
      node.el = button;
      pointsEl.appendChild(button);
    });
    statusEl.textContent = "";
    document.body.dataset.nodeCount = String(nodes.length);
    paint();
    document.body.dataset.ready = "true";
    var requested = readNodeParam();
    if (requested && byId[requested]) select(requested, false);
  }

  function settle(now) {
    if (reduceMotion) {
      paint();
      return;
    }
    var start = now || performance.now();
    function frame(time) {
      var t = Math.min(1, (time - start) / 1600);
      var ease = 1 - Math.pow(1 - t, 3);
      camera.yaw = 0.2 + (rest.yaw - 0.2) * ease;
      camera.pitch = 0.05 + (rest.pitch - 0.05) * ease;
      paint();
      if (t < 1 && !dragging) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  stage.addEventListener("pointerdown", function (event) {
    dragging = true;
    moved = 0;
    last = { x: event.clientX, y: event.clientY };
    stage.classList.add("is-dragging");
    stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener("pointermove", function (event) {
    if (!dragging || !last) return;
    var dx = event.clientX - last.x;
    var dy = event.clientY - last.y;
    moved += Math.abs(dx) + Math.abs(dy);
    last = { x: event.clientX, y: event.clientY };
    camera.yaw += dx * 0.005;
    camera.pitch = Math.max(-0.7, Math.min(0.85, camera.pitch - dy * 0.004));
    paint();
  });

  function endDrag(event) {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove("is-dragging");
    if (moved <= 4 && event.target === stage) select(null, false);
  }

  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  stage.addEventListener("wheel", function (event) {
    event.preventDefault();
    var next = camera.distance * (1 + event.deltaY * 0.0012);
    camera.distance = Math.max(5.5, Math.min(16, next));
    paint();
  }, { passive: false });

  document.getElementById("detail-close").addEventListener("click", function () {
    select(null, false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && selected) select(null, false);
  });

  window.addEventListener("resize", paint);
  window.addEventListener("popstate", function () {
    var id = readNodeParam();
    select(id && byId[id] ? id : null, false);
  });

  window.MapView = {
    isPublic: isPublic,
    project: project,
    ORIGIN_ID: ORIGIN_ID
  };

  fetch("public/map.json", { cache: "no-store" })
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(function (data) {
      build(data);
      settle();
    })
    .catch(function () {
      statusEl.textContent = "The map did not load.";
    });
})();
