export class PositionObserver {
    constructor(positionObserverCallback, thresholdFraction = 1000) {
        this.positionObserverCallback = positionObserverCallback;
        this.thresholdList = new Array(thresholdFraction + 1)
            .fill(0)
            .map((_, ind) => ind / thresholdFraction);
    }
    observe(targetElement) {
        this.target = targetElement;
        this.backupViewportIntersectionObserver = new IntersectionObserver((e) => {
            var _a, _b;
            (_a = this.intersectionObserver) === null || _a === void 0 ? void 0 : _a.unobserve(e[0].target);
            (_b = this.intersectionObserver) === null || _b === void 0 ? void 0 : _b.disconnect();
            this.setupIntersectionObserverFromStart(e[0].target);
        }, {
            threshold: this.thresholdList,
        });
        this.backupViewportIntersectionObserver.observe(targetElement);
    }
    setupIntersectionObserverFromStart(targetElement) {
        this.intersectionObserver = new IntersectionObserver(this.viewportWindowDetectionCallback.bind(this), {
            threshold: this.thresholdList,
            rootMargin: "0px 0px 0px 0px",
            root: document,
        });
        this.intersectionObserver.observe(targetElement);
        this.target = targetElement;
    }
    reportPosition(rootBounds = null) {
        var _a;
        (_a = this.target) === null || _a === void 0 ? void 0 : _a.dispatchEvent(new CustomEvent("movement-observed", {
            composed: true,
            bubbles: true,
            detail: {
                rootBounds,
                outOfViewport: !this.viewportVisible,
            },
        }));
    }
    getMargins(windowDimensions, rootBounds) {
        const viewportBounds = rootBounds;
        const constrainedTopMarginOfWindow = Math.min(-(windowDimensions.top - 1 - viewportBounds.top), 0);
        const constrainedRightMarginOfWindow = Math.min(-(viewportBounds.right - (windowDimensions.right + 1)), 0);
        const constrainedBottomMarginOfWindow = Math.min(-(viewportBounds.bottom - (windowDimensions.bottom + 1)), 0);
        const constrainedLeftMarginOfWindow = Math.min(-(windowDimensions.left - 1 - viewportBounds.left), 0);
        return `${constrainedTopMarginOfWindow}px ${constrainedRightMarginOfWindow}px ${constrainedBottomMarginOfWindow}px ${constrainedLeftMarginOfWindow}px`;
    }
    viewportWindowDetectionCallback(e) {
        console.log("viewport callback", e[0].intersectionRatio);
        const entry = e[0];
        const IR = entry.intersectionRatio;
        this.viewportVisible = IR > 0;
        this.reportPosition(entry.rootBounds);
        this.viewportIR = IR;
        if (IR > 0) {
            const options = {
                threshold: this.thresholdList,
                rootMargin: this.getMargins(entry.intersectionRect, entry.rootBounds),
                root: document,
            };
            this.intersectionObserver.unobserve(entry.target);
            this.intersectionObserver.disconnect();
            this.intersectionObserver = new IntersectionObserver(this.finerWindowDetectionCallback.bind(this), options);
            this.intersectionObserver.observe(entry.target);
        }
        else {
            // do nothing if outside
        }
    }
    finerWindowDetectionCallback(e) {
        console.log("fine window callback", e[0].intersectionRatio);
        const entry = e[0];
        const IR = entry.intersectionRatio;
        this.reportPosition(entry.rootBounds);
        if (this.viewportIR !== IR) {
            // motion started
            this.intersectionObserver.disconnect();
            this.setupIntersectionObserverFromStart(entry.target);
        }
        else {
            // motion stopped. Wait for next detection.
        }
    }
}
