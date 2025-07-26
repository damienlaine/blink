import {
    FaceLandmarker,
    DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

export function drawVector(ctx, canvas, targetX, targetY, config) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const vx = targetX - cx;
    const vy = targetY - cy;
    const len = Math.hypot(vx, vy);

    if (len < config.minEpsilon) {
        drawCenteredCircle(ctx, canvas);
        return;
    }

    const angle = Math.atan2(vy, vx);
    const headLen = Math.min(config.maxHeadLength, Math.max(config.minHeadLength, len * config.headLengthFactor));
    const coneRadius = headLen * config.coneRadiusFactor;

    ctx.save();
    ctx.strokeStyle = config.color;
    ctx.fillStyle = config.color;
    ctx.lineWidth = config.lineWidth;
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

export function drawEyes(ctx, canvas, targetX, targetY, config) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const eyeRadius = Math.min(canvas.width, canvas.height) * config.eyeRadiusFactor;
    const pupilRadius = eyeRadius * config.pupilRadiusFactor;
    const eyeSpacing = eyeRadius * config.eyeSpacingFactor;

    const leftEyePos = { x: cx - eyeSpacing, y: cy };
    const rightEyePos = { x: cx + eyeSpacing, y: cy };

    const vx = targetX - cx;
    const vy = targetY - cy;

    const maxVectorLength = Math.hypot(cx, cy);
    const vectorLength = Math.hypot(vx, vy);
    const normalizedLength = Math.min(vectorLength / maxVectorLength, 1.0);

    const maxPupilDist = eyeRadius - pupilRadius;
    const pupilDist = normalizedLength * maxPupilDist;
    const angle = Math.atan2(vy, vx);

    const pupilOffsetX = Math.cos(angle) * pupilDist;
    const pupilOffsetY = Math.sin(angle) * pupilDist;

    drawSingleEye(ctx, leftEyePos, eyeRadius, pupilRadius, pupilOffsetX, pupilOffsetY);
    drawSingleEye(ctx, rightEyePos, eyeRadius, pupilRadius, pupilOffsetX, pupilOffsetY);
}

function drawSingleEye(ctx, eyePos, eyeRadius, pupilRadius, pupilOffsetX, pupilOffsetY) {
    const pupilX = eyePos.x + pupilOffsetX;
    const pupilY = eyePos.y + pupilOffsetY;

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(eyePos.x, eyePos.y, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(pupilX, pupilY, pupilRadius, 0, Math.PI * 2);
    ctx.fill();
}

export function drawCenteredCircle(ctx, canvas) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.save();
    ctx.fillStyle = "rgba(0,255,0,0.8)";
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

export function drawLandmarks(canvas, landmarksData) {
    const ctx = canvas.getContext("2d");
    const drawingUtils = new DrawingUtils(ctx);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (const landmarks of landmarksData) {
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
