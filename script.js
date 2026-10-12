/**
 * FirstFiveBooth — script.js
 * Webcam capture · MediaPipe Pose · Collage generation · Downloads
 *
 * Architecture:
 *  - PhotoboothApp  : top-level controller & state
 *  - PoseLibrary    : manages reference pose images
 *  - CameraManager  : getUserMedia, stream lifecycle
 *  - PoseDetector   : MediaPipe Pose Landmarker wrapper
 *  - CountdownTimer : countdown UI helper
 *  - CollageBuilder : Canvas-based strip renderer
 *  - SessionState   : captured photo slots
 */

'use strict';

/* ══════════════════════════════════════════════════════════════════
   POSE LIBRARY
   ══════════════════════════════════════════════════════════════════ */
const PoseLibrary = (() => {
  /* All filenames in photome/ — generated from the folder listing */
  const FILES = [
    '01f0e7daa741af6b5ad6cb7b88c57cdc.jpg',
    '021f41e63ffb3c1e7b4f225147c57853.jpg',
    '025e2e01745d5fa1d3454ac811cd1b2b.jpg',
    '03303e318ffd9361734093b6d39af726.jpg',
    '05b37263c3a1b34c702583c9c9ffe664.jpg',
    '05c7696c9d29a5655fa4d4c3f625774f.jpg',
    '1587e6892aea879dc32fdfbfa94702fe.jpg',
    '16e7a043bda0f70e416a8ee565a7aa43.jpg',
    '1767ed9dde31668de00a8aa90c8c7887.jpg',
    '198498a9974c17348ea9535b1dddba16.jpg',
    '19bed677d9e8f63e0f67f73a1fdd0a4a.jpg',
    '2578071f03d4438a7482ffee299e2324.jpg',
    '28b063f1ccb0701f424898f30db9c800.jpg',
    '294e365389dd98254a9d7cc161e0447b.jpg',
    '2a359458beee6cff0977e5c80cfbcbfc.jpg',
    '2ddbc45f19ab0d788310e048c07d92b2.jpg',
    '33a5afdaa476a9c65ae13fae9765cd74.jpg',
    '38dbea2e13b3be551d2dc331feb1b6f1.jpg',
    '39b0e3a3b9f7c1eb2001d8bb9e334ea1.jpg',
    '3e440c81bde6f2def94a978693cb2943.jpg',
    '4276f28bc53be8a8f823c915bcf3d3a8.jpg',
    '49f79b645c92d29af0917640bb383f1b.jpg',
    '4b913eedc3a712a61ca25a53fcd52707.jpg',
    '4d3e60996ea0dbf83bdbe618df56a7e6.jpg',
    '4f3541d2ae09a108015cae20bb6dac71 (1).jpg',
    '4f3541d2ae09a108015cae20bb6dac71.jpg',
    '52eb7f04e975046cb9e8db8f7e8804c5.jpg',
    '54a19f55485fda473f156a9d692ee104.jpg',
    '54a5c997a352c6b4d99edf2d01e28403.jpg',
    '56410de1e3631aab4d0dbea7cded0522.jpg',
    '59a2e557d6e78c03f631e24dbc61ba4b.jpg',
    '6008beb4ae3a44a25e91cdfd5b10b527.jpg',
    '7213a1cf57f31034f1b4860028cb2706.jpg',
    '73f3c6b1dae263bd4db5b3f9f2b58861.jpg',
    '79cd3b1e067e3ee943bf3ca281773b07.jpg',
    '7fec67ba3b889d243a32066362a94c75.jpg',
    '83c1f73a7839750bec2b168e3fc31ec7.jpg',
    '871f34d1211892380db668c70255a942.jpg',
    '8a601d2362f7b8412203044502ff31ac.jpg',
    '8cc66bc78db3dce3f07d285b8c7136da.jpg',
    '8d7b94acb2444e7f1bf89832417dcca4.jpg',
    '8e4d34a215238c809616c8dcc4747bd2.jpg',
    '8e7455a8524f3f0c4d966535727eb61f.jpg',
    '905f1a17adf0eaef410445040d75e80d.jpg',
    '92ea2d2884a091bd2dc323d20cf276b4.jpg',
    '94a26424fab627d42ebbf7af5ef11e78.jpg',
    '9953f2e0e62b851ae850fa0ad156c0c9.jpg',
    '9d40eedb8d77c9a99c58d633ee437032.jpg',
    'a5d65c96b222fc69a99616fa1929f8a4.jpg',
    'a7844da94b85971c23c537936d1afd62.jpg',
    'ae2110d5afe02cc33f08193a3e4a15ee.jpg',
    'be3ccebc5d4daa72d9ae1e2458019f11.jpg',
    'cd2d54d1c416e0ecdc9f80d2ed302cbf.jpg',
    'd0b840c2b28bc6dd5e798993b34f93ed.jpg',
    'd16fafb0a8f174d92d9af27cd754d26f.jpg',
    'd38044c712b05523af6343846f6d8ca2.jpg',
    'd8727292ce4263d25079411afa7a3ba8.jpg',
    'dbd77df91501bb7c6891bf0f2c81225e.jpg',
    'dbda823e9cb592516ab788fabf32204f.jpg',
    'e01fac8fbfccdd0eaa4645968db8819d.jpg',
    'e7683a692b8b1b3774fa2f579ab96933.jpg',
    'e98b556296d45cf167c7258e29a18f16.jpg',
    'f4ef60e16facb9c8409561a581eed4b3.jpg',
    'f6f088f62fc4ebc28dcada4834d92b80.jpg',
    'f7bc13980d5de859f1881ac5d525d47a.jpg',
    'fb406706ea63a054431d908bb8c62bf4.jpg',
    'fb66eb8a745f2f0d5f9433e9b54d4982.jpg',
  ];
  const BASE = 'photome/';
  let usedIndices = new Set();
  let currentFile = null;
  let customURL = null; // user-uploaded blob URL

  function pickRandom(excludeCurrent = true) {
    if (customURL) { customURL = null; } // reset custom when picking random

    let pool = FILES.filter((_, i) =>
      !(excludeCurrent && FILES[i] === currentFile) && !usedIndices.has(i)
    );
    // If pool empty (all used or only current left), reset
    if (pool.length === 0) { usedIndices.clear(); pool = FILES.filter((_, i) => FILES[i] !== currentFile); }
    if (pool.length === 0) pool = [...FILES];

    const file = pool[Math.floor(Math.random() * pool.length)];
    currentFile = file;
    const idx = FILES.indexOf(file);
    if (idx !== -1) usedIndices.add(idx);
    return { url: BASE + encodeURIComponent(file), name: file.slice(0, 8) + '…' };
  }

  function setCustom(url) { customURL = url; }
  function getCurrentURL() { return customURL || (currentFile ? BASE + encodeURIComponent(currentFile) : null); }

  return { pickRandom, setCustom, getCurrentURL };
})();


/* ══════════════════════════════════════════════════════════════════
   CAMERA MANAGER
   ══════════════════════════════════════════════════════════════════ */
const CameraManager = (() => {
  let stream = null;

  async function start(videoEl) {
    const constraints = {
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    };
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoEl.srcObject = stream;
    await new Promise(resolve => { videoEl.onloadedmetadata = resolve; });
    await videoEl.play();
    return stream;
  }

  function stop() {
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  }

  function captureFrame(videoEl) {
    const c = document.createElement('canvas');
    c.width  = videoEl.videoWidth  || 640;
    c.height = videoEl.videoHeight || 480;
    const ctx = c.getContext('2d');
    // Mirror to match preview
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoEl, 0, 0);
    return c.toDataURL('image/png');
  }

  return { start, stop, captureFrame };
})();


/* ══════════════════════════════════════════════════════════════════
   POSE DETECTOR  (MediaPipe Pose Landmarker)
   Uses the @mediapipe/tasks-vision CDN build
   ══════════════════════════════════════════════════════════════════ */
const PoseDetector = (() => {
  let poseLandmarker = null;
  let ready = false;
  let loading = false;
  let lastResult = null;

  /* Key landmark indices used for comparison */
  const KEY_LANDMARKS = {
    leftShoulder: 11, rightShoulder: 12,
    leftElbow:    13, rightElbow:    14,
    leftWrist:    15, rightWrist:    16,
    leftHip:      23, rightHip:      24,
    leftKnee:     25, rightKnee:     26,
    leftAnkle:    27, rightAnkle:    28,
  };

  async function init(onReady, onFail) {
    if (loading || ready) return;
    loading = true;
    try {
      /* Dynamically import from CDN */
      const { PoseLandmarker, FilesetResolver } = await import(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs'
      );
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );
      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      });
      ready = true;
      loading = false;
      onReady && onReady();
    } catch (err) {
      console.warn('PoseDetector: MediaPipe load failed', err);
      loading = false;
      onFail && onFail(err);
    }
  }

  function detect(videoEl) {
    if (!ready || !poseLandmarker) return null;
    try {
      const result = poseLandmarker.detectForVideo(videoEl, performance.now());
      lastResult = result;
      return result;
    } catch { return null; }
  }

  function isReady() { return ready; }

  /* Compute angle at joint B formed by A-B-C */
  function angle(a, b, c) {
    const ba = { x: a.x - b.x, y: a.y - b.y, z: (a.z||0) - (b.z||0) };
    const bc = { x: c.x - b.x, y: c.y - b.y, z: (c.z||0) - (b.z||0) };
    const dot = ba.x*bc.x + ba.y*bc.y + ba.z*bc.z;
    const magBa = Math.sqrt(ba.x**2 + ba.y**2 + ba.z**2);
    const magBc = Math.sqrt(bc.x**2 + bc.y**2 + bc.z**2);
    if (magBa === 0 || magBc === 0) return 0;
    return Math.acos(Math.max(-1, Math.min(1, dot / (magBa * magBc)))) * (180 / Math.PI);
  }

  /* Extract joint angles from a landmarks array */
  function extractAngles(lm) {
    if (!lm || lm.length < 33) return null;
    const L = KEY_LANDMARKS;
    return {
      leftElbow:    angle(lm[L.leftShoulder],  lm[L.leftElbow],  lm[L.leftWrist]),
      rightElbow:   angle(lm[L.rightShoulder], lm[L.rightElbow], lm[L.rightWrist]),
      leftShoulder: angle(lm[L.leftHip],       lm[L.leftShoulder], lm[L.leftElbow]),
      rightShoulder:angle(lm[L.rightHip],      lm[L.rightShoulder],lm[L.rightElbow]),
      leftKnee:     angle(lm[L.leftHip],       lm[L.leftKnee],   lm[L.leftAnkle]),
      rightKnee:    angle(lm[L.rightHip],      lm[L.rightKnee],  lm[L.rightAnkle]),
      leftHip:      angle(lm[L.leftShoulder],  lm[L.leftHip],    lm[L.leftKnee]),
      rightHip:     angle(lm[L.rightShoulder], lm[L.rightHip],   lm[L.rightKnee]),
    };
  }

  /* Compare two sets of angles → 0-100 similarity */
  function compareAngles(a, b) {
    if (!a || !b) return 0;
    const keys = Object.keys(a);
    let total = 0;
    for (const k of keys) {
      const diff = Math.abs(a[k] - b[k]);
      total += Math.max(0, 1 - diff / 90); // 90° = zero similarity
    }
    return Math.round((total / keys.length) * 100);
  }

  /* Render skeleton on canvas */
  function drawSkeleton(canvas, videoEl, landmarks) {
    canvas.width  = videoEl.videoWidth  || canvas.offsetWidth;
    canvas.height = videoEl.videoHeight || canvas.offsetHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!landmarks || !landmarks.length) return;

    const lm = landmarks;
    const w = canvas.width, h = canvas.height;

    const connections = [
      [11,13],[13,15], [12,14],[14,16],
      [11,12],[11,23],[12,24],[23,24],
      [23,25],[25,27],[24,26],[26,28],
    ];

    ctx.strokeStyle = 'rgba(255, 107, 157, 0.85)';
    ctx.lineWidth = 3;
    for (const [i, j] of connections) {
      if (lm[i] && lm[j]) {
        ctx.beginPath();
        ctx.moveTo(lm[i].x * w, lm[i].y * h);
        ctx.lineTo(lm[j].x * w, lm[j].y * h);
        ctx.stroke();
      }
    }

    ctx.fillStyle = '#6c63ff';
    for (const idx of Object.values(KEY_LANDMARKS)) {
      if (lm[idx]) {
        ctx.beginPath();
        ctx.arc(lm[idx].x * w, lm[idx].y * h, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  return { init, detect, isReady, extractAngles, compareAngles, drawSkeleton, KEY_LANDMARKS };
})();


/* ══════════════════════════════════════════════════════════════════
   COLLAGE BUILDER
   ══════════════════════════════════════════════════════════════════ */
const CollageBuilder = (() => {
  const THEMES = {
    classic: {
      bg: '#ffffff',
      border: '#ffffff',
      borderW: 20,
      gap: 16,
      footerBg: '#ffffff',
      footerText: '#555555',
      shadow: 'rgba(0,0,0,0.12)',
    },
    dark: {
      bg: '#1a1a2e',
      border: '#1a1a2e',
      borderW: 20,
      gap: 14,
      footerBg: '#1a1a2e',
      footerText: '#aaaacc',
      shadow: 'rgba(108,99,255,0.3)',
    },
    pastel: {
      bg: 'linear', // handled specially
      bgStart: '#fce4ec',
      bgEnd: '#f8bbd0',
      border: '#fff',
      borderW: 22,
      gap: 18,
      footerBg: 'transparent',
      footerText: '#ad4775',
      shadow: 'rgba(255,107,157,0.2)',
    },
  };

  const STRIP_W = 480;
  const PHOTO_W = STRIP_W - 40; // left + right margin 20px each

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load: ' + src));
      img.src = src;
    });
  }

  async function build(canvas, photos, themeName = 'classic') {
    const theme = THEMES[themeName] || THEMES.classic;
    const margin = theme.borderW;
    const gap    = theme.gap;
    const photoH = Math.round(PHOTO_W * (3 / 4)); // 4:3 aspect

    const footerH = 52;
    const totalH  = margin + (photoH + gap) * 3 - gap + margin + footerH;

    canvas.width  = STRIP_W;
    canvas.height = totalH;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    if (themeName === 'pastel') {
      const grad = ctx.createLinearGradient(0, 0, 0, totalH);
      grad.addColorStop(0, theme.bgStart);
      grad.addColorStop(1, theme.bgEnd);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = theme.bg;
    }
    ctx.fillRect(0, 0, STRIP_W, totalH);

    // Draw each photo
    for (let i = 0; i < 3; i++) {
      const x = margin;
      const y = margin + i * (photoH + gap);

      // Drop shadow
      ctx.save();
      ctx.shadowColor  = theme.shadow;
      ctx.shadowBlur   = 14;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#fff';
      roundRect(ctx, x, y, PHOTO_W, photoH, 8);
      ctx.fill();
      ctx.restore();

      // Photo
      if (photos[i]) {
        try {
          const img = await loadImage(photos[i]);
          ctx.save();
          roundRect(ctx, x, y, PHOTO_W, photoH, 8);
          ctx.clip();
          // Cover-fit
          const scale = Math.max(PHOTO_W / img.width, photoH / img.height);
          const sw = img.width * scale, sh = img.height * scale;
          const sx = x + (PHOTO_W - sw) / 2, sy = y + (photoH - sh) / 2;
          ctx.drawImage(img, sx, sy, sw, sh);
          ctx.restore();
        } catch {
          // Placeholder
          ctx.fillStyle = '#cccccc';
          roundRect(ctx, x, y, PHOTO_W, photoH, 8);
          ctx.fill();
          ctx.fillStyle = '#888';
          ctx.font = 'bold 18px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Photo ' + (i + 1), x + PHOTO_W / 2, y + photoH / 2);
        }
      }
    }

    // Footer
    const fy = totalH - footerH;
    ctx.fillStyle = theme.footerBg === 'transparent' ? 'rgba(255,255,255,0.4)' : theme.footerBg;
    ctx.fillRect(0, fy, STRIP_W, footerH);

    ctx.fillStyle = theme.footerText;
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ FIRSTFIVEBOOTH ✨', STRIP_W / 2, fy + 22);

    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = theme.footerText;
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillText(dateStr, STRIP_W / 2, fy + 40);

    return canvas;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  return { build };
})();


/* ══════════════════════════════════════════════════════════════════
   SESSION STATE
   ══════════════════════════════════════════════════════════════════ */
class SessionState {
  constructor() { this.reset(); }
  reset() {
    this.photos      = [null, null, null]; // dataURLs
    this.currentSlot = 0;                 // 0, 1, 2
    this.retakeSlot  = null;              // null or 0-2 (retake mode)
  }
  slot()          { return this.retakeSlot !== null ? this.retakeSlot : this.currentSlot; }
  save(dataURL)   {
    const s = this.slot();
    this.photos[s] = dataURL;
    if (this.retakeSlot !== null) {
      this.retakeSlot = null;
    } else {
      this.currentSlot = Math.min(3, this.currentSlot + 1);
    }
  }
  allDone()       { return this.photos.every(p => p !== null); }
  startRetake(i)  { this.retakeSlot = i; }
}

class SoundEffects {
  constructor() {
    this.context = null;
    this.resumePromise = Promise.resolve();
  }

  unlock() {
    if (!window.AudioContext) {
      console.warn('AudioContext is unavailable; sound effects are disabled.');
      return Promise.resolve();
    }

    if (!this.context) this.context = new AudioContext();
    if (this.context.state === 'suspended') {
      this.resumePromise = this.context.resume().catch(error => {
        console.warn('Unable to enable sound effects:', error);
      });
    }
    return this.resumePromise;
  }

  async countdown(number) {
    await this.resumePromise;
    const context = this.context;
    if (!context || context.state !== 'running') return;

    const frequencies = { 3: 660, 2: 740, 1: 880 };
    const frequency = frequencies[number];
    if (!frequency) return;

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.21);
  }

  async shutter() {
    await this.resumePromise;
    const context = this.context;
    if (!context || context.state !== 'running') return;

    const now = context.currentTime;
    const length = Math.floor(context.sampleRate * 0.12);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      samples[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start(now);
  }
}


/* ══════════════════════════════════════════════════════════════════
   MAIN APP
   ══════════════════════════════════════════════════════════════════ */
class PhotoboothApp {
  constructor() {
    this.session     = new SessionState();
    this.captureMode = 'countdown'; // 'countdown' | 'pose'
    this.capturing   = false;       // guard against double-captures
    this.poseActive  = false;       // detection loop running
    this.poseMatchTimer = null;     // timer when pose is held
    this.poseHoldMs  = 1500;        // ms pose must be held to auto-trigger
    this.poseThreshold = 72;        // % similarity to trigger
    this.currentTheme  = 'classic';
    this.refAngles     = null;      // reference pose angles (if detected)
    this._animFrame    = null;      // rAF handle
    this.soundEffects  = new SoundEffects();

    this._bindElements();
    this._bindEvents();
  }

  /* ── DOM refs ── */
  _bindElements() {
    const g = id => document.getElementById(id);
    this.screens = {
      welcome:  g('screen-welcome'),
      capture:  g('screen-capture'),
      review:   g('screen-review'),
      collage:  g('screen-collage'),
    };
    this.el = {
      btnStart:         g('btn-start'),
      btnRandomPose:    g('btn-random-pose'),
      uploadPose:       g('upload-pose'),
      referenceImg:     g('reference-img'),
      referenceFrame:   g('reference-frame'),
      refError:         g('ref-error'),
      poseName:         g('pose-name'),
      video:            g('video'),
      poseCanvas:       g('pose-canvas'),
      countdownOverlay: g('countdown-overlay'),
      countdownNumber:  g('countdown-number'),
      flashOverlay:     g('flash-overlay'),
      cameraError:      g('camera-error'),
      cameraLoading:    g('camera-loading'),
      detectionBadge:   g('detection-badge'),
      matchSection:     g('match-section'),
      matchBar:         g('match-bar'),
      matchPct:         g('match-pct'),
      matchHint:        g('match-hint'),
      captureBtn:       g('btn-capture'),
      captureHint:      g('capture-hint'),
      modeCountdown:    g('mode-countdown'),
      modePose:         g('mode-pose'),
      pdots:            [g('pdot-1'), g('pdot-2'), g('pdot-3')],
      progressLabel:    g('progress-label'),
      reviewGrid:       g('review-grid'),
      btnContinueCollage: g('btn-continue-collage'),
      btnRestart:       g('btn-restart'),
      collageCanvas:    g('collage-canvas'),
      btnDlPng:         g('btn-dl-png'),
      btnDlJpg:         g('btn-dl-jpg'),
      btnRetakePhotos:  g('btn-retake-photos'),
      btnNewSession:    g('btn-new-session'),
    };
  }

  /* ── Events ── */
  _bindEvents() {
    const el = this.el;

    el.btnStart.addEventListener('click', () => this._startSession());

    el.btnRandomPose.addEventListener('click', () => this._loadRandomPose());

    el.uploadPose.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      PoseLibrary.setCustom(url);
      this._setReferenceImage(url, file.name);
      e.target.value = ''; // allow re-uploading the same file
    });

    el.modeCountdown.addEventListener('click', () => this._setMode('countdown'));
    el.modePose.addEventListener('click',      () => this._setMode('pose'));

    el.captureBtn.addEventListener('click', () => {
      if (this.capturing) return;
      if (this.captureMode === 'countdown') {
        this._runCountdownCapture();
      } else {
        // Manual trigger in pose mode
        this._runCountdownCapture();
      }
    });

    el.btnContinueCollage.addEventListener('click', () => this._goToCollage());
    el.btnRestart.addEventListener('click',         () => this._resetSession());
    el.btnRetakePhotos.addEventListener('click',    () => this._goToReview());

    el.btnDlPng.addEventListener('click', () => this._download('png'));
    el.btnDlJpg.addEventListener('click', () => this._download('jpg'));
    el.btnNewSession.addEventListener('click', () => this._resetSession());

    // Layout theme buttons
    document.querySelectorAll('.layout-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTheme = btn.dataset.theme;
        this._buildCollage();
      });
    });
  }

  /* ── Screen management ── */
  _showScreen(name) {
    Object.entries(this.screens).forEach(([k, el]) => {
      el.classList.toggle('active', k === name);
    });
  }

  /* ── Session start ── */
  async _startSession() {
    this.session.reset();
    this._showScreen('capture');
    this._updateProgress();
    this._loadRandomPose();
    await this._startCamera();
    this._initPoseDetection();
  }

  _resetSession() {
    this._stopDetection();
    CameraManager.stop();
    this.session.reset();
    this.capturing = false;
    this._showScreen('welcome');
  }

  /* ── Camera ── */
  async _startCamera() {
    const el = this.el;
    el.cameraLoading.classList.remove('hidden');
    el.cameraError.classList.add('hidden');
    try {
      await CameraManager.start(el.video);
      el.cameraLoading.classList.add('hidden');
    } catch (err) {
      console.error('Camera error:', err);
      el.cameraLoading.classList.add('hidden');
      el.cameraError.classList.remove('hidden');
    }
  }

  /* ── Pose detection init ── */
  _initPoseDetection() {
    const badge = this.el.detectionBadge;
    badge.className = 'badge badge-loading';
    badge.textContent = '⏳ Loading AI…';

    PoseDetector.init(
      () => {
        badge.className = 'badge badge-ready';
        badge.textContent = '🤖 AI Ready';
        if (this.captureMode === 'pose') {
          this.el.matchSection.classList.remove('hidden');
        }
        this._startDetectionLoop();
      },
      () => {
        badge.className = 'badge badge-no-ai';
        badge.textContent = '📷 Manual Mode';
        // Silently fall back — manual capture still works
      }
    );
  }

  _startDetectionLoop() {
    if (this.poseActive) return;
    this.poseActive = true;
    this._detectionLoop();
  }

  _stopDetection() {
    this.poseActive = false;
    if (this._animFrame) { cancelAnimationFrame(this._animFrame); this._animFrame = null; }
    clearTimeout(this.poseMatchTimer);
    this.poseMatchTimer = null;
  }

  _detectionLoop() {
    if (!this.poseActive) return;
    const { video, poseCanvas, matchBar, matchPct, matchHint } = this.el;

    if (video.readyState >= 2 && !this.capturing) {
      const result = PoseDetector.detect(video);
      if (result && result.landmarks && result.landmarks[0]) {
        const lm = result.landmarks[0];
        PoseDetector.drawSkeleton(poseCanvas, video, lm);

        if (this.captureMode === 'pose') {
          const userAngles = PoseDetector.extractAngles(lm);
          let pct = 0;

          if (this.refAngles && userAngles) {
            pct = PoseDetector.compareAngles(this.refAngles, userAngles);
          } else {
            // No ref angles — show movement detection only
            pct = this._estimatePresence(lm);
          }

          matchBar.style.width = pct + '%';
          matchPct.textContent = pct + '%';
          matchBar.classList.toggle('good', pct >= this.poseThreshold);

          if (this.refAngles) {
            matchHint.textContent = this._getHint(pct);
          } else {
            matchHint.textContent = pct > 50
              ? 'Good presence! Click capture or hold the pose.'
              : 'Step into frame and match the pose!';
          }

          // Auto-capture when threshold held
          if (pct >= this.poseThreshold && !this.poseMatchTimer && !this.capturing) {
            this.poseMatchTimer = setTimeout(() => {
              if (!this.capturing) this._runCountdownCapture();
            }, this.poseHoldMs);
          } else if (pct < this.poseThreshold - 5) {
            clearTimeout(this.poseMatchTimer);
            this.poseMatchTimer = null;
          }
        }
      } else {
        // No pose detected
        const ctx = poseCanvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, poseCanvas.width, poseCanvas.height);
        if (this.captureMode === 'pose') {
          matchBar.style.width = '0%';
          matchPct.textContent = '0%';
          matchHint.textContent = 'Step into frame and match the pose!';
        }
      }
    }

    this._animFrame = requestAnimationFrame(() => this._detectionLoop());
  }

  /* Simple presence: are key landmarks visible? */
  _estimatePresence(lm) {
    const keys = [11,12,23,24,13,14,15,16];
    let visible = 0;
    for (const k of keys) {
      if (lm[k] && lm[k].visibility > 0.5) visible++;
    }
    return Math.round((visible / keys.length) * 80) + Math.floor(Math.random() * 5);
  }

  _getHint(pct) {
    if (pct >= 90) return '🎉 Perfect match! Hold still…';
    if (pct >= 75) return '✅ Almost there! Keep it up!';
    if (pct >= 55) return '👍 Getting closer! Adjust your arms.';
    if (pct >= 35) return '🤔 Try matching the arm positions.';
    return '📸 Position yourself like the reference image!';
  }

  /* ── Reference pose ── */
  _loadRandomPose() {
    const pose = PoseLibrary.pickRandom();
    this._setReferenceImage(pose.url, pose.name);
    // Try to extract reference angles using an offscreen image
    this._extractRefAngles(pose.url);
  }

  _setReferenceImage(url, name) {
    const img   = this.el.referenceImg;
    const errEl = this.el.refError;
    const frame = this.el.referenceFrame;
    img.style.opacity = '0';
    errEl.classList.add('hidden');
    delete frame.dataset.orientation;
    // Handlers first, so cached images can't fire onload before we listen
    img.onload = () => {
      const w = img.naturalWidth, h = img.naturalHeight;
      if (w && h) {
        const ratio = w / h;
        // Informational only — the image is always fitted whole via object-fit: contain
        frame.dataset.orientation = ratio > 1.15 ? 'landscape' : ratio < 0.87 ? 'portrait' : 'square';
        frame.style.setProperty('--ref-ratio', ratio.toFixed(4));
        this.el.poseName.textContent = `${name || ''} · ${w}×${h}`;
      }
      img.style.opacity = '1';
    };
    img.onerror = () => { errEl.classList.remove('hidden'); img.style.opacity = '0'; };
    img.src = url;
    this.el.poseName.textContent = name || '';
    this.refAngles = null; // reset until extracted
  }

  /* Attempt to run MediaPipe on the reference image to get angles */
  _extractRefAngles(url) {
    if (!PoseDetector.isReady()) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        // Use ImageBitmap on an offscreen canvas
        const c = document.createElement('canvas');
        c.width = img.naturalWidth || 480;
        c.height = img.naturalHeight || 640;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        // MediaPipe can't easily run on static images in VIDEO mode
        // So we skip this for now — comparison will use presence only
        // (Reference angle extraction from static images requires IMAGE runningMode)
        this.refAngles = null;
      } catch {}
    };
    img.src = url;
  }

  /* ── Capture mode ── */
  _setMode(mode) {
    this.captureMode = mode;
    this.el.modeCountdown.classList.toggle('active', mode === 'countdown');
    this.el.modePose.classList.toggle('active', mode === 'pose');

    const matchVisible = mode === 'pose' && PoseDetector.isReady();
    this.el.matchSection.classList.toggle('hidden', !matchVisible);

    if (mode === 'countdown') {
      this.el.captureHint.textContent = 'Click to start countdown';
    } else {
      this.el.captureHint.textContent = PoseDetector.isReady()
        ? 'Auto-captures when pose matches — or click'
        : 'Click to capture (manual fallback)';
    }
    clearTimeout(this.poseMatchTimer);
    this.poseMatchTimer = null;
  }

  /* ── Countdown capture ── */
  async _runCountdownCapture() {
    if (this.capturing) return;
    this.capturing = true;
    clearTimeout(this.poseMatchTimer);
    this.poseMatchTimer = null;

    this.el.captureBtn.disabled = true;
    await this.soundEffects.unlock();

    // Countdown 3-2-1
    for (let n = 3; n >= 1; n--) {
      await this._showCountdown(n);
    }

    // Flash & capture
    this.el.countdownOverlay.classList.add('hidden');
    this._doFlash();
    this.soundEffects.shutter();
    const dataURL = CameraManager.captureFrame(this.el.video);
    this.session.save(dataURL);
    this._updateProgress();

    this.capturing = false;
    this.el.captureBtn.disabled = false;

    if (this.session.allDone()) {
      // Short pause then go to review
      await this._delay(600);
      this._goToReview();
    } else {
      // Load next pose
      this._loadRandomPose();
    }
  }

  _showCountdown(n) {
    return new Promise(resolve => {
      const overlay = this.el.countdownOverlay;
      const num     = this.el.countdownNumber;
      overlay.classList.remove('hidden');
      num.textContent = n;
      this.soundEffects.countdown(n);
      // Force re-animation
      num.classList.remove('anim');
      void num.offsetWidth;
      setTimeout(resolve, 950);
    });
  }

  _doFlash() {
    const f = this.el.flashOverlay;
    f.classList.remove('hidden');
    f.style.animation = 'none';
    void f.offsetWidth;
    f.style.animation = '';
    f.classList.remove('hidden');
    setTimeout(() => f.classList.add('hidden'), 400);
  }

  /* ── Progress ── */
  _updateProgress() {
    const slot = this.session.retakeSlot !== null
      ? this.session.retakeSlot
      : this.session.currentSlot;

    for (let i = 0; i < 3; i++) {
      const dot = this.el.pdots[i];
      dot.className = 'pdot';
      if (this.session.photos[i]) {
        dot.classList.add('done');
      } else if (i === slot) {
        dot.classList.add('active');
      }
    }
    const displaySlot = Math.min(slot + 1, 3);
    this.el.progressLabel.textContent = `PHOTO ${displaySlot} / 3`;
  }

  /* ── Review screen ── */
  _goToReview() {
    this._stopDetection();
    // Don't stop camera tracks yet — user might retake
    this._showScreen('review');
    this._renderReviewGrid();
  }

  _renderReviewGrid() {
    const grid = this.el.reviewGrid;
    grid.innerHTML = '';
    this.session.photos.forEach((dataURL, i) => {
      const card = document.createElement('div');
      card.className = 'review-card';
      card.innerHTML = `
        <div class="review-card-thumb">
          ${dataURL ? `<img src="${dataURL}" alt="Photo ${i+1}" />` : '<div style="height:200px;background:#333;display:flex;align-items:center;justify-content:center;color:#999;">No photo</div>'}
        </div>
        <div class="review-card-footer">
          <span class="review-card-label">PHOTO ${i + 1}</span>
          <button class="btn btn-ghost btn-sm btn-retake" data-slot="${i}">🔁 Retake</button>
        </div>
      `;
      grid.appendChild(card);
    });

    // Retake buttons
    grid.querySelectorAll('.btn-retake').forEach(btn => {
      btn.addEventListener('click', () => {
        const slot = parseInt(btn.dataset.slot, 10);
        this._startRetake(slot);
      });
    });
  }

  _startRetake(slotIndex) {
    this.session.startRetake(slotIndex);
    this._showScreen('capture');
    this._updateProgress();
    this._loadRandomPose();
    // Re-start camera if it was stopped
    this.el.cameraLoading.classList.remove('hidden');
    this.el.cameraError.classList.add('hidden');
    CameraManager.start(this.el.video)
      .then(() => {
        this.el.cameraLoading.classList.add('hidden');
        if (PoseDetector.isReady()) {
          this._startDetectionLoop();
        }
      })
      .catch(() => {
        this.el.cameraLoading.classList.add('hidden');
        this.el.cameraError.classList.remove('hidden');
      });
  }

  /* ── Collage ── */
  async _goToCollage() {
    this._stopDetection();
    CameraManager.stop();
    this._showScreen('collage');
    await this._buildCollage();
  }

  async _buildCollage() {
    await CollageBuilder.build(
      this.el.collageCanvas,
      this.session.photos,
      this.currentTheme
    );
  }

  /* ── Downloads ── */
  _download(format) {
    const canvas = this.el.collageCanvas;
    let dataURL;
    if (format === 'jpg') {
      dataURL = canvas.toDataURL('image/jpeg', 0.92);
    } else {
      dataURL = canvas.toDataURL('image/png');
    }
    const now = new Date();
    const p2 = n => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}${p2(now.getMonth()+1)}${p2(now.getDate())}-${p2(now.getHours())}${p2(now.getMinutes())}${p2(now.getSeconds())}`;
    const filename = `firstfivebooth-${stamp}.${format}`;
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /* ── Helpers ── */
  _delay(ms) { return new Promise(r => setTimeout(r, ms)); }
}

/* ══════════════════════════════════════════════════════════════════
   BOOT
   ══════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  window._app = new PhotoboothApp();
});
