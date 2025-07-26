import {
  FaceLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

// --- Références DOM ---
const video = document.getElementById('cam');
const log = document.getElementById('log');
const blinkOverlay = document.getElementById('blink-overlay');
const lockIndicator = document.getElementById('lock-indicator');
const eyeStatus = document.getElementById('eye-status');

// --- État de l'application ---
let faceLandmarker;
let lastVideoTime = -1;
let running = false;
let blinkCount = 0;

// --- Logique de détection de clignement ---
const SMOOTHING_FRAMES = 1 // Nivel de lissage (1 = aucun, 3-5 recommandé)
const buf = [];
const median = arr => [...arr].sort((a,b)=>a-b)[Math.floor(arr.length/2)];
let blinkState = 'open';
const THRESH = 0.4 // Seuil de fermeture (plus bas = plus sensible)
const THRESH_D = 0.2; // Seuil de ré-ouverture
const BLINK_DEBOUNCE_MS = 300; // Temps d'attente entre deux clignements
const BLINK_MIN_DURATION_MS = 100 // n clignement doit durer au moins 50ms
let lastBlinkT = 0;
let lastBlinkCountT = 0;

// --- Initialisation ---
async function init() {
  log.textContent = 'Initialisation...';

  // 1. Charger MediaPipe 
  const filesetResolver = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );
  faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: true,
  });

  // 2. Démarrer la webcam
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'user',
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 120, max: 240 }
    }
  });
  video.srcObject = stream;
  video.onloadedmetadata = () => {
    video.play();
    // Ajuster la taille de l'overlay
    blinkOverlay.style.width = `${video.videoWidth}px`;
    blinkOverlay.style.height = `${video.videoHeight}px`;
    
    // 3. Démarrer la boucle de rendu
    running = true;
    log.textContent = 'Blink count: 0';
    eyeStatus.textContent = 'Eyes: Open';
    requestAnimationFrame(loop);
  };
}

// --- Boucle de rendu principale ---
function loop() {
  if (!running) return;

  const nowInMs = performance.now();
  if (video.readyState >= 2 && lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    const result = faceLandmarker.detectForVideo(video, nowInMs);
    
    // On passe le résultat à la fonction de détection
    handleBlinkDetection(result, nowInMs);
  }
  requestAnimationFrame(loop);
}

// --- Logique de détection ---
function handleBlinkDetection(result, timestamp) {
  // Fonction pour réinitialiser l'état de détection en cas de problème
  const resetDetection = () => {
    buf.length = 0; // Vider le buffer de lissage
    lockIndicator.style.display = 'block'; // Afficher le verrou
    // Forcer la réinitialisation de l'état et de l'UI pour éviter que le rond reste affiché
    if (blinkState !== 'open') {
      blinkState = 'open';
      video.style.display = 'block';
      blinkOverlay.style.display = 'none';
      eyeStatus.textContent = 'Eyes: Open';
    }
  };

  if (!result || !result.faceBlendshapes || !result.faceLandmarks || !result.faceLandmarks.length) {
    return resetDetection();
  }

  // Si on arrive ici, c'est que la détection est active
  lockIndicator.style.display = 'none';

  // --- Verrouillage de la tête (Roll, Yaw, Pitch) ---
  const lm = result.faceLandmarks[0];

  // 1. Roll (inclinaison latérale)
  const L = lm[33], R = lm[263];
  const roll = Math.atan2(R.y - L.y, R.x - L.x) * 180 / Math.PI;
  if (Math.abs(roll) > 30) { // Seuil de 15 degrés
    return resetDetection();
  }

  // 2. Yaw (rotation gauche/droite)
  const nose = lm[1];
  const leftCheek = lm[234];
  const rightCheek = lm[454];
  const distNoseToLeft = Math.abs(nose.x - leftCheek.x);
  const distNoseToRight = Math.abs(rightCheek.x - nose.x);
  const yawRatio = distNoseToLeft / distNoseToRight;
  // Sensibilité au Yaw réduite de 50% (3.0 au lieu de 2.0)
  if (yawRatio > 3.0 || yawRatio < 0.33) {
    return resetDetection();
  }

  // 3. Pitch (inclinaison haut/bas)
  const forehead = lm[10];
  const chin = lm[152];
  const pitchRatio = (nose.y - forehead.y) / (chin.y - forehead.y);
  if (pitchRatio < 0.25 || pitchRatio > 0.65) { // Si le nez n'est pas centré verticalement
    return resetDetection();
  }

  // Score de clignement
  const cats = result.faceBlendshapes[0].categories;
  const sL = cats.find(c => c.categoryName === 'eyeBlinkLeft')?.score ?? 0;
  const sR = cats.find(c => c.categoryName === 'eyeBlinkRight')?.score ?? 0;
  const score = (sL + sR) / 2;

  // Filtre médian (si SMOOTHING_FRAMES > 1)
  let m = score;
  if (SMOOTHING_FRAMES > 1) {
    buf.push(score);
    if (buf.length > SMOOTHING_FRAMES) buf.shift();
    if (buf.length < SMOOTHING_FRAMES) return;
    m = median(buf);
  }

  // Machine à états (hystérésis) pour la détection
  if (blinkState === 'open' && m > THRESH) {
    // Les yeux se ferment -> état "closed"
    blinkState = 'closed';
    lastBlinkT = timestamp; // On note le moment de la fermeture
    eyeStatus.textContent = 'Eyes: Closed';
    flashOverlay(); // Flash instantané à la fermeture
    
  } else if (blinkState === 'closed' && m < THRESH_D) {
    // Les yeux se rouvrent -> état "open"
    blinkState = 'open';
    eyeStatus.textContent = 'Eyes: Open';

    const blinkDuration = timestamp - lastBlinkT;
    const sinceLastBlink = timestamp - lastBlinkCountT;

    // On compte le clignement SEULEMENT à la ré-ouverture
    if (blinkDuration > BLINK_MIN_DURATION_MS && sinceLastBlink > BLINK_DEBOUNCE_MS) {
      blinkCount++;
      lastBlinkCountT = timestamp;
      log.textContent = `Blink count: ${blinkCount}`;
    }
  }
}

// --- Fonctions UI ---
function flashOverlay() {
  video.style.display = 'none';
  const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
  blinkOverlay.style.backgroundColor = randomColor;
  blinkOverlay.style.display = 'block';

  // Cache l'overlay à la prochaine frame pour un effet de flash
  requestAnimationFrame(() => {
    video.style.display = 'block';
    blinkOverlay.style.display = 'none';
  });
}

// --- Démarrage de l'application ---
init();
