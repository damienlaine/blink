export class BlinkDetector extends EventTarget {
    constructor(config) {
        super();
        this.config = config;
        this.smoothingFrames = config.smoothingFrames || 1;
        this.buf = [];
        this.blinkState = 'open';
        this.lastBlinkT = 0;
        this.lastBlinkCountT = 0;
        this.blinkCount = 0;
    }

    process(result, timestamp) {
        if (!result || !result.faceBlendshapes || !result.faceBlendshapes.length) {
            return;
        }

        const cats = result.faceBlendshapes[0].categories;
        const sL = cats.find(c => c.categoryName === 'eyeBlinkLeft')?.score ?? 0;
        const sR = cats.find(c => c.categoryName === 'eyeBlinkRight')?.score ?? 0;
        const score = (sL + sR) / 2;

        let m = score;
        if (this.smoothingFrames > 1) {
            this.buf.push(score);
            if (this.buf.length > this.smoothingFrames) this.buf.shift();
            if (this.buf.length < this.smoothingFrames) return;
            m = this.median(this.buf);
        }

        if (this.blinkState === 'open' && m > this.config.thresholdOpen) {
            this.blinkState = 'closed';
            this.lastBlinkT = timestamp;
            this.dispatchEvent(new CustomEvent('blink.start'));
        } else if (this.blinkState === 'closed' && m < this.config.thresholdReopen) {
            this.blinkState = 'open';
            const blinkDuration = timestamp - this.lastBlinkT;
            const sinceLastBlink = timestamp - this.lastBlinkCountT;

            if (blinkDuration > this.config.minDurationMs && sinceLastBlink > this.config.debounceMs) {
                this.blinkCount++;
                this.lastBlinkCountT = timestamp;
                this.dispatchEvent(new CustomEvent('blink.end', {
                    detail: {
                        count: this.blinkCount,
                        duration: blinkDuration
                    }
                }));
            }
        }
    }

    median(arr) {
        const sorted = [...arr].sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)];
    }
}
