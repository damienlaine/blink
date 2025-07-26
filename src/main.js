import { FaceTracker } from './face-tracker.js';
import { UIController } from './ui-controller.js';
import { BlinkDetector } from './blink-detector.js';
import { HeadDirection } from './head-direction.js';

async function main() {
    const config = await fetch('./src/config.json').then(res => res.json());

    const ui = new UIController(config.ui);
    const faceTracker = new FaceTracker(config.video, config.faceTracking);
    const blinkDetector = new BlinkDetector(config.blinkDetection);
    const headDirection = new HeadDirection(config.headDirection);

    // --- Event Wiring ---

    let isLocked = false;

    faceTracker.addEventListener('tracking', (e) => {
        const { result, timestamp } = e.detail;
        
        if (ui.isExperienceEnabled('head')) {
            headDirection.process(result);
        }

        if (ui.isExperienceEnabled('blink') && !isLocked) {
            blinkDetector.process(result, timestamp);
        }
    });

    faceTracker.addEventListener('lock', (e) => {
        isLocked = e.detail.locked;
        if (ui.isExperienceEnabled('blink')) {
            ui.setLock(isLocked);
        } else {
            ui.setLock(false);
        }
    });

    faceTracker.addEventListener('facelost', (e) => {
        ui.setFaceLost(e.detail.lost);
        // If face is lost, also ensure lock indicator is hidden
        if (e.detail.lost) {
            ui.setLock(false);
        }
    });

    blinkDetector.addEventListener('blink.start', () => {
        ui.showBlink(true);
        requestAnimationFrame(() => ui.showBlink(false));
    });

    blinkDetector.addEventListener('blink.end', (e) => {
        ui.log(`Blink count: ${e.detail.count}`);
    });

    headDirection.addEventListener('direction', (e) => {
        ui.drawHeadDirection(e.detail);
    });

    async function startExperience() {
        try {
            ui.setStarted(false);
            ui.setStatus('Loading model...');
            await faceTracker.init();
            ui.setStatus('Starting webcam...');
            faceTracker.start();
            ui.setStatus('Ready');
            ui.setStarted(true);
        } catch (err) {
            console.error(err);
            ui.setStatus(`Error: ${err.message}`);
        }
    }

    ui.addEventListener('controlchange', (e) => {
        const { control, value } = e.detail;
        switch (control) {
            case 'show-webcam':
                faceTracker.showWebcam(value);
                break;
            case 'show-landmarks':
                faceTracker.showLandmarks(value);
                break;
            case 'enable-head':
                if (!value) ui.clearStage();
                break;
            case 'enable-blink':
                if (!value) ui.setLock(false);
                break;
        }
    });

    startExperience();
}

main().catch(console.error);
