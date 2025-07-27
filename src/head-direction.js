import { getViewportSizeAtDepth } from './camera-utils.js';

export class HeadDirection extends EventTarget {
    constructor(config, camera) {
        super();
        this.config = config;
        this.camera = camera;
    }

    process(result) {
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

        // The target plane is placed in front of the avatar.
        // Avatar is at z=0, camera is at z=10. Let's place the plane at z=-20.
        // The depth from the camera is camera.z - target.z = 10 - (-20) = 30.
        const depth = 30;
        const viewportSize = getViewportSizeAtDepth(this.camera, depth);

        // The video is mirrored, so we need to invert the x-axis.
        const targetX = (0.5 - faceCenterX_normalized) * viewportSize.width;
        const targetY = -(faceCenterY_normalized - 0.5) * viewportSize.height;

        this.dispatchEvent(new CustomEvent('direction', {
            detail: {
                targetX,
                targetY,
                depth: -20, // The z-coordinate of the target plane
                normalized: {
                    x: faceCenterX_normalized,
                    y: faceCenterY_normalized
                }
            }
        }));
    }
}
