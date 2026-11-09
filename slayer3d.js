/* ============================================================
   AMIER — the slayer stage · GLB character loader
   Character: KayKit "Adventurers Character Pack · Knight"
   (© Kay Lousberg — CC0 · kaylousberg.itch.io) · vendored GLB.
   Loaded with three.js r149 + vendored classic GLTFLoader.js.
   Plays its built-in idle animation, follows the cursor with a
   gentle parallax, and sits on a crimson-ember floor. Zero
   network calls beyond the same-origin .glb. Falls back to the
   「刃 ⚔ 夢」 badge if WebGL is missing or the model fails.
   ============================================================ */
(function () {
  "use strict";

  var canvas = document.getElementById("slayer");
  var stage = document.getElementById("heroStage");
  if (typeof THREE === "undefined") { stage.classList.add("no-webgl"); if (canvas) canvas.style.display = "none"; return; }

  var renderer, scene, camera, fig, mixer, idleAction;
  var ok = true;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  } catch (e) { ok = false; }
  if (ok && !renderer.getContext()) ok = false;
  if (!ok) { stage.classList.add("no-webgl"); canvas.style.display = "none"; return; }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);

  /* ---------- helpers ---------- */
  function radialTex(inner, outer) {
    var cv = document.createElement("canvas"); cv.width = cv.height = 256;
    var cx = cv.getContext("2d");
    var g = cx.createRadialGradient(128, 128, 10, 128, 128, 126);
    g.addColorStop(0, inner); g.addColorStop(1, outer);
    cx.fillStyle = g; cx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(cv);
  }

  /* ---------- lights (same crimson-abyss language as the site) ---------- */
  scene.add(new THREE.HemisphereLight(0x56505c, 0x1a0d08, 0.6));
  var key     = new THREE.DirectionalLight(0xfff1e0, 1.45); key.position.set(1.7, 2.7, 2.7);
  var rim     = new THREE.PointLight(0xd43425, 2.1, 9);     rim.position.set(-1.9, 1.9, -1.7);
  var emberUp = new THREE.PointLight(0xd43425, 0.9, 6);     emberUp.position.set(0.85, 0.25, 1.95);
  var face    = new THREE.PointLight(0xffd9a8, 0.9, 6);     face.position.set(0.55, 1.5, 2.35);
  var fill    = new THREE.DirectionalLight(0x7f96c9, 0.18); fill.position.set(-1.6, 0.95, 2.2);
  scene.add(key, rim, emberUp, face, fill);

  /* ---------- floor: contact shadow + crimson light pool ---------- */
  var shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25),
    new THREE.MeshBasicMaterial({ map: radialTex("rgba(0,0,0,0.66)", "rgba(0,0,0,0)"), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; scene.add(shadow);

  var glow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4),
    new THREE.MeshBasicMaterial({ map: radialTex("rgba(212,52,37,0.24)", "rgba(212,52,37,0)"), transparent: true, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.set(0, 0.001, 0.15); scene.add(glow);

  /* ---------- the character ---------- */
  fig = new THREE.Group(); scene.add(fig);

  var clock = new THREE.Clock();
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var px = 0, py = 0, tpx = 0, tpy = 0;
  var visible = true;
  var flagFacing = 0;               /* fine-tuned facing offset (radians) */
  var GLB_URL = "assets/slayer-knight.glb";

  function fitToStage(gltf) {
    var model = gltf.scene || gltf.scenes[0];

    /* measure */
    var bbox = new THREE.Box3().setFromObject(model);
    var size = new THREE.Vector3(); bbox.getSize(size);
    var targetH = 1.85;
    var s = targetH / (size.y || 1);
    model.scale.setScalar(s);

    /* re-measure after scale, then ground + center */
    var b2 = new THREE.Box3().setFromObject(model);
    var c2 = new THREE.Vector3(); b2.getCenter(c2);
    model.position.x -= c2.x;
    model.position.z -= c2.z;
    model.position.y -= b2.min.y;
    return model;
  }

  /* exact-name strict pick:KayKit's list contains both 2H and 1H idle variants */
  function pickIdleClipType(gltf) {
    var clips = gltf.animations || [];
    return clips.filter(function (c) { return c.name === "Idle"; })[0]
        || clips.filter(function (c) { return /Unarmed_Idle/.test(c.name); })[0]
        || clips[0] || null;
  }

  /* random greeting each refresh — same spirit as the intro variants */
  function shuffled(arr) {
    var a = arr.slice(), j, x, i;
    for (i = a.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }

  var loadedGltf = null, mixer = null, idleAction = null, activeAction = null;

  function act(name) {
    if (!mixer) return null;
    var lib = loadedGltf && loadedGltf.animations || [];
    var clip = THREE.AnimationClip.findByName(lib, name) || lib[0];
    return clip ? mixer.clipAction(clip) : null;
  }

  /* return-to-idle whenever a one-shot action finishes */
  function onActionFinished(e) {
    if (e.action !== idleAction && idleAction) {
      idleAction.reset().fadeIn(0.35).play();
      activeAction = idleAction;
    }
  }

  var GREETINGS = ["Cheer", "1H_Melee_Attack_Slice_Diagonal", "2H_Melee_Attack_Slice", "Dodge_Backward"];
  var ATTACKS = ["1H_Melee_Attack_Slice_Diagonal", "1H_Melee_Attack_Chop", "1H_Melee_Attack_Stab", "2H_Melee_Attack_Slice"];

  if (typeof THREE.GLTFLoader === "function") {
    new THREE.GLTFLoader().load(GLB_URL, function (gltf) {
      loadedGltf = gltf;
      var model = fitToStage(gltf);
      fig.add(model);

      /* materials read better slightly toon-ish under candle light */
      model.traverse(function (o) {
        if (o.isMesh && o.material) {
          o.castShadow = false; o.receiveShadow = false;
          if (o.material) { delete o.material.envMap; o.material.needsUpdate = true; }
        }
      });

      /* built-in idle animation + a random "greeting" flourish, then back to idle */
      var clip = pickIdleClipType(gltf);
      window.__slayerClips = (gltf.animations || []).map(function (c) { return c.name; });
      if (clip && !reduced) {
        mixer = new THREE.AnimationMixer(model);
        idleAction = mixer.clipAction(clip);
        idleAction.play();
        activeAction = idleAction;
        mixer.addEventListener("finished", onActionFinished);
        mixer.update(0.05);          /* settle into the idle pose */

        shuffled(GREETINGS).some(function (name) {
          var g = act(name);
          if (!g) return false;
          g.setLoop(THREE.LoopOnce, 1);
          g.clampWhenFinished = false;
          g.reset().fadeIn(0.18).play();
          activeAction = g;
          return true;
        });
      }

      /* re-ground AFTER the settle: bind-pose weapons can dip below the feet */
      model.updateMatrixWorld(true);
      var b3 = new THREE.Box3().setFromObject(model);
      var c3 = new THREE.Vector3(); b3.getCenter(c3);
      model.position.x -= c3.x;
      model.position.z -= c3.z;
      model.position.y -= b3.min.y;

      /* reveal */
      canvas.style.opacity = "1";
      stage.classList.add("figure-ready");
      frame(clock.getElapsedTime());
    }, undefined, function () {
      stage.classList.add("no-webgl");
      canvas.style.display = "none";
    });
  } else {
    stage.classList.add("no-webgl");
    canvas.style.display = "none";
  }

  /* ---------- motion ---------- */
  if (!reduced) {
    window.addEventListener("pointermove", function (e) {
      tpx = (e.clientX / window.innerWidth - 0.5) * 2;    /* -1 .. 1 */
      tpy = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }, { threshold: 0.02 }).observe(canvas);
  }

  function frame(t) {
    var dt = clock.getDelta();
    var k = reduced ? 0 : 1;
    if (mixer) mixer.update(reduced ? 0 : dt);

    px += (tpx - px) * 0.06;
    py += (tpy - py) * 0.06;
    fig.rotation.y = k * (flagFacing + 0.06 + px * 0.28);
    fig.rotation.x = k * (py * 0.05);

    renderer.render(scene, camera);
  }

  /* click / tap the stage → the slayer swings the blade */
  stage.addEventListener("pointerdown", function () {
    if (!mixer || reduced) return;
    shuffled(ATTACKS).some(function (name) {
      var a = act(name);
      if (!a) return false;
      a.setLoop(THREE.LoopOnce, 1);
      a.clampWhenFinished = false;
      a.reset().fadeIn(0.12).play();
      activeAction = a;
      return true;
    });
  });

  function loop() {
    if (visible) frame();
    requestAnimationFrame(loop);
  }

  function sizeCanvas(w, h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    var vert = camera.aspect < 0.72 ? 2.72 : (camera.aspect < 1.15 ? 2.95 : 3.1);
    var dist = (vert * 0.5) / Math.tan(16 * Math.PI / 180);
    camera.position.set(0, 1.34, dist);
    camera.lookAt(0, 0.99, 0);
    camera.updateProjectionMatrix();
  }

  function resize() {
    var box = canvas.parentElement || stage;
    var w = box.clientWidth || 480;
    var h = box.clientHeight || 640;
    if (w > 1400 || h < 10) { w = 480; h = 640; }
    sizeCanvas(w, h);
  }
  window.addEventListener("resize", resize);
  resize();

  if (reduced) { frame(1.2); } else { loop(); }

  /* ---- debugging / visual-tuning hook (harmless in production) ---- */
  window.__slayerDebug = {
    render: function (fmt, q) {
      renderer.render(scene, camera);
      var c = document.createElement("canvas");
      var w = canvas.width, h = canvas.height;
      var sc = Math.min(1, 340 / Math.max(w, h));
      c.width = Math.round(w * sc); c.height = Math.round(h * sc);
      c.getContext("2d").drawImage(canvas, 0, 0, c.width, c.height);
      return c.toDataURL(fmt || "image/png", q);
    },
    crop: function (x, y, w, h) {
      renderer.render(scene, camera);
      var c = document.createElement("canvas");
      var sc = Math.min(1, 340 / Math.max(w, h));
      c.width = Math.round(w * sc); c.height = Math.round(h * sc);
      c.getContext("2d").drawImage(canvas, x, y, w, h, 0, 0, c.width, c.height);
      return c.toDataURL("image/png");
    },
    /* ascii luminance map — lets the agent "see" without screenshots */
    ascii: function (step) {
      renderer.render(scene, camera);
      var c = document.createElement("canvas");
      var sc = Math.min(1, 340 / Math.max(canvas.width, canvas.height));
      c.width = 300; c.height = Math.max(10, Math.round(300 * canvas.height / canvas.width));
      var g = c.getContext("2d");
      g.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, c.width, c.height);
      var d = g.getImageData(0, 0, c.width, c.height).data;
      step = step || 10;
      var rows = [];
      for (var y = 0; y < c.height; y += step) {
        var line = "";
        for (var x = 0; x < c.width; x += step) {
          var i = (y * c.width + x) * 4;
          var l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
          line += l < 18 ? " " : (l < 42 ? "." : (l < 85 ? "+" : (l < 160 ? "#" : "@")));
        }
        rows.push(line);
      }
      return rows.join("\n");
    },
    probe: function (x, y) {
      renderer.render(scene, camera);
      var c = document.createElement("canvas");
      c.width = canvas.width; c.height = canvas.height;
      var g = c.getContext("2d");
      g.drawImage(canvas, 0, 0);
      var px = g.getImageData(x, y, 1, 1).data;
      return [px[0], px[1], px[2]];
    },
    set: function (o) {
      if (o.facing != null) flagFacing = o.facing;
      if (o.lookY != null) camera.lookAt(0, o.lookY, 0);
      if (o.rotY != null) fig.rotation.y = o.rotY;
      if (o.rotX != null) fig.rotation.x = o.rotX;
    },
    /* force canvas size (desktop-portrait test from a small window) */
    force: function (w, h) {
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      if (h < 10 || w > 1400) { w = 480; h = 640; }
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      var vert = camera.aspect < 0.72 ? 2.72 : (camera.aspect < 1.15 ? 2.95 : 3.1);
      var dist = (vert * 0.5) / Math.tan(16 * Math.PI / 180);
      camera.position.set(0, 1.34, dist);
      camera.lookAt(0, 0.99, 0);
      camera.updateProjectionMatrix();
    },
    /* play any clip by name (test/tuning helper) */
    step: function (dt) {
      if (mixer) mixer.update(dt || 0.033);
      renderer.render(scene, camera);
    },
    play: function (name, once) {
      var a = act(name);
      if (!a) return false;
      a.setLoop(THREE.LoopOnce, 1);
      a.clampWhenFinished = false;
      a.reset().fadeIn(0.12).play();
      activeAction = a;
      return true;
    },
    figure: function () { return fig && fig.children[0]; },
    clips: function () { return window.__slayerClips || []; }
  };
})();
