/**
 * Copyright (c) 2025 AJK-Essential
 * This file is licensed under the MIT License.
 * See the LICENSE file in the project root for license information.
 */
export class PositionObserver {
    constructor(positionObserverCallback, thresholdFraction = 1000) {
        this.positionObserverCallback = positionObserverCallback;
        this.thresholdList = new Array(thresholdFraction + 1)
            .fill(0)
            .map((_, ind) => ind / thresholdFraction);
    }
    observe(targetElement) {
        this.intersectionObserver = new IntersectionObserver(this.viewportCallback.bind(this), {
            threshold: this.thresholdList,
            rootMargin: "0px 0px 0px 0px",
            root: document
        });
        this.intersectionObserver.observe(targetElement);
    }
    viewportCallback(e) {
        var _a, _b, _c;
        console.log("viewport is the boundary");
        const entry = e[0];
        const target = entry.target;
        const targetBounds = entry.boundingClientRect;
        if (this.positionObserverCallback) {
            this.positionObserverCallback({
                x: targetBounds.left,
                y: targetBounds.top,
                target,
                outOfViewport: !entry.isIntersecting,
                rootBounds: entry.rootBounds,
            });
        }
        // If ever there is an intersection in this callback which observes
        // viewport hits, that means, the target is peaking itself inside
        // the viewport (Some part of the target is visible in the viewport).
        // We therefore immediately pass it to the other callback with a finer
        // window to capture changes.
        // The finer window is constructed such that it is limited within the
        // viewport boundaries and it has same size as that of target so that
        // if the target enters or exits further, it will eventually increase
        // or decrease the area of intersection (the common area between the
        // target and the finer window) within the window, thus signalling
        // the movement.
        if (entry.intersectionRatio > 0) {
            (_a = this.intersectionObserver) === null || _a === void 0 ? void 0 : _a.unobserve(target);
            (_b = this.intersectionObserver) === null || _b === void 0 ? void 0 : _b.disconnect();
            const options = {
                threshold: this.thresholdList,
                rootMargin: this.getMargins(this.constructBoxWindow(targetBounds, entry.rootBounds), entry.rootBounds),
                root: document
            };
            this.intersectionObserver = new IntersectionObserver(this.intersectionObsCallback.bind(this), options);
            (_c = this.intersectionObserver) === null || _c === void 0 ? void 0 : _c.observe(target);
        }
    }
    intersectionObsCallback(e) {
        var _a, _b, _c;
        console.log("target is the boundary");
        const entry = e[0];
        const target = entry.target;
        const targetBounds = entry.boundingClientRect;
        if (this.positionObserverCallback) {
            this.positionObserverCallback({
                x: targetBounds.left,
                y: targetBounds.top,
                target,
                outOfViewport: false,
                rootBounds: entry.rootBounds,
            });
        }
        // if intersectionRatio is 0, then it means
        // the target is fully out of the finer window.
        // In that case, we pass this to the viewport
        // detector callback (whether it is inside the
        // viewport or not).
        // And it stays there in that callback until
        // the viewport detector callback says, yah, we found it..
        // when it comes back to this callback with an updated finer window
        if (entry.intersectionRatio === 0) {
            (_a = this.intersectionObserver) === null || _a === void 0 ? void 0 : _a.unobserve(target);
            (_b = this.intersectionObserver) === null || _b === void 0 ? void 0 : _b.disconnect();
            this.intersectionObserver = new IntersectionObserver(this.viewportCallback.bind(this), {
                threshold: this.thresholdList,
                rootMargin: "0px 0px 0px 0px",
                root: document
            });
            (_c = this.intersectionObserver) === null || _c === void 0 ? void 0 : _c.observe(target);
        }
    }
    disconnect() {
        var _a;
        (_a = this.intersectionObserver) === null || _a === void 0 ? void 0 : _a.disconnect();
    }
    constructBoxWindow(targetBounds, rootBounds) {
        const constrainedLeft = Math.min(Math.max(rootBounds.left, targetBounds.left), rootBounds.right - targetBounds.width);
        const constrainedTop = Math.min(Math.max(rootBounds.top, targetBounds.top), rootBounds.bottom - targetBounds.height);
        const constrainedRight = constrainedLeft + targetBounds.width;
        const constrainedBottom = constrainedTop + targetBounds.height;
        return {
            left: constrainedLeft,
            top: constrainedTop,
            right: constrainedRight,
            bottom: constrainedBottom,
        };
    }
    getMargins(windowDimensions, rootBounds) {
        let viewportBounds;
        if (!rootBounds) {
            viewportBounds = {
                top: visualViewport.offsetTop,
                left: visualViewport.offsetLeft,
                right: visualViewport.width + visualViewport.offsetLeft,
                bottom: visualViewport.height + visualViewport.offsetTop,
            };
        }
        else {
            viewportBounds = rootBounds;
        }
        const constrainedTopMarginOfWindow = Math.min(-(windowDimensions.top - 1 - viewportBounds.top), 0);
        const constrainedRightMarginOfWindow = Math.min(-(viewportBounds.right - (windowDimensions.right + 1)), 0);
        const constrainedBottomMarginOfWindow = Math.min(-(viewportBounds.bottom - (windowDimensions.bottom + 1)), 0);
        const constrainedLeftMarginOfWindow = Math.min(-(windowDimensions.left - 1 - viewportBounds.left), 0);
        return `${constrainedTopMarginOfWindow}px ${constrainedRightMarginOfWindow}px ${constrainedBottomMarginOfWindow}px ${constrainedLeftMarginOfWindow}px`;
    }
}
//# sourceMappingURL=position-observer.js.map