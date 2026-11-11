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
  var themeDots = [];
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

  var FILTERS = ["project", "theme", "tool", "client", "idea"];

  function readState() {
    var params = new URLSearchParams(window.location.search);
    var state = { view: "", filter: "", node: "", cluster: "" };
    if (params.get("view") === "list") state.view = "list";
    if (FILTERS.indexOf(params.get("filter")) !== -1) state.filter = params.get("filter");
    var node = params.get("node");
    var cluster = params.get("cluster");
    if (node && byId[node]) state.node = node;
    else if (cluster && clusterById[cluster]) state.cluster = cluster;
    return state;
  }

  function urlFor(state) {
    var url = new URL(window.location.href);
    url.searchParams.delete("view");
    url.searchParams.delete("filter");
    url.searchParams.delete("node");
    url.searchParams.delete("cluster");
    if (state.view === "list") url.searchParams.set("view", "list");
    if (state.filter) url.searchParams.set("filter", state.filter);
    if (state.node) url.searchParams.set("node", state.node);
    else if (state.cluster) url.searchParams.set("cluster", state.cluster);
    return url.pathname + url.search + url.hash;
  }

  function sameState(a, b) {
    a = a || {};
    b = b || {};
    return (a.view || "") === (b.view || "") && (a.filter || "") === (b.filter || "") && (a.node || "") === (b.node || "") && (a.cluster || "") === (b.cluster || "");
  }

  function entries(filter, which) {
    if (filter === "theme") {
      return (map.clusters || []).map(function (cluster) {
        return { id: cluster.id, kind: "theme", label: cluster.label, pos: cluster.centroid };
      }).sort(function (a, b) { return a.label.localeCompare(b.label); });
    }
    var type = filter;
    if (!type && which === "list") type = "project";
    return nodes.filter(function (node) {
      return !type || node.type === type;
    }).sort(function (a, b) {
      return (b.featured === true) - (a.featured === true) || (a.label || "").localeCompare(b.label || "");
    }).map(function (node) {
      return { id: node.id, kind: "node", label: node.label || node.id, pos: node.pos, node: node };
    });
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

  function linksFor(id) {
    if (clusterById[id]) {
      return clusterById[id].memberIds.filter(function (memberId) {
        return byId[memberId];
      }).map(function (memberId) {
        return { id: memberId, label: byId[memberId].label || memberId, reason: "In this theme" };
      });
    }
    if (byId[id]) {
      return relations(id).map(function (item) {
        return {
          id: item.other.id,
          label: item.other.label || item.other.id,
          reason: publishText(item.edge.reason) || item.other.label
        };
      });
    }
    return [];
  }

  // List rows carry the direct connections (client, idea, tool, and the
  // rare hand-linked project). Shared-facet and semantic edges stay on the
  // map, where the full set still has room. A row with no direct link keeps
  // a few semantic neighbors so nothing dead-ends.
  function listLinks(id) {
    if (clusterById[id]) {
      return linksFor(id).slice().sort(function (a, b) {
        return a.label.localeCompare(b.label);
      });
    }
    var node = byId[id];
    var seen = {};
    var chosen = [];
    var fallback = [];
    relations(id).forEach(function (item) {
      var otherId = item.other.id;
      if (seen[otherId]) return;
      var kind = item.edge.kind;
      var reason = publishText(item.edge.reason) || "";
      var entry = {
        id: otherId,
        label: item.other.label || otherId,
        reason: kindLabel(item.other.type)
      };
      if (kind === "semantic") {
        seen[otherId] = true;
        fallback.push(entry);
        return;
      }
      if (node && node.type === "project" && (reason.indexOf("same ") === 0 || kind === "discipline")) return;
      seen[otherId] = true;
      chosen.push(entry);
    });
    if (chosen.length) return chosen;
    return fallback.slice(0, 3);
  }

  function setText(el, value) {
    var text = publishText(value);
    el.textContent = text;
    el.hidden = !text;
  }

  function linkRow(item) {
    var li = document.createElement("li");
    var link = document.createElement("jtb-link");
    link.setAttribute("variant", "onward");
    link.dataset.go = item.id;
    link.textContent = item.label;
    link.addEventListener("click", function () {
      go({ node: item.id, cluster: "" }, "push");
    });
    li.appendChild(link);
    if (item.reason) {
      var why = document.createElement("jtb-text");
      why.setAttribute("variant", "mono");
      why.className = "why";
      why.textContent = item.reason;
      li.appendChild(why);
    }
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
    linksFor(state.node || state.cluster).forEach(function (item) {
      list.appendChild(linkRow(item));
    });
    detail.hidden = false;
  }

  function shownIds(which) {
    var ids = {};
    entries(view.filter, which).forEach(function (entry) { ids[entry.id] = true; });
    if (view.node && (byId[view.node] || clusterById[view.node])) ids[view.node] = true;
    if (view.cluster && clusterById[view.cluster]) ids[view.cluster] = true;
    return ids;
  }

  function paint() {
    var width = stage.clientWidth;
    var height = stage.clientHeight;
    if (!width || !height) {
      if (view.view !== "list") requestAnimationFrame(paint);
      return;
    }
    var visible = shownIds("map");
    var placed = nodes.map(function (node) {
      return { node: node, at: project(node.pos, width, height) };
    }).sort(function (a, b) { return b.at.z - a.at.z; });
    var theme = view.cluster;

    placed.forEach(function (item) {
      var el = item.node.el;
      el.style.left = item.at.x + "px";
      el.style.top = item.at.y + "px";
      el.style.zIndex = String(Math.round(1000 - item.at.z));
      var depth = Math.max(0.72, Math.min(1, 7.2 / item.at.z));
      var base = item.node.type === "origin" ? 8 : item.node.type === "project" ? 6 : 4.5;
      el.style.setProperty("--s", (base * (0.85 + depth * 0.3)) + "px");
      var inTheme = theme && item.node.clusterId === theme;
      var quiet = item.node.type === "origin" || item.node.type === "project" || inTheme ? 1 : 0.82;
      el.style.setProperty("--o", String(item.node.id === selected || inTheme ? 1 : quiet * depth));
      el.classList.toggle("is-selected", item.node.id === selected);
      el.hidden = !visible[item.node.id];
      el.setAttribute("aria-pressed", item.node.id === selected ? "true" : "false");
    });
    themeDots.forEach(function (dot) {
      if (!dot.pos) return;
      var at = project(dot.pos, width, height);
      dot.el.style.left = at.x + "px";
      dot.el.style.top = at.y + "px";
      dot.el.hidden = !visible[dot.id];
      dot.el.classList.toggle("is-selected", view.cluster === dot.id);
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
    var ms = tokenNumber("--duration-slow");
    if (reduceMotion || !ms) {
      camera.yaw = yaw;
      camera.pitch = target.pitch;
      camera.distance = target.distance;
      paint();
      return;
    }
    var start = performance.now();
    function frame(now) {
      var t = Math.min(1, (now - start) / ms);
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
    if (state.node && !byId[state.node]) state = Object.assign({}, state, { node: "" });
    if (state.cluster && !clusterById[state.cluster]) state = Object.assign({}, state, { cluster: "" });
    var previous = view;
    view = {
      view: state.view === "list" ? "list" : "",
      filter: FILTERS.indexOf(state.filter) !== -1 ? state.filter : "",
      node: state.node || "",
      cluster: state.cluster || ""
    };
    if (view.node && view.cluster) view.cluster = "";
    selected = view.node || null;
    document.body.classList.toggle("is-list", view.view === "list");
    document.getElementById("list").hidden = view.view !== "list";
    document.querySelectorAll(".views jtb-button").forEach(function (button) {
      button.classList.toggle("is-current", button.dataset.view === (view.view || "map"));
    });
    document.querySelectorAll(".filters jtb-tag").forEach(function (button) {
      var on = button.dataset.filter === view.filter;
      button.classList.toggle("is-current", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
    updateCounter();
    document.getElementById("detail-back").hidden = !(view.node || view.cluster);
    renderDetail(view.node || view.cluster ? view : {});
    renderList();
    if (mode === "push" && !sameState(view, previous)) history.pushState(view, "", urlFor(view));
    else if (mode === "replace") history.replaceState(view, "", urlFor(view));
    paint();
    if (view.node || view.cluster) aim(view);
    else if (mode === "push" || mode === "silent") animateCamera({ yaw: rest.yaw, pitch: rest.pitch, distance: rest.distance });
    if (mode === "push" && (view.node || view.cluster) && view.view !== "list") {
      document.getElementById("detail-label").focus();
    }
  }

  function go(changes, mode) {
    apply(Object.assign({}, view, changes), mode);
  }

  function updateCounter() {
    var counter = document.getElementById("scope-count");
    if (!counter) return;
    var which = view.view === "list" ? "list" : "map";
    var singular = {
      project: "project",
      theme: "theme",
      tool: "tool",
      client: "client",
      idea: "idea"
    }[view.filter] || (which === "list" ? "project" : "node");
    counter.setAttribute("value", String(entries(view.filter, which).length));
    counter.setAttribute("noun", singular);
  }

  function tokenNumber(name) {
    var raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    var value = parseFloat(raw);
    if (!raw || isNaN(value)) return 0;
    if (raw.slice(-2) === "ms") return value;
    if (raw.slice(-1) === "s") return value * 1000;
    return value;
  }

  function renderList() {
    var list = document.getElementById("list");
    list.replaceChildren();
    var items = entries(view.filter, "list");
    if (view.node && byId[view.node] && !items.some(function (item) { return item.id === view.node; })) {
      items.unshift({ id: view.node, kind: "node", label: byId[view.node].label || view.node, node: byId[view.node] });
    }
    items.forEach(function (entry) {
      var row = document.createElement("article");
      row.className = "row" + ((view.node === entry.id || view.cluster === entry.id) ? " is-current" : "");
      row.dataset.row = entry.id;
      var title = document.createElement("jtb-button");
      title.setAttribute("variant", "text");
      title.setAttribute("face", "display");
      title.className = "row-title";
      title.dataset.go = entry.id;
      title.textContent = entry.label;
      title.addEventListener("click", function () {
        if (entry.kind === "theme") go({ cluster: entry.id, node: "" }, "push");
        else go({ node: entry.id, cluster: "" }, "push");
      });
      row.appendChild(title);
      if (entry.node) {
        var meta = [publishText(entry.node.year), publishText(entry.node.role), publishText(entry.node.status)].filter(Boolean);
        if (meta.length) {
          var line = document.createElement("jtb-text");
          line.setAttribute("variant", "mono");
          line.className = "row-meta";
          line.textContent = meta.join(" · ");
          row.appendChild(line);
        }
      }
      var links = document.createElement("ul");
      links.className = "onward";
      listLinks(entry.id).forEach(function (item) {
        var li = document.createElement("li");
        var button = document.createElement("jtb-link");
        button.setAttribute("variant", "onward");
        button.dataset.go = item.id;
        button.textContent = item.label;
        button.addEventListener("click", function () {
          go({ node: item.id, cluster: "" }, "push");
        });
        li.appendChild(button);
        links.appendChild(li);
      });
      row.appendChild(links);
      list.appendChild(row);
    });
  }

  function parentOf(state) {
    if (state.node && byId[state.node]) {
      var clusterId = byId[state.node].clusterId;
      if (clusterId && clusterById[clusterId]) return { node: "", cluster: clusterId };
      if (state.node !== ORIGIN_ID) return { node: ORIGIN_ID, cluster: "" };
      return { node: "", cluster: "" };
    }
    if (state.cluster) return { node: ORIGIN_ID, cluster: "" };
    return { node: "", cluster: "" };
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
      var name = document.createElement("jtb-text");
      name.setAttribute("variant", "mono");
      name.className = "name";
      name.textContent = node.id === ORIGIN_ID ? "Tyler" : (node.label || "");
      button.appendChild(dot);
      button.appendChild(name);
      button.addEventListener("pointerdown", function (event) {
        event.stopPropagation();
      });
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        go({ node: node.id, cluster: "" }, "push");
      });
      node.el = button;
      pointsEl.appendChild(button);
    });
    themeDots = (data.clusters || []).map(function (cluster) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "node is-theme";
      button.dataset.themeId = cluster.id;
      button.hidden = true;
      button.setAttribute("aria-label", cluster.label || "Theme");
      var dot = document.createElement("span");
      dot.className = "dot";
      button.appendChild(dot);
      var name = document.createElement("jtb-text");
      name.setAttribute("variant", "mono");
      name.className = "name";
      name.textContent = cluster.label || "";
      button.appendChild(name);
      button.addEventListener("pointerdown", function (event) { event.stopPropagation(); });
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        go({ cluster: cluster.id, node: "" }, "push");
      });
      pointsEl.appendChild(button);
      return { id: cluster.id, pos: cluster.centroid, el: button };
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
    var ms = tokenNumber("--duration-settle");
    if (!ms) {
      paint();
      return;
    }
    var start = performance.now();
    function frame(time) {
      if (view.node || view.cluster || dragging) return;
      var t = Math.min(1, (time - start) / ms);
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
  document.querySelectorAll(".views jtb-button").forEach(function (button) {
    button.addEventListener("click", function () {
      go({ view: button.dataset.view === "list" ? "list" : "" }, "push");
    });
  });
  document.querySelectorAll(".filters jtb-tag").forEach(function (button) {
    button.addEventListener("click", function () {
      var next = view.filter === button.dataset.filter ? "" : button.dataset.filter;
      go({ filter: next }, "push");
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && (view.node || view.cluster)) backOut();
  });

  window.addEventListener("resize", paint);
  window.addEventListener("popstate", function () {
    apply(readState(), "silent");
  });

  function resolvedColor(token) {
    var probe = document.createElement("span");
    probe.hidden = true;
    probe.style.color = "var(" + token + ")";
    document.body.appendChild(probe);
    var value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }

  // CSS variables are the only colour source. three.js materials read the
  // same resolved values when THREE is on the page.
  function palette() {
    var colors = {
      paper: resolvedColor("--paper"),
      ink: resolvedColor("--ink"),
      ink70: resolvedColor("--ink-70"),
      ink40: resolvedColor("--ink-40"),
      ink15: resolvedColor("--ink-15"),
      ink06: resolvedColor("--ink-06"),
      haze: resolvedColor("--haze"),
      fog: resolvedColor("--fog"),
      line: resolvedColor("--line")
    };
    if (window.THREE && window.THREE.Color) {
      colors.three = {
        paper: new window.THREE.Color(colors.paper),
        ink: new window.THREE.Color(colors.ink),
        ink70: new window.THREE.Color(colors.ink70),
        ink40: new window.THREE.Color(colors.ink40),
        ink15: new window.THREE.Color(colors.ink15),
        ink06: new window.THREE.Color(colors.ink06),
        haze: new window.THREE.Color(colors.haze),
        fog: new window.THREE.Color(colors.fog),
        line: new window.THREE.Color(colors.line)
      };
    }
    return colors;
  }

  window.MapView = {
    isPublic: isPublic,
    project: project,
    ORIGIN_ID: ORIGIN_ID,
    open: function (id) { go({ node: id, cluster: "" }, "silent"); },
    entries: function (filter, which) { return entries(filter, which).map(function (entry) { return entry.id; }); },
    linksFor: function (id) { return linksFor(id); },
    palette: palette
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
