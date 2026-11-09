/* ============================================================
   AMIER — the slayer, in true 3D · three.js r149 (vendored)
   A stylized toon-shaded character with the same facial features:
   short black curly hair · round silver glasses · light beard ·
   black haori with crimson lining · katana in hand.
   Renders in the hero stage. Mouse-parallax + idle breathing.
   Zero network calls. Falls back silently if WebGL is missing.
   ============================================================ */
(function () {
  "use strict";

  var canvas = document.getElementById("slayer");
  var stage = document.getElementById("heroStage");
  if (!canvas || !stage || typeof THREE === "undefined") return;

  /* ---------- tiny helpers ---------- */
  function limbMat(color) {
    var m = new THREE.MeshToonMaterial({ color: color });
    m.gradientMap = gradTex;
    return m;
  }
  var gradTex = (function () {
    var data = new Uint8Array([ 84, 84, 84, 158, 158, 158, 255, 255, 255 ]);
    var t = new THREE.DataTexture(data, 3, 1, THREE.RGBFormat);
    t.minFilter = THREE.NearestFilter;
    t.magFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    return t;
  })();

  /* cylinder spanned from point a to b (positioned, rotated, scaled) */
  function limb(from, to, r2, r1, mat) {
    var fromV = new THREE.Vector3().fromArray(from);
    var toV = new THREE.Vector3().fromArray(to);
    var dir = new THREE.Vector3().subVectors(toV, fromV);
    var len = dir.length();
    var geo = new THREE.CylinderGeometry(r2, r1, len, 14); /* top radius first! */
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(fromV).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return mesh;
  }

  function ball(x, y, z, r, mat, sx, sy, sz, rotX) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(r, 22, 16), mat);
    m.position.set(x, y, z);
    if (sx) m.scale.set(sx, sy, sz);
    if (rotX) m.rotation.x = rotX;
    return m;
  }

  function box(x, y, z, w, h, d, mat, rz, rx, ry) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (rz) m.rotation.z = rz;
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    return m;
  }

  /* ---------- renderer / scene ---------- */
  var renderer, scene, camera, ok = true;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  } catch (e) { ok = false; }
  if (ok && !renderer.getContext() ) ok = false;

  if (!ok) { stage.classList.add("no-webgl"); canvas.style.display = "none"; return; }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  camera.position.set(0, 1.42, 4.9);
  camera.lookAt(0, 0.97, 0);

  /* ---------- palette ---------- */
  var C = {
    skin:    0xe0a873,
    skin2:   0xd09560,   /* shaded skin (chin plug) */
    hair:    0x17110d,
    beard:   0x4a3524,
    eye:     0x1d1109,
    black:   0x1b1a20,   /* haori / hakama */
    black2:  0x141319,   /* sleeves, saya */
    crimson: 0xb52a1e,
    crimson2:0x8e1f14,
    bone:    0xe8e4d8,
    steel:   0xcfd6e0,
    silver:  0xc9cdd4,
    glassy:  0xbcd7e8
  };

  var mSkin    = limbMat(C.skin);
  var mSkin2   = limbMat(C.skin2);
  var mHair    = limbMat(C.hair);
  var mBeard   = limbMat(C.beard);
  var mBlack   = limbMat(C.black);
  var mBlack2  = limbMat(C.black2);
  var mCrims   = limbMat(C.crimson);
  var mBone    = limbMat(C.bone);
  var mSteel   = new THREE.MeshStandardMaterial({ color: C.steel, metalness: 0.95, roughness: 0.26 });
  var mSilver  = new THREE.MeshStandardMaterial({ color: 0xf2f5f8, metalness: 0.3, roughness: 0.25, emissive: 0x8d959e, emissiveIntensity: 0.5 });
  var mGlass   = new THREE.MeshStandardMaterial({ color: C.glassy, transparent: true, opacity: 0.14, roughness: 0.1, metalness: 0.4 });
  var mSclera  = limbMat(0xe3ded0);
  var mEye     = limbMat(C.eye);
  var mHakama  = limbMat(0x242330);

  /* ——— lights ——— */
  scene.add(new THREE.HemisphereLight(0x504a56, 0x1a0d08, 0.62));
  var key = new THREE.DirectionalLight(0xfff1e0, 1.5);   key.position.set(1.6, 2.6, 2.6);
  var rim = new THREE.PointLight(0xd43425, 2.2, 9);     rim.position.set(-1.9, 1.85, -1.6);
  var emberUp = new THREE.PointLight(0xd43425, 0.85, 6); emberUp.position.set(0.8, 0.2, 1.9);
  var face = new THREE.PointLight(0xffd9a8, 0.85, 6);   face.position.set(0.55, 1.5, 2.3);
  var fill = new THREE.DirectionalLight(0x7f96c9, 0.15); fill.position.set(-1.6, 0.9, 2.2);
  scene.add(key, rim, emberUp, face, fill);

  /* ---------- ground: contact shadow + crimson floor light ---------- */
  function radialTex(inner, outer) {
    var cv = document.createElement("canvas"); cv.width = cv.height = 256;
    var cx = cv.getContext("2d");
    var g = cx.createRadialGradient(128, 128, 10, 128, 128, 126);
    g.addColorStop(0, inner); g.addColorStop(1, outer);
    cx.fillStyle = g; cx.fillRect(0, 0, 256, 256);
    var t = new THREE.CanvasTexture(cv); return t;
  }
  var shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15),
    new THREE.MeshBasicMaterial({ map: radialTex("rgba(0,0,0,0.72)", "rgba(0,0,0,0)"), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; scene.add(shadow);

  var glow = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3),
    new THREE.MeshBasicMaterial({ map: radialTex("rgba(212,52,37,0.26)", "rgba(212,52,37,0)"), transparent: true, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.set(-0.12, 0.001, 0.2); scene.add(glow);

  /* ============================================================
     THE CHARACTER
     ============================================================ */
  var fig = new THREE.Group();
  var breath = new THREE.Group();     /* torso+head bob on breath */
  fig.add(breath);
  scene.add(fig);

  /* ——— legs · hakama ——— */
  var legL = limb([-0.10, 0.62, 0], [-0.10, 0.05, 0.01], 0.165, 0.115, mHakama);
  var legR = limb([ 0.10, 0.62, 0], [ 0.10, 0.05, 0.01], 0.165, 0.115, mHakama);
  legL.scale.z = 0.82; legR.scale.z = 0.82;
  fig.add(legL, legR);
  /* crimson anklets so the dark legs keep an edge in the abyss */
  fig.add(limb([-0.098, 0.135, 0.028], [-0.098, 0.055, 0.032], 0.168, 0.15, mCrims));
  fig.add(limb([ 0.098, 0.135, 0.028], [ 0.098, 0.055, 0.032], 0.168, 0.15, mCrims));
  /* hakama center pleat shadows */
  fig.add(box(0, 0.60, 0.075, 0.34, 0.05, 0.03, mBlack2, 0, -0.12));
  /* sandals */
  fig.add(box(-0.105, 0.022, 0.035, 0.115, 0.035, 0.26, mBlack2));
  fig.add(box( 0.105, 0.022, 0.035, 0.115, 0.035, 0.26, mBlack2));

  /* ——— torso · black haori, crimson lining ——— */
  var torso = new THREE.Group();
  var chest = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.165, 0.56, 22), mBlack);
  chest.position.y = 0.98; chest.scale.z = 0.74;
  torso.add(chest);
  /* haori hem flare over hips */
  var hem = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.245, 0.20, 22, 1, true), mBlack.clone());
  hem.material.side = THREE.DoubleSide;
  hem.position.y = 0.62; hem.scale.z = 0.78;
  torso.add(hem);
  /* crimson inner lining — two lapels crossing into a V */
  torso.add(box(-0.088, 1.12, 0.10, 0.026, 0.36, 0.055, mCrims, 0.15));
  torso.add(box( 0.088, 1.12, 0.10, 0.026, 0.36, 0.055, mCrims, -0.15));
  /* obi (belt) */
  var obi = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.036, 12, 26), mCrims);
  obi.rotation.x = Math.PI / 2; obi.position.y = 0.735; obi.scale.z = 0.72;
  obi.scale.y = 0.72;
  torso.add(obi);
  /* crimson knot at the left hip */
  torso.add(box(-0.185, 0.72, 0.085, 0.055, 0.10, 0.045, mBone, 0.2));
  /* crimson hem ring where the haori meets the dark */
  torso.add((function () {
    var ring = new THREE.Mesh(new THREE.CylinderGeometry(0.226, 0.244, 0.03, 24, 1, true), mCrims.clone());
    ring.material.side = THREE.DoubleSide;
    ring.position.y = 0.525; ring.scale.z = 0.78;
    return ring;
  })());
  breath.add(torso);

  /* ——— shoulders + arms ——— */
  fig.add(ball(-0.20, 1.235, 0.01, 0.09, mBlack));
  fig.add(ball( 0.20, 1.235, 0.01, 0.09, mBlack));
  /* collar ridge */
  breath.add(limb([-0.085, 1.30, 0.09], [0.085, 1.30, 0.09], 0.032, 0.038, mBlack));

  /* right arm — raised, holds the katana forward */
  var shoulderR = [0.23, 1.225, 0.015], elbowR = [0.325, 1.015, 0.085], handR = [0.235, 1.14, 0.31];
  fig.add(limb(shoulderR, elbowR, 0.052, 0.058, mBlack));
  fig.add(limb(elbowR, handR, 0.06, 0.13, mBlack));      /* wide sleeve */
  fig.add(limb([0.27, 1.075, 0.205], handR, 0.046, 0.05, mSkin));  /* forearm peeking */
  var handRm = ball(handR[0], handR[1], handR[2], 0.055, mSkin);
  fig.add(handRm);

  /* left arm — resting, grips the saya at the hip */
  var shoulderL = [-0.23, 1.225, 0.015], elbowL = [-0.32, 1.0, 0.045], handL = [-0.19, 0.955, 0.165];
  fig.add(limb(shoulderL, elbowL, 0.052, 0.058, mBlack));
  fig.add(limb(elbowL, handL, 0.058, 0.125, mBlack));
  fig.add(limb([-0.25, 0.975, 0.12], handL, 0.044, 0.048, mSkin));
  fig.add(ball(handL[0], handL[1], handL[2], 0.052, mSkin));

  /* ——— saya (sheath) tucked through the left hand ——— */
  fig.add(limb([-0.175, 0.93, 0.185], [-0.42, 0.78, -0.16], 0.016, 0.019, mBlack2));
  fig.add(limb([-0.415, 0.785, -0.15], [-0.435, 0.775, -0.185], 0.021, 0.021, mCrims)); /* end cap */

  /* ——— katana in the right hand ——— */
  var gripDir = new THREE.Vector3(0.17, 0.56, -0.16).normalize();
  var handP = new THREE.Vector3().fromArray(handR);
  var bladeOut = new THREE.Vector3().copy(handP).addScaledVector(gripDir, 0.9);
  var tsukaB  = new THREE.Vector3().copy(handP).addScaledVector(gripDir, -0.13);
  /* blade */
  fig.add(limb([handP.x + gripDir.x * 0.06, handP.y + gripDir.y * 0.06, handP.z + gripDir.z * 0.06],
               [bladeOut.x, bladeOut.y, bladeOut.z], 0.0075, 0.0135, mSteel));
  /* crimson hamon tip edge */
  var tipP = new THREE.Vector3().copy(handP).addScaledVector(gripDir, 0.9);
  fig.add(limb([tipP.x - gripDir.x * 0.1, tipP.y - gripDir.y * 0.1, tipP.z - gripDir.z * 0.1],
               [tipP.x, tipP.y, tipP.z], 0.0075, 0.001, mSteel));
  /* tsuba (guard) */
  var tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.012, 20), mSilver);
  tsuba.position.copy(handP).addScaledVector(gripDir, 0.055);
  tsuba.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), gripDir);
  fig.add(tsuba);
  /* tsuka (grip) + crimson wrap */
  fig.add(limb([handP.x - gripDir.x * 0.02, handP.y - gripDir.y * 0.02, handP.z - gripDir.z * 0.02],
               [tsukaB.x, tsukaB.y, tsukaB.z], 0.02, 0.023, mBlack2));
  fig.add(limb([handP.x - gripDir.x * 0.09, handP.y - gripDir.y * 0.09, handP.z - gripDir.z * 0.09],
               [handP.x - gripDir.x * 0.045, handP.y - gripDir.y * 0.045, handP.z - gripDir.z * 0.045], 0.021, 0.022, mCrims));

  /* ——— head ——— */
  var head = new THREE.Group();
  head.position.set(0, 1.445, 0);
  breath.add(head);
  var skull = ball(0, 0, 0, 0.150, mSkin, 0.92, 1.0, 0.94);
  head.add(skull);
  head.add(ball(0, -0.075, 0.075, 0.072, mSkin2, 1.12, 0.72, 0.95)); /* jaw */
  head.add(ball( 0.146, 0.005, -0.01, 0.028, mSkin));  /* ears */
  head.add(ball(-0.146, 0.005, -0.01, 0.028, mSkin));
  head.add(ball(0, -0.01, 0.148, 0.021, mSkin2, 0.8, 0.95, 1)); /* nose */
  /* eyes behind the lenses — white sclera + dark pupil reads at any size */
  head.add(ball( 0.058, 0.005, 0.100, 0.028, mSclera, 1, 0.8, 0.42));
  head.add(ball(-0.058, 0.005, 0.100, 0.028, mSclera, 1, 0.8, 0.42));
  head.add(ball( 0.058, 0.002, 0.104, 0.0125, mEye, 1, 1, 0.5));
  head.add(ball(-0.058, 0.002, 0.104, 0.0125, mEye, 1, 1, 0.5));
  /* brows */
  head.add(box( 0.058, 0.055, 0.126, 0.042, 0.01, 0.012, mHair, -0.10));
  head.add(box(-0.058, 0.055, 0.126, 0.042, 0.01, 0.012, mHair,  0.10));
  /* light beard — jaw shading only (must stay clear of the face front) */
  var beard = ball(0, -0.095, 0.012, 0.128, mBeard, 0.9, 0.5, 0.84);
  head.add(beard);
  head.add(box(0, -0.036, 0.143, 0.05, 0.012, 0.014, mBeard));
  /* round silver glasses */
  var glasses = new THREE.Group();
  glasses.position.set(0, 0.008, 0.126);
  var ringGeo = new THREE.TorusGeometry(0.048, 0.0065, 10, 26);
  var ringR = new THREE.Mesh(ringGeo, mSilver); ringR.position.set( 0.058, 0, 0);
  var ringL = new THREE.Mesh(ringGeo, mSilver); ringL.position.set(-0.058, 0, 0);
  var bridge = limb([0, 0.02, 0.004], [0.016, 0.018, 0.004], 0.004, 0.004, mSilver);
  glasses.add(ringR, ringL, bridge);
  glasses.add(new THREE.Mesh(new THREE.CircleGeometry(0.0455, 24), mGlass).translateX( 0.058).translateY(0).translateZ(-0.004));
  glasses.add(new THREE.Mesh(new THREE.CircleGeometry(0.0455, 24), mGlass).translateX(-0.058).translateY(0).translateZ(-0.004));
  /* temple arms */
  glasses.add(limb([0.107, 0.004, 0], [0.142, 0.012, -0.09], 0.0035, 0.0035, mSilver));
  glasses.add(limb([-0.107, 0.004, 0], [-0.142, 0.012, -0.09], 0.0035, 0.0035, mSilver));
  head.add(glasses);
  /* black curly hair — cap raised off the forehead + curl cluster */
  var hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.152, 24, 18, 0, Math.PI * 2, 0, 1.04),
    mHair
  );
  hairCap.position.set(0, 0.022, -0.018);
  hairCap.rotation.x = -0.12;
  head.add(hairCap);
  var curls = [
    [ 0.075, 0.150,  0.062], [-0.075, 0.150,  0.062], [ 0.115, 0.125,  0.010], [-0.115, 0.125,  0.010],
    [ 0.095, 0.148, -0.055], [-0.095, 0.148, -0.055], [ 0.040, 0.165, -0.010], [-0.040, 0.165, -0.010],
    [ 0.005, 0.168,  0.045], [ 0.120, 0.105, -0.075], [-0.120, 0.105, -0.075], [ 0.118, 0.075, -0.115],
    [-0.118, 0.075, -0.115], [ 0.090, 0.115, -0.125], [-0.090, 0.115, -0.125], [ 0.062, 0.045, -0.150],
    [-0.062, 0.045, -0.150], [ 0.140, 0.090,  0.000], [-0.140, 0.090,  0.000],
    [ 0.105, 0.150,  0.060], [-0.105, 0.150,  0.060], [ 0.065, 0.158,  0.095], [-0.065, 0.158,  0.095],
    [ 0.005, 0.162,  0.115]
  ];
  for (var ci = 0; ci < curls.length; ci++) {
    var cr = curls[ci];
    head.add(ball(cr[0], cr[1], cr[2], 0.030 + (ci % 4) * 0.008, mHair));
  }

  /* ============================================================
     motion · breath + parallax + blade sway
     ============================================================ */
  var clock = new THREE.Clock();
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var px = 0, py = 0, tpx = 0, tpy = 0;
  var visible = true;

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
    t = t || clock.getElapsedTime();
    var k = reduced ? 0 : 1;

    /* idle breathing + weight shift */
    breath.position.y = k * Math.sin(t * 1.5) * 0.012;
    breath.rotation.z = k * Math.sin(t * 0.8 + 1) * 0.008;
    chest.scale.y = 1 + k * Math.sin(t * 1.5) * 0.012;

    /* mouse parallax toward the cursor */
    px += (tpx - px) * 0.06;
    py += (tpy - py) * 0.06;
    fig.rotation.y = k * (0.05 + px * 0.30);
    fig.rotation.x = k * (py * 0.05);

    renderer.render(scene, camera);
  }

  function loop() {
    if (visible) frame();
    requestAnimationFrame(loop);
  }

  function resize() {
    var box = canvas.parentElement || stage;
    var w = box.clientWidth || 480;
    var h = box.clientHeight || 640;
    if (w > 1400 || h < 10) { w = 480; h = 640; }
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    /* frame the whole figure smoothly whatever the canvas shape */
    var vert = camera.aspect < 0.72 ? 2.6 : (camera.aspect < 1.15 ? 2.35 : 2.15);
    var dist = (vert * 0.5) / Math.tan(16 * Math.PI / 180);
    camera.position.set(0, 1.28, dist);
    camera.lookAt(0, 0.93, 0);
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  if (reduced) { frame(1.2); }
  else { loop(); }

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
      var dvw = canvas.width, dvh = canvas.height;
      c.width = 300; c.height = Math.max(10, Math.round(300 * dvh / dvw));
      var g = c.getContext("2d");
      g.drawImage(canvas, 0, 0, c.width, c.height);
      var px = g.getImageData(0, 0, c.width, c.height).data;
      step = step || 10;
      var rows = [];
      for (var y = 0; y < c.height; y += step) {
        var line = "";
        for (var x = 0; x < c.width; x += step) {
          var i = (y * c.width + x) * 4;
          var l = px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
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
      if (o.camX != null) camera.position.x = o.camX;
      if (o.camY != null) camera.position.y = o.camY;
      if (o.camZ != null) camera.position.z = o.camZ;
      if (o.lookY != null) camera.lookAt(0, o.lookY, 0);
      if (o.rotY != null) fig.rotation.y = o.rotY;
      if (o.rotX != null) fig.rotation.x = o.rotX;
      camera.updateProjectionMatrix();
    },
    /* force canvas size (desktop-portrait test from a small window) */
    force: function (w, h) {
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      var vert = camera.aspect < 0.72 ? 2.6 : (camera.aspect < 1.15 ? 2.35 : 2.15);
      var dist = (vert * 0.5) / Math.tan(16 * Math.PI / 180);
      camera.position.set(0, 1.28, dist);
      camera.lookAt(0, 0.93, 0);
      camera.updateProjectionMatrix();
    }
  };
})();
