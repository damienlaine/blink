import * as THREE from 'three';
import {
    FaceLandmarker,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
import { drawLandmarks } from './drawing.js';

export class FaceTracker extends EventTarget {
    constructor(videoConfig, trackingConfig) {
        super();
        this.videoConfig = videoConfig;
        this.trackingConfig = trackingConfig;
        this.video = document.getElementById('video');
        this.landmarksCanvas = document.getElementById('landmarks-canvas');
        this.videoContainer = document.getElementById('video-container');
        this.faceLandmarker = null;
        this.lastVideoTime = -1;
        this.running = false;
        this._showWebcam = false;
        this._showLandmarks = false;
    }

    async init() {
        const filesetResolver = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                delegate: "GPU",
            },
            runningMode: "VIDEO",
            numFaces: 1,
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: true,
        });

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: this.videoConfig.width },
                height: { ideal: this.videoConfig.height },
                frameRate: this.videoConfig.frameRate
            }
        });
        this.video.srcObject = stream;
        this.video.onloadedmetadata = () => {
            this.video.play();
            this.landmarksCanvas.width = this.video.videoWidth;
            this.landmarksCanvas.height = this.video.videoHeight;
        };
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.loop();
    }

    stop() {
        this.running = false;
    }

    loop() {
        if (!this.running) return;

        const nowInMs = performance.now();
        if (this.video.readyState >= 2 && this.lastVideoTime !== this.video.currentTime) {
            this.lastVideoTime = this.video.currentTime;
            const result = this.faceLandmarker.detectForVideo(this.video, nowInMs);
            this.processResult(result, nowInMs);
        }
        requestAnimationFrame(() => this.loop());
    }

    processResult(result, timestamp) {
        const hasFace = result && result.faceLandmarks && result.faceLandmarks.length > 0;
        
        this.dispatchEvent(new CustomEvent('facelost', { detail: { lost: !hasFace } }));

        if (hasFace) {
            const isLocked = this.isHeadLocked(result);
            this.dispatchEvent(new CustomEvent('lock', { detail: { locked: isLocked } }));
            this.dispatchEvent(new CustomEvent('tracking', { detail: { result, timestamp } }));
        }

        if (this._showLandmarks && hasFace) {
            drawLandmarks(this.landmarksCanvas, result.faceLandmarks);
        } else {
            this.landmarksCanvas.getContext('2d').clearRect(0, 0, this.landmarksCanvas.width, this.landmarksCanvas.height);
        }
    }

    isHeadLocked(result) {
        const lm = result.faceLandmarks[0];
        const cfg = this.trackingConfig.headLock;

        // Roll
        const L = lm[33], R = lm[263];
        const p1 = new THREE.Vector3(L.x, L.y, L.z);
        const p2 = new THREE.Vector3(R.x, R.y, R.z);
        const roll = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
        if (Math.abs(roll) > cfg.maxRoll) return true;

        // Yaw
        const nose = lm[1];
        const leftCheek = lm[234];
        const rightCheek = lm[454];
        const distNoseToLeft = Math.abs(nose.x - leftCheek.x);
        const distNoseToRight = Math.abs(rightCheek.x - nose.x);
        const yawRatio = distNoseToLeft / distNoseToRight;
        if (yawRatio > cfg.yawRatio || yawRatio < (1 / cfg.yawRatio)) return true;

        // Pitch
        const forehead = lm[10];
        const chin = lm[152];
        const pitchRatio = (nose.y - forehead.y) / (chin.y - forehead.y);
        if (pitchRatio < cfg.minPitch || pitchRatio > cfg.maxPitch) return true;

        return false;
    }

    showWebcam(visible) {
        this._showWebcam = visible;
        this.videoContainer.style.display = visible ? 'block' : 'none';
    }

    showLandmarks(visible) {
        this._showLandmarks = visible;
    }
}
