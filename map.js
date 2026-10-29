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
  var rest = { yaw: 0.55, pitch: 0.22, distance: 8.2 };
  var map = null;
  var nodes = [];
  var byId = {};
  var clusterById = {};
  var view = {};
  var selected = null;
  var dragging = false;
  var moved = 0;
  var last = null;
  var anim = 0;
  var booted = false;

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
      discipline: "Discipline",
      theme: "Theme"
    }[type] || type || "";
  }

  function basis(yaw, pitch, distance) {
    var cp = Math.cos(pitch);
    var sp = Math.sin(pitch);
    var cy = Math.cos(yaw);
    var sy = Math.sin(yaw);
    var eye = [distance * sy * cp, distance * sp, distance * cy * cp];
    var forward = [-eye[0] / distance, -eye[1] / distance, -eye[2] / distance];
    var upGuess = [0, 1, 0];
    var right = [
      forward[1] * upGuess[2] - forward[2] * upGuess[1],
      forward[2] * upGuess[0] - forward[0] * upGuess[2],
      forward[0] * upGuess[1] - forward[1] * upGuess[0]
    ];
    var rl = Math.hypot(right[0], right[1], right[2]) || 1;
    right = [right[0] / rl, right[1] / rl, right[2] / rl];
    var up = [
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

  function readState() {
    var params = new URLSearchParams(window.location.search);
    var node = params.get("node");
    var cluster = params.get("cluster");
    if (node && byId[node]) return { node: node };
    if (cluster && clusterById[cluster]) return { cluster: cluster };
    return {};
  }

  function urlFor(state) {
    var url = new URL(window.location.href);
    url.searchParams.delete("node");
    url.searchParams.delete("cluster");
    if (state.node) url.searchParams.set("node", state.node);
    else if (state.cluster) url.searchParams.set("cluster", state.cluster);
    return url.pathname + url.search + url.hash;
  }

  function sameState(a, b) {
    return (a.node || "") === (b.node || "") && (a.cluster || "") === (b.cluster || "");
  }

  function relations(id) {
    var rank = { client: 0, idea: 1, tool: 2, discipline: 3, manual: 4, semantic: 5 };
    return (map.edges || []).filter(function (edge) {
      return edge.from === id || edge.to === id;
    }).map(function (edge) {
      var otherId = edge.from === id ? edge.to : edge.from;
      var other = byId[otherId];
      return other ? { edge: edge, other: other } : null;
    }).filter(Boolean).sort(function (a, b) {
      var ra = rank[a.edge.kind] == null ? 9 : rank[a.edge.kind];
      var rb = rank[b.edge.kind] == null ? 9 : rank[b.edge.kind];
      if (ra !== rb) return ra - rb;
      return (b.edge.weight || 0) - (a.edge.weight || 0) || a.other.label.localeCompare(b.other.label);
    });
  }

  function onward(state) {
    if (state.node && byId[state.node]) {
      return relations(state.node).map(function (item) {
        return {
          id: item.other.id,
          label: item.other.label || item.other.id,
          reason: publishText(item.edge.reason) || item.other.label
        };
      });
    }
    if (state.cluster && clusterById[state.cluster]) {
      return clusterById[state.cluster].memberIds.filter(function (id) {
        return byId[id];
      }).map(function (id) {
        return { id: id, label: byId[id].label || id, reason: "In this theme" };
      });
    }
    return [];
  }

  function setText(el, value) {
    var text = publishText(value);
    el.textContent = text;
    el.hidden = !text;
  }

  function linkRow(item) {
    var li = document.createElement("li");
    var button = document.createElement("button");
    button.type = "button";
    button.dataset.go = item.id;
    var who = document.createElement("span");
    who.className = "who";
    who.textContent = item.label;
    var why = document.createElement("span");
    why.className = "why";
    why.textContent = item.reason;
    button.appendChild(who);
    button.appendChild(why);
    button.addEventListener("click", function () {
      go({ node: item.id }, "push");
    });
    li.appendChild(button);
    return li;
  }

  function renderDetail(state) {
    var list = document.getElementById("detail-relations");
    list.replaceChildren();
    if (state.node && byId[state.node]) {
      var node = byId[state.node];
      document.getElementById("detail-kind").textContent = kindLabel(node.type);
      document.getElementById("detail-label").textContent = node.label || node.id;
      var meta = [publishText(node.year), publishText(node.role), publishText(node.status)].filter(Boolean);
      if (node.archived) meta.push("Archived");
      setText(document.getElementById("detail-meta"), meta.join(" · "));
      setText(document.getElementById("detail-summary"), node.summary);
      setText(document.getElementById("detail-patterns"), node.patterns);
    } else if (state.cluster && clusterById[state.cluster]) {
      var cluster = clusterById[state.cluster];
      document.getElementById("detail-kind").textContent = "Theme";
      document.getElementById("detail-label").textContent = cluster.label || "Theme";
      setText(document.getElementById("detail-meta"), "");
      setText(document.getElementById("detail-summary"), "");
      setText(document.getElementById("detail-patterns"), "");
    } else {
      detail.hidden = true;
      return;
    }
    onward(state).forEach(function (item) {
      list.appendChild(linkRow(item));
    });
    detail.hidden = false;
  }

  function paint() {
    var width = stage.clientWidth;
    var height = stage.clientHeight;
    if (!width || !height) return;
    var placed = nodes.map(function (node) {
      return { node: node, at: project(node.pos, width, height) };
    }).sort(function (a, b) { return b.at.z - a.at.z; });
    var theme = view.cluster;

    placed.forEach(function (item) {
      var el = item.node.el;
      el.style.left = item.at.x + "px";
      el.style.top = item.at.y + "px";
      el.style.zIndex = String(Math.round(1000 - item.at.z));
      var depth = Math.max(0.25, Math.min(1, 7.2 / item.at.z));
      var base = item.node.type === "origin" ? 8 : item.node.type === "project" ? 6 : 4.5;
      el.style.setProperty("--s", (base * (0.85 + depth * 0.3)) + "px");
      var inTheme = theme && item.node.clusterId === theme;
      var quiet = item.node.type === "origin" || item.node.type === "project" || inTheme ? 0.92 : 0.38;
      el.style.setProperty("--o", String(item.node.id === selected || inTheme ? 1 : quiet * depth));
      el.classList.toggle("is-selected", item.node.id === selected);
      el.setAttribute("aria-pressed", item.node.id === selected ? "true" : "false");
    });

    var lookup = {};
    placed.forEach(function (item) { lookup[item.node.id] = item.at; });
    var lines = [];
    if (selected && byId[selected]) {
      relations(selected).forEach(function (item) {
        var a = lookup[selected];
        var b = lookup[item.other.id];
        if (!a || !b) return;
        lines.push("<line x1=\"" + a.x.toFixed(1) + "\" y1=\"" + a.y.toFixed(1) + "\" x2=\"" + b.x.toFixed(1) + "\" y2=\"" + b.y.toFixed(1) + "\"></line>");
      });
    }
    edgesEl.setAttribute("viewBox", "0 0 " + width + " " + height);
    edgesEl.innerHTML = lines.join("");
    stage.dataset.yaw = camera.yaw.toFixed(4);
  }

  function unwrap(from, to) {
    var delta = to - from;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return from + delta;
  }

  function focusTarget(pos) {
    if (!pos) return { yaw: rest.yaw, pitch: rest.pitch, distance: rest.distance };
    var yaw = Math.atan2(pos[0], pos[2] || 0.0001);
    yaw = unwrap(camera.yaw, yaw);
    var targetYaw = camera.yaw + (yaw - camera.yaw) * 0.55;
    var flat = Math.hypot(pos[0], pos[2]) || 1;
    var pitch = Math.max(-0.35, Math.min(0.55, Math.atan2(pos[1], flat) * 0.4));
    var distance = Math.max(6.4, Math.min(10.5, 8.4 - Math.hypot(pos[0], pos[1], pos[2]) * 0.12));
    return { yaw: targetYaw, pitch: pitch, distance: distance };
  }

  function animateCamera(target) {
    if (anim) cancelAnimationFrame(anim);
    var from = { yaw: camera.yaw, pitch: camera.pitch, distance: camera.distance };
    var yaw = unwrap(from.yaw, target.yaw);
    if (reduceMotion) {
      camera.yaw = yaw;
      camera.pitch = target.pitch;
      camera.distance = target.distance;
      paint();
      return;
    }
    var start = performance.now();
    function frame(now) {
      var t = Math.min(1, (now - start) / 720);
      var ease = 1 - Math.pow(1 - t, 3);
      camera.yaw = from.yaw + (yaw - from.yaw) * ease;
      camera.pitch = from.pitch + (target.pitch - from.pitch) * ease;
      camera.distance = from.distance + (target.distance - from.distance) * ease;
      paint();
      if (t < 1) anim = requestAnimationFrame(frame);
    }
    anim = requestAnimationFrame(frame);
  }

  function aim(state) {
    if (state.node && byId[state.node] && state.node !== ORIGIN_ID) {
      animateCamera(focusTarget(byId[state.node].pos));
    } else if (state.cluster && clusterById[state.cluster] && clusterById[state.cluster].centroid) {
      animateCamera(focusTarget(clusterById[state.cluster].centroid));
    } else if (booted) {
      animateCamera(rest);
    }
  }

  function apply(state, mode) {
    state = state || {};
    if (state.node && !byId[state.node]) state = {};
    if (state.cluster && !clusterById[state.cluster]) state = { node: state.node };
    view = state;
    selected = state.node || null;
    renderDetail(state);
    if (mode === "push" && !sameState(state, history.state || readState())) {
      history.pushState(state, "", urlFor(state));
    } else if (mode === "replace") {
      history.replaceState(state, "", urlFor(state));
    }
    paint();
    if (state.node || state.cluster) aim(state);
    else if (mode === "push" || mode === "silent") animateCamera({ yaw: rest.yaw, pitch: rest.pitch, distance: rest.distance });
    if (mode === "push" && (state.node || state.cluster)) {
      document.getElementById("detail-label").focus();
    }
  }

  function go(state, mode) {
    apply(state, mode);
  }

  function parentOf(state) {
    if (state.node && byId[state.node]) {
      var clusterId = byId[state.node].clusterId;
      if (clusterId && clusterById[clusterId]) return { cluster: clusterId };
      if (state.node !== ORIGIN_ID) return { node: ORIGIN_ID };
      return {};
    }
    if (state.cluster) return { node: ORIGIN_ID };
    return {};
  }

  function backOut() {
    go(parentOf(view), "push");
  }

  function build(data) {
    map = data;
    nodes = (data.nodes || []).filter(isPublic);
    byId = {};
    clusterById = {};
    (data.clusters || []).forEach(function (cluster) {
      clusterById[cluster.id] = cluster;
    });
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
        go({ node: node.id }, "push");
      });
      node.el = button;
      pointsEl.appendChild(button);
    });
    statusEl.textContent = "";
    document.body.dataset.nodeCount = String(nodes.length);
    document.body.dataset.ready = "true";
    booted = true;
    var initial = readState();
    apply(initial, "replace");
    if (!initial.node && !initial.cluster) settle();
  }

  function settle() {
    if (reduceMotion || view.node || view.cluster) {
      paint();
      return;
    }
    var start = performance.now();
    function frame(time) {
      if (view.node || view.cluster || dragging) return;
      var t = Math.min(1, (time - start) / 1600);
      var ease = 1 - Math.pow(1 - t, 3);
      camera.yaw = 0.2 + (rest.yaw - 0.2) * ease;
      camera.pitch = 0.05 + (rest.pitch - 0.05) * ease;
      paint();
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  stage.addEventListener("pointerdown", function (event) {
    if (anim) cancelAnimationFrame(anim);
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

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove("is-dragging");
  }

  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  stage.addEventListener("wheel", function (event) {
    event.preventDefault();
    var next = camera.distance * (1 + event.deltaY * 0.0012);
    camera.distance = Math.max(5.5, Math.min(16, next));
    paint();
  }, { passive: false });

  document.getElementById("detail-back").addEventListener("click", backOut);

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && (view.node || view.cluster)) backOut();
  });

  window.addEventListener("resize", paint);
  window.addEventListener("popstate", function () {
    apply(readState(), "silent");
  });

  window.MapView = {
    isPublic: isPublic,
    project: project,
    ORIGIN_ID: ORIGIN_ID,
    open: function (id) { apply(byId[id] ? { node: id } : {}, "silent"); },
    onwardCount: function (id) { return onward({ node: id }).length; }
  };

  fetch("public/map.json", { cache: "no-store" })
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(build)
    .catch(function () {
      statusEl.textContent = "The map did not load.";
    });
})();
