import { drawVector, drawEyes, drawCenteredCircle } from './drawing.js';

export class UIController extends EventTarget {
    constructor(config) {
        super();
        this.config = config;
        this.dom = {
            loader: document.getElementById('loader'),
            mainControls: document.getElementById('main-controls'),
            status: document.getElementById('status'),
            videoContainer: document.getElementById('video-container'),
            video: document.getElementById('video'),
            landmarksCanvas: document.getElementById('landmarks-canvas'),
            stage: document.getElementById('stage'),
            log: document.getElementById('log'),
            lockIndicator: document.getElementById('lock-indicator'),
            facelostIndicator: document.getElementById('facelost-indicator'),
            blinkOverlay: document.getElementById('blink-overlay'),
            controls: {
                showWebcam: document.getElementById('show-webcam'),
                showLandmarks: document.getElementById('show-landmarks'),
                enableBlink: document.getElementById('enable-blink'),
                enableHead: document.getElementById('enable-head'),
                headControls: document.getElementById('head-controls'),
                renderMode: document.querySelectorAll('input[name="renderMode"]'),
            }
        };

        this.stageCtx = this.dom.stage.getContext('2d');
        this.resizeCanvas();
        
        this.initEventListeners();
    }

    initEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());

        Object.entries(this.dom.controls).forEach(([key, el]) => {
            if (NodeList.prototype.isPrototypeOf(el)) {
                el.forEach(radio => radio.addEventListener('change', (e) => this.handleControlChange(e)));
            } else if (el.type === 'checkbox') {
                el.addEventListener('change', (e) => this.handleControlChange(e));
            }
        });
    }

    handleControlChange(event) {
        const control = event.target;
        const value = control.type === 'checkbox' ? control.checked : control.value;
        this.dispatchEvent(new CustomEvent('controlchange', {
            detail: { control: control.id || control.name, value }
        }));

        if (control.id === 'enable-head') {
            this.dom.controls.headControls.style.display = value ? 'flex' : 'none';
        }
    }

    resizeCanvas() {
        this.dom.stage.width = window.innerWidth;
        this.dom.stage.height = window.innerHeight;
    }

    setStatus(text) {
        this.dom.status.textContent = text;
    }

    setStarted(isStarted) {
        this.dom.loader.style.display = isStarted ? 'none' : 'flex';
        this.dom.mainControls.style.display = isStarted ? 'flex' : 'none';
        this.dom.controls.enableBlink.closest('.controls-group').style.display = isStarted ? 'flex' : 'none';
        this.dom.controls.headControls.style.display = isStarted && this.dom.controls.enableHead.checked ? 'flex' : 'none';
    }

    setLock(isLocked) {
        this.dom.lockIndicator.style.display = isLocked ? 'block' : 'none';
    }

    setFaceLost(isLost) {
        this.dom.facelostIndicator.style.display = isLost ? 'block' : 'none';
    }

    log(text) {
        this.dom.log.textContent = text;
    }

    showBlink(isBlinking) {
        if (isBlinking) {
            this.dom.blinkOverlay.style.backgroundColor = '#6e0303ff';
            this.dom.blinkOverlay.style.display = 'block';
        } else {
            this.dom.blinkOverlay.style.display = 'none';
        }
    }

    isExperienceEnabled(name) {
        if (name === 'blink') return this.dom.controls.enableBlink.checked;
        if (name === 'head') return this.dom.controls.enableHead.checked;
        return false;
    }

    getRenderMode() {
        return document.querySelector('input[name="renderMode"]:checked').value;
    }

    clearStage() {
        this.stageCtx.clearRect(0, 0, this.dom.stage.width, this.dom.stage.height);
    }

    drawHeadDirection({ targetX, targetY }) {
        this.clearStage();
        const mode = this.getRenderMode();
        if (mode === 'vector') {
            drawVector(this.stageCtx, this.dom.stage, targetX, targetY, this.config.vector);
        } else if (mode === 'eyes') {
            drawEyes(this.stageCtx, this.dom.stage, targetX, targetY, this.config.eyes);
        }
    }
}
