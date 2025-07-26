// headdirection.js
// Demo "flèche qui pointe vers la tête" avec MediaPipe Tasks FaceLandmarker

import {
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const VIDEO_W = 640; // Base video width for processing
const VIDEO_H = 480; // Base video height for processing

const videoEl = document.getElementById("video");
const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const statusEl = document.getElementById("status");
const toggleWebcamEl = document.getElementById("toggleWebcam");
const renderModeVectorEl = document.getElementById("renderModeVector");
const renderModeEyesEl = document.getElementById("renderModeEyes");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let faceLandmarker;
let lastVideoTime = -1;
let running = false;
let drawingUtils = new DrawingUtils(ctx);

// --- State ---
let showWebcam = false;
let renderMode = "vector";

// --- Eye Animation State ---
const leftPupil = { x: 0, y: 0 };
const rightPupil = { x: 0, y: 0 };

// --- Event Listeners ---
toggleWebcamEl.addEventListener("change", (e) => {
  showWebcam = e.target.checked;
  videoEl.classList.toggle("visible", showWebcam);
});

renderModeVectorEl.addEventListener("change", () => (renderMode = "vector"));
renderModeEyesEl.addEventListener("change", () => (renderMode = "eyes"));

startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;
  statusEl.textContent = "Initialisation…";
  try {
    await init();
    running = true;
    statusEl.textContent = "OK";
    startBtn.style.display = "none"; // Hide after starting
    requestAnimationFrame(loop);
  } catch (e) {
    console.error(e);
    statusEl.textContent = "Erreur : " + e.message;
    startBtn.disabled = false;
  }
});

// --- Core Functions ---
async function init() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: VIDEO_W, height: VIDEO_H, facingMode: "user" },
    audio: false,
  });
  videoEl.srcObject = stream;
  videoEl.onloadedmetadata = () => videoEl.play();

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
    outputFacialTransformationMatrixes: true,
  });
}

function loop() {
  if (!running) return;

  const nowInMs = performance.now();
  if (videoEl.readyState >= 2 && lastVideoTime !== videoEl.currentTime) {
    lastVideoTime = videoEl.currentTime;
    const result = faceLandmarker.detectForVideo(videoEl, nowInMs);
    draw(result);
  }
  requestAnimationFrame(loop);
}

function draw(result) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // --- Webcam & Landmarks (Optional) ---
  if (showWebcam) {
    ctx.save();
    // Flip horizontally for a mirror effect
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    
    // Draw landmarks if available, also mirrored
    if (result?.faceLandmarks) {
      drawLandmarks(result.faceLandmarks);
    }
    ctx.restore();
  }

  // --- Head Vector / Eyes ---
  if (!result || !result.faceLandmarks || result.faceLandmarks.length === 0) {
    // If no face is detected, draw a default dot at the origin.
    drawCenteredCircle(ctx);
    return;
  }

  const landmarks = result.faceLandmarks[0];
  
  let minX = 1, maxX = 0, minY = 1, maxY = 0;
  for (const point of landmarks) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  const faceCenterX_normalized = (minX + maxX) / 2;
  const faceCenterY_normalized = (minY + maxY) / 2;

  const targetX = (1 - faceCenterX_normalized) * canvas.width;

  const originY = canvas.height / 2;
  const neutralY = 0.5; 
  const deltaY = faceCenterY_normalized - neutralY;
  const vertical_sensitivity = 2.5; 
  const targetY = originY + (deltaY * canvas.height * vertical_sensitivity);

  if (renderMode === "vector") {
    drawVector(ctx, targetX, targetY);
  } else if (renderMode === "eyes") {
    drawEyes(ctx, targetX, targetY);
  }
}

// --- Drawing Modes ---
function drawVector(ctx, targetX, targetY) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2; 

  const vx = targetX - cx;
  const vy = targetY - cy;
  const len = Math.hypot(vx, vy);

  const EPS = 20;
  if (len < EPS) {
    drawCenteredCircle(ctx);
    return;
  }

  const angle = Math.atan2(vy, vx);
  const headLen = Math.min(60, Math.max(30, len * 0.3));
  const coneRadius = headLen * 0.5;

  ctx.save();
  ctx.strokeStyle = "rgba(0, 255, 0, 0.8)";
  ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(targetX - Math.cos(angle) * headLen, targetY - Math.sin(angle) * headLen);
  ctx.stroke();

  ctx.save();
  ctx.translate(targetX, targetY);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-headLen, -coneRadius);
  ctx.lineTo(-headLen, coneRadius);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.restore();
}


function drawEyes(ctx, targetX, targetY) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const eyeRadius = Math.min(canvas.width, canvas.height) * 0.1;
  const pupilRadius = eyeRadius * 0.4;
  const eyeSpacing = eyeRadius * 1.2;

  const leftEyePos = { x: cx - eyeSpacing, y: cy };
  const rightEyePos = { x: cx + eyeSpacing, y: cy };

  // Calculate the vector from the center of the screen to the target
  const vx = targetX - cx;
  const vy = targetY - cy;

  // Calculate the maximum possible vector length (from center to a corner)
  const maxVectorLength = Math.hypot(cx, cy);
  
  // Calculate the current vector length
  const vectorLength = Math.hypot(vx, vy);
  
  // Normalize the vector length to a range of 0 to 1
  const normalizedLength = Math.min(vectorLength / maxVectorLength, 1.0);
  
  // The maximum distance the pupil can travel from the center of the eye
  const maxPupilDist = eyeRadius - pupilRadius;
  
  // Scale the pupil distance by the normalized vector length
  const pupilDist = normalizedLength * maxPupilDist;
  
  // Calculate the angle of the vector
  const angle = Math.atan2(vy, vx);

  // Calculate the offset for the pupils
  const pupilOffsetX = Math.cos(angle) * pupilDist;
  const pupilOffsetY = Math.sin(angle) * pupilDist;

  // Draw each eye with the same offset
  drawSingleEye(ctx, leftEyePos, eyeRadius, pupilRadius, pupilOffsetX, pupilOffsetY);
  drawSingleEye(ctx, rightEyePos, eyeRadius, pupilRadius, pupilOffsetX, pupilOffsetY);
}

function drawSingleEye(ctx, eyePos, eyeRadius, pupilRadius, pupilOffsetX, pupilOffsetY) {
  const pupilX = eyePos.x + pupilOffsetX;
  const pupilY = eyePos.y + pupilOffsetY;

  // Draw the eye socket
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(eyePos.x, eyePos.y, eyeRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "black";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Draw the pupil
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.arc(pupilX, pupilY, pupilRadius, 0, Math.PI * 2);
  ctx.fill();
}

function drawLandmarks(faceLandmarks) {
  for (const landmarks of faceLandmarks) {
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: "#C0C0C070", lineWidth: 1 });
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: "#FF3030" });
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, { color: "#FF3030" });
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: "#30FF30" });
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, { color: "#30FF30" });
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: "#E0E0E0" });
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, { color: "#E0E0E0" });
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS, { color: "#FF3030" });
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS, { color: "#30FF30" });
  }
}

function drawCenteredCircle(ctx) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  ctx.save();
  ctx.fillStyle = "rgba(0,255,0,0.8)";
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
