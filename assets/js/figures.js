/* =====================================================================
   Animowane ludziki (SVG + prosta kinematyka odwrotna)
   • Lifter — wyciskanie sztangi nad głowę (ekran ładowania)
   • Curler — uginanie przedramienia z hantlem (przekierowanie)
   ===================================================================== */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var DEG = Math.PI / 180;

  function el(tag, attrs, parent) {
    var node = document.createElementNS(NS, tag);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function set(node, attrs) {
    for (var k in attrs) node.setAttribute(k, attrs[k]);
  }

  function pts(list) {
    return list.map(function (p) { return p.x.toFixed(2) + "," + p.y.toFixed(2); }).join(" ");
  }

  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var easeInOut = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var smooth = function (a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  /* Dwuczłonowe IK: zwraca położenie stawu (łokieć / kolano).
     prefer(x, y) ocenia kandydatów — wybierany jest ten z wyższym wynikiem. */
  function ik(a, b, l1, l2, prefer) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.01);
    var ux = dx / (Math.hypot(dx, dy) || 1), uy = dy / (Math.hypot(dx, dy) || 1);
    var along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    var h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
    var px = a.x + ux * along, py = a.y + uy * along;
    var c1 = { x: px - uy * h, y: py + ux * h };
    var c2 = { x: px + uy * h, y: py - ux * h };
    return prefer(c1.x - px, c1.y - py) >= prefer(c2.x - px, c2.y - py) ? c1 : c2;
  }

  /* Tłumione „bujanie” końców sztangi po gwałtownym ruchu */
  function whip(dt, amp) {
    if (dt < 0 || dt > 1.4) return 0;
    return amp * Math.exp(-dt * 5.5) * Math.cos(dt * 24);
  }

  function loop(render, period) {
    var raf = 0, t0 = 0, running = false;
    function frame(now) {
      if (!running) return;
      if (!t0) t0 = now;
      render(((now - t0) % period) / period, now - t0);
      raf = requestAnimationFrame(frame);
    }
    return {
      start: function () {
        if (running) return;
        running = true; t0 = 0;
        raf = requestAnimationFrame(frame);
      },
      stop: function () { running = false; cancelAnimationFrame(raf); },
      pose: function (u) { render(u, 0); },
    };
  }

  /* ------------------------------------------------------------------
     LIFTER — push press, widok z przodu
     ------------------------------------------------------------------ */
  function createLifter(svg, opts) {
    var PERIOD = (opts && opts.period) || 2200;
    var C = 100, HX = 26, GROUND = 180;

    var root = el("g", { class: "fig" }, svg);
    var shadow = el("ellipse", { cx: C, cy: GROUND + 3, rx: 44, ry: 4, class: "fig-shadow" }, root);
    var legL = el("polyline", { class: "fig-limb" }, root);
    var legR = el("polyline", { class: "fig-limb" }, root);
    var torso = el("line", { class: "fig-limb fig-torso" }, root);
    var head = el("circle", { r: 11, class: "fig-head" }, root);
    var armL = el("polyline", { class: "fig-limb" }, root);
    var armR = el("polyline", { class: "fig-limb" }, root);

    var bar = el("g", { class: "fig-bar" }, root);
    var barMid = el("line", { class: "bar-steel" }, bar);
    function buildSide() {
      var g = el("g", {}, bar);
      el("line", { x1: 0, y1: 0, x2: 48, y2: 0, class: "bar-steel" }, g);
      el("rect", { x: 21, y: -4.5, width: 3, height: 9, rx: 1, class: "bar-collar" }, g);
      el("rect", { x: 24.5, y: -20, width: 7.5, height: 40, rx: 2.2, class: "plate plate--big" }, g);
      el("rect", { x: 33, y: -15, width: 5.5, height: 30, rx: 2, class: "plate" }, g);
      el("rect", { x: 39.5, y: -5.5, width: 3, height: 11, rx: 1, class: "bar-collar" }, g);
      return g;
    }
    var sideL = buildSide(), sideR = buildSide();
    var hands = [el("circle", { r: 4, class: "fig-hand" }, root), el("circle", { r: 4, class: "fig-hand" }, root)];

    // Momenty zdarzeń w cyklu (0–1) i siła bujania sztangi
    var EVENTS = [[0.28, -2.5], [0.46, 4.5], [0.97, 3]];

    function render(u) {
      var dip = 0, lift = 0, ext = 0;
      if (u < 0.16) {
        // stoi z gryfem na barkach
      } else if (u < 0.28) {
        dip = easeInOut((u - 0.16) / 0.12);
      } else if (u < 0.46) {
        var k = (u - 0.28) / 0.18;
        dip = 1 - easeOut(Math.min(1, k * 1.7));
        lift = easeOut(k);
        ext = Math.sin(Math.PI * clamp(k * 1.5, 0, 1)) * 3;
      } else if (u < 0.7) {
        lift = 1;
      } else {
        var k2 = (u - 0.7) / 0.3;
        lift = 1 - easeInOut(k2);
        dip = 0.4 * Math.sin(Math.PI * clamp((k2 - 0.75) / 0.25, 0, 1));
      }

      var hipY = 126 + dip * 9 - ext;
      var neckY = hipY - 46;
      var shY = neckY + 5;
      var barY = lerp(shY - 2, shY - 42.5, lift);

      var droop = 2.2;
      EVENTS.forEach(function (e) {
        droop += whip((((u - e[0]) % 1 + 1) % 1) * PERIOD / 1000, e[1]);
      });

      [-1, 1].forEach(function (s) {
        var pelvis = { x: C, y: hipY + 2 };
        var hip = { x: C + s * 9, y: hipY + 3 };
        var ankle = { x: C + s * 23, y: GROUND - 2 };
        var knee = ik(hip, ankle, 27, 27, function (x) { return s * x; });
        var toe = { x: ankle.x + s * 7, y: GROUND };
        set(s < 0 ? legL : legR, { points: pts([pelvis, hip, knee, ankle, toe]) });

        var neck = { x: C, y: neckY };
        var sh = { x: C + s * 15, y: shY };
        var hand = { x: C + s * HX, y: barY };
        var elbow = ik(sh, hand, 22, 22, function (x, y) { return s * x + y; });
        set(s < 0 ? armL : armR, { points: pts([neck, sh, elbow, hand]) });
        set(hands[s < 0 ? 0 : 1], { cx: hand.x, cy: hand.y });
      });

      set(torso, { x1: C, y1: hipY + 2, x2: C, y2: neckY });
      set(head, { cx: C, cy: neckY - 13 });
      set(barMid, { x1: C - HX, y1: barY, x2: C + HX, y2: barY });
      set(sideR, { transform: "translate(" + (C + HX) + " " + barY.toFixed(2) + ") rotate(" + droop.toFixed(2) + ")" });
      set(sideL, { transform: "translate(" + (C - HX) + " " + barY.toFixed(2) + ") scale(-1 1) rotate(" + droop.toFixed(2) + ")" });
      set(shadow, { rx: (44 + dip * 4).toFixed(2), opacity: (0.55 - lift * 0.15).toFixed(2) });
    }

    var api = loop(render, PERIOD);
    api.pose(0);
    return api;
  }

  /* ------------------------------------------------------------------
     CURLER — uginanie przedramienia z hantlem, widok z boku
     ------------------------------------------------------------------ */
  function createCurler(svg, opts) {
    var PERIOD = (opts && opts.period) || 1150;
    var GROUND = 180;

    var root = el("g", { class: "fig" }, svg);
    el("ellipse", { cx: 100, cy: GROUND + 3, rx: 34, ry: 4, class: "fig-shadow" }, root);

    // ręka „z tyłu” (przygaszona) z drugim hantlem
    var back = el("g", { class: "fig-back" }, root);
    var backArm = el("polyline", { class: "fig-limb" }, back);
    var backDb = el("g", {}, back);
    buildDumbbell(backDb);

    var legBack = el("polyline", { class: "fig-limb" }, root);
    var legFront = el("polyline", { class: "fig-limb" }, root);
    var torso = el("line", { class: "fig-limb fig-torso" }, root);
    var head = el("circle", { r: 12, class: "fig-head" }, root);

    var bicep = el("path", { class: "fig-bicep" }, root);
    var pump = el("path", { class: "fig-bicep fig-pump" }, root);
    var upper = el("line", { class: "fig-limb fig-upper" }, root);
    var fore = el("line", { class: "fig-limb" }, root);
    var db = el("g", {}, root);
    buildDumbbell(db);
    var fist = el("circle", { r: 4.6, class: "fig-hand" }, root);

    var plus = el("text", { class: "fig-plus", "text-anchor": "middle" }, root);
    plus.textContent = "+1";

    function buildDumbbell(g) {
      el("line", { x1: -11, y1: 0, x2: 11, y2: 0, class: "bar-steel" }, g);
      [-1, 1].forEach(function (s) {
        el("rect", { x: s > 0 ? 10 : -16, y: -10, width: 6, height: 20, rx: 2.2, class: "plate plate--big" }, g);
        el("rect", { x: s > 0 ? 16.5 : -20, y: -6.5, width: 3.5, height: 13, rx: 1.4, class: "plate" }, g);
      });
    }

    function render(u) {
      var k;
      if (u < 0.42) k = easeInOut(u / 0.42);
      else if (u < 0.55) k = 1;
      else k = 1 - easeInOut((u - 0.55) / 0.45);

      var lean = -2.5 * k; // lekkie odchylenie tułowia przy spięciu
      var hip = { x: 98, y: 128 };
      var neck = { x: 100 + Math.sin(lean * DEG) * 56, y: 72 };
      var sh = { x: neck.x + 3, y: 80 };

      // nogi (kolana delikatnie do przodu)
      var fwd = function (x) { return x; };
      var footB = { x: 91, y: GROUND - 2 }, footF = { x: 107, y: GROUND - 2 };
      var kneeB = ik({ x: hip.x - 1, y: hip.y }, footB, 26.5, 26.5, fwd);
      var kneeF = ik({ x: hip.x + 1, y: hip.y }, footF, 26.5, 26.5, fwd);
      set(legBack, { points: pts([hip, kneeB, footB, { x: footB.x + 9, y: GROUND }]) });
      set(legFront, { points: pts([hip, kneeF, footF, { x: footF.x + 9, y: GROUND }]) });
      set(torso, { x1: hip.x, y1: hip.y, x2: neck.x, y2: neck.y });
      set(head, { cx: neck.x + 2, cy: neck.y - 14 });

      // ręka z tyłu — luźno zwisa
      var bElbow = { x: sh.x - 4, y: 111 }, bHand = { x: sh.x - 5, y: 140 };
      set(backArm, { points: pts([sh, bElbow, bHand]) });
      set(backDb, { transform: "translate(" + bHand.x.toFixed(2) + " " + bHand.y + ")" });

      // ręka pracująca
      var theta = lerp(10, 128, k) * DEG;
      var elbow = { x: sh.x + 7 + k * 2, y: 111 };
      var hand = { x: elbow.x + 30 * Math.sin(theta), y: elbow.y + 30 * Math.cos(theta) };
      set(upper, { x1: sh.x, y1: sh.y, x2: elbow.x, y2: elbow.y });
      set(fore, { x1: elbow.x, y1: elbow.y, x2: hand.x, y2: hand.y });
      set(fist, { cx: hand.x, cy: hand.y });
      set(db, { transform: "translate(" + hand.x.toFixed(2) + " " + hand.y.toFixed(2) + ") rotate(" + (-theta / DEG).toFixed(2) + ")" });

      // biceps — „pompuje się” wraz z ruchem
      var ax = elbow.x - sh.x, ay = elbow.y - sh.y, len = Math.hypot(ax, ay);
      var nx = ay / len, ny = -ax / len; // normalna w stronę przodu
      var bulge = 3 + 10 * Math.pow(k, 1.3);
      var mid = { x: (sh.x + elbow.x) / 2 + nx * 1.5, y: (sh.y + elbow.y) / 2 + 1 };
      var ctrl = { x: mid.x + nx * bulge * 2, y: mid.y + ny * bulge * 2 };
      set(bicep, {
        d: "M" + (sh.x + 1).toFixed(2) + " " + (sh.y + 5).toFixed(2) +
           " Q" + ctrl.x.toFixed(2) + " " + ctrl.y.toFixed(2) + " " +
           (elbow.x + 0.5).toFixed(2) + " " + (elbow.y - 3).toFixed(2) + "Z",
      });

      // „pompa” — biceps rozświetla się na złoto przy pełnym spięciu
      set(pump, { d: bicep.getAttribute("d"), opacity: smooth(0.6, 1, k).toFixed(2) });

      // „+1” wylatujące po każdym powtórzeniu
      var p = clamp((u - 0.4) / 0.45, 0, 1);
      set(plus, {
        x: 150, y: (62 - p * 18).toFixed(2),
        opacity: (Math.sin(Math.PI * p) * 0.95).toFixed(2),
      });
    }

    var api = loop(render, PERIOD);
    api.pose(0);
    return api;
  }

  window.Figures = { createLifter: createLifter, createCurler: createCurler };
})();
