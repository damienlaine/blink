import * as THREE from 'three';
import { Avatar } from './avatar.js';
import { drawVector, drawEyes } from './drawing.js';

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
            stage2d: document.getElementById('stage-2d'),
            stage3d: document.getElementById('stage-3d'),
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

        // 2D Canvas setup
        this.stage2dCtx = this.dom.stage2d.getContext('2d');

        // 3D Scene setup
        this.scene = new THREE.Scene();
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 1, 1);
        this.scene.add(directionalLight);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
        this.camera.position.z = 10;
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            canvas: this.dom.stage3d
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.avatar = new Avatar(this.scene);
        this.avatar.load().catch(console.error);

        this.initEventListeners();
        this.resizeCanvas();
        this.render();
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
        const w = window.innerWidth;
        const h = window.innerHeight;

        this.dom.stage2d.width = w;
        this.dom.stage2d.height = h;

        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
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
        this.stage2dCtx.clearRect(0, 0, this.dom.stage2d.width, this.dom.stage2d.height);
        for (let i = this.scene.children.length - 1; i >= 0; i--) {
            const child = this.scene.children[i];
            if (child.isMesh) {
                this.scene.remove(child);
            }
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(() => this.render());
    }

    drawHeadDirection({ targetX, targetY, depth, normalized }) {
        if (!this.avatar.gltf) return;

        const mode = this.getRenderMode();

        // Clear canvases
        this.stage2dCtx.clearRect(0, 0, this.dom.stage2d.width, this.dom.stage2d.height);
        for (let i = this.scene.children.length - 1; i >= 0; i--) {
            const child = this.scene.children[i];
            if (child.isMesh && child !== this.avatar.gltf.scene) {
                this.scene.remove(child);
            }
        }

        this.avatar.gltf.scene.visible = (mode === 'tanuki');

        switch (mode) {
            case 'vector':
                drawVector(this.stage2dCtx, this.dom.stage2d, (1 - normalized.x) * this.dom.stage2d.width, normalized.y * this.dom.stage2d.height, this.config.vector);
                break;
            case 'eyes':
                drawEyes(this.stage2dCtx, this.dom.stage2d, (1 - normalized.x) * this.dom.stage2d.width, normalized.y * this.dom.stage2d.height, this.config.eyes);
                break;
            case 'sphere':
                {
                    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
                    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
                    const sphere = new THREE.Mesh(geometry, material);
                    sphere.position.set(targetX, targetY, depth);
                    this.scene.add(sphere);
                }
                break;
            case 'tanuki':
                {
                    const target = new THREE.Vector3(targetX, targetY, depth);
                    this.avatar.updateEyeGaze(target);
                }
                break;
        }
    }
}
