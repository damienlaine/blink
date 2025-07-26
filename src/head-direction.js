export class HeadDirection extends EventTarget {
    constructor(config) {
        super();
        this.config = config;
        this.canvas = document.getElementById('stage'); // Used for dimensions
    }

    process(result) {
        // This module now assumes a face is present, as the check is done upstream.
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

        const targetX = (1 - faceCenterX_normalized) * this.canvas.width;

        const originY = this.canvas.height / 2;
        const neutralY = 0.5;
        const deltaY = faceCenterY_normalized - neutralY;
        const targetY = originY + (deltaY * this.canvas.height * this.config.verticalSensitivity);

        this.dispatchEvent(new CustomEvent('direction', {
            detail: {
                targetX,
                targetY,
                normalized: {
                    x: faceCenterX_normalized,
                    y: faceCenterY_normalized
                }
            }
        }));
    }
}
