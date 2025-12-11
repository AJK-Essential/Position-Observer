/**
 * Copyright (c) 2025 AJK-Essential
 * This file is licensed under the MIT License.
 * See the LICENSE file in the project root for license information.
 */
export class PositionObserver {
  constructor(positionObserverCallback, thresholdFraction = 1000) {
    this.timeToWaitTillStopConfirmed = 0;
    this.waitTime = 0;
    this.stopWaitTime = 0.5 * 1000; // 0.5 times 1000ms = 0.5s
    this.positionObserverCallback = positionObserverCallback;
    this.thresholdList = new Array(thresholdFraction + 1)
      .fill(0)
      .map((_, ind) => ind / thresholdFraction);
  }
  observe(targetElement) {
    this.intersectionObserver = new IntersectionObserver(
      this.viewportWindowDetectionCallback.bind(this),
      {
        threshold: this.thresholdList,
        rootMargin: "0px 0px 0px 0px",
        root: document,
      }
    );
    this.intersectionObserver.observe(targetElement);
    this.target = targetElement;
  }
  viewportWindowDetectionCallback(e) {
    var _a, _b, _c;
    console.log("viewport is the boundary");
    const entry = e[0];
    const target = entry.target;
    const targetBounds = entry.boundingClientRect;
    // Passing to the finer window detection if the target is completely inside the viewport
    if (entry.intersectionRatio == 1) {
      (_a = this.intersectionObserver) === null || _a === void 0
        ? void 0
        : _a.unobserve(target);
      (_b = this.intersectionObserver) === null || _b === void 0
        ? void 0
        : _b.disconnect();
      const options = {
        threshold: this.thresholdList,
        rootMargin: this.getMargins(
          this.constructBoxWindow(entry.intersectionRect, entry.rootBounds),
          entry.rootBounds
        ),
        root: document,
      };
      this.intersectionObserver = new IntersectionObserver(
        this.finerWindowCallback.bind(this),
        options
      );
      (_c = this.intersectionObserver) === null || _c === void 0
        ? void 0
        : _c.observe(target);
    } else {
      this.positionObserverCallback({
        x: targetBounds.left,
        y: targetBounds.top,
        target,
        outOfViewport: entry.intersectionRatio === 0,
        rootBounds: entry.rootBounds,
      });
    }
  }
  hasPositionChanged(currentRect) {
    if (!this.previousPositionInfo) {
      return true;
    } else {
      return (
        this.previousPositionInfo.left !== currentRect.left ||
        this.previousPositionInfo.top !== currentRect.top ||
        this.previousPositionInfo.width !== currentRect.width ||
        this.previousPositionInfo.height !== currentRect.height
      );
    }
  }
  updatePosition(currentRect) {
    this.previousPositionInfo = {
      top: currentRect.top,
      left: currentRect.left,
      width: currentRect.width,
      height: currentRect.height,
    };
  }
  stopConfirmationCheck() {
    // RAF to detect if the target has finally stopped or not.
    console.log("RAF 2 called");
    if (this.target) {
      const targetRect = this.target.getBoundingClientRect();
      if (this.hasPositionChanged(targetRect)) {
        this.updatePosition(targetRect);
        this.positionObserverCallback({
          x: targetRect.left,
          y: targetRect.top,
          target: this.target,
          outOfViewport: false,
          rootBounds: targetRect,
        });
        this.timeToWaitTillStopConfirmed = Math.ceil(this.stopWaitTime / 16);
        this.positionRAF = requestAnimationFrame(
          this.stopConfirmationCheck.bind(this)
        );
      } else if (this.timeToWaitTillStopConfirmed !== 0) {
        --this.timeToWaitTillStopConfirmed;
        this.positionRAF = requestAnimationFrame(
          this.stopConfirmationCheck.bind(this)
        );
      } else {
        if (this.positionRAF) {
          cancelAnimationFrame(this.positionRAF);
        }
        this.observe(this.target);
      }
    } else {
      if (this.positionRAF) {
        cancelAnimationFrame(this.positionRAF);
      }
    }
  }
  finerWindowCallback(e) {
    console.log("target is the boundary");
    const entry = e[0];
    const target = entry.target;
    requestAnimationFrame(() => {
      var _a, _b, _c, _d;
      const targetBounds = entry.boundingClientRect;
      if (this.hasPositionChanged(targetBounds)) {
        this.updatePosition(targetBounds);
        if (this.positionObserverCallback) {
          this.positionObserverCallback({
            x: targetBounds.left,
            y: targetBounds.top,
            target,
            outOfViewport: false,
            rootBounds: entry.rootBounds,
          });
        }
        if (entry.intersectionRatio >= 0 && entry.intersectionRatio < 1) {
          // This means the target has started moving from the finer window (but not completely out of it also)
          (_a = this.intersectionObserver) === null || _a === void 0
            ? void 0
            : _a.unobserve(target);
          (_b = this.intersectionObserver) === null || _b === void 0
            ? void 0
            : _b.disconnect();
          this.timeToWaitTillStopConfirmed = Math.ceil(this.waitTime / 16); // assuming 1 animation-frame takes 16ms.
          this.positionRAF = requestAnimationFrame(
            this.stopConfirmationCheck.bind(this)
          );
        }
      }
      if (entry.intersectionRatio === 1) {
        // If it is completely inside the finer window, we just report its position
        if (this.positionObserverCallback) {
          this.positionObserverCallback({
            x: targetBounds.left,
            y: targetBounds.top,
            target,
            outOfViewport: false,
            rootBounds: entry.rootBounds,
          });
        }
      }
      if (entry.intersectionRatio === 0) {
        // or if it is completely out of finer window... then there are two possibilities...
        // 1) out of the viewport window
        // 2) just out of the finer window but inside the viewport window.
        // In either case, we give the decision to the viewport callback
        // This condition is necessary because sometimes due to fast movement, the target
        // may go completely out of the finer window. Like in a flick, the target may go
        // completely out of the finer window but still be inside the viewport window.
        // For example, if the finer window is at bottom-right corner, and the target is flicked
        // towards bottom-right, it may go completely out of the finer window but still be inside
        // the viewport window. So we need to hand over the control back to the viewport callback
        // to correctly identify if it is out of viewport or not.
        // Hence we re-observe it with the viewport callback.
        // This also handles the case when the target is out of viewport.
        // In both cases, we need to re-observe with the viewport callback.
        (_c = this.intersectionObserver) === null || _c === void 0
          ? void 0
          : _c.unobserve(target);
        (_d = this.intersectionObserver) === null || _d === void 0
          ? void 0
          : _d.disconnect();
        this.observe(target);
      }
      this.updatePosition(entry.boundingClientRect);
    });
  }
  disconnect() {
    var _a;
    (_a = this.intersectionObserver) === null || _a === void 0
      ? void 0
      : _a.disconnect();
  }
  constructBoxWindow(targetBounds, rootBounds) {
    const constrainedLeft = Math.min(
      Math.max(rootBounds.left, targetBounds.left),
      rootBounds.right - targetBounds.width
    );
    const constrainedTop = Math.min(
      Math.max(rootBounds.top, targetBounds.top),
      rootBounds.bottom - targetBounds.height
    );
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
    } else {
      viewportBounds = rootBounds;
    }
    const constrainedTopMarginOfWindow = Math.min(
      -(windowDimensions.top - 1 - viewportBounds.top),
      0
    );
    const constrainedRightMarginOfWindow = Math.min(
      -(viewportBounds.right - (windowDimensions.right + 1)),
      0
    );
    const constrainedBottomMarginOfWindow = Math.min(
      -(viewportBounds.bottom - (windowDimensions.bottom + 1)),
      0
    );
    const constrainedLeftMarginOfWindow = Math.min(
      -(windowDimensions.left - 1 - viewportBounds.left),
      0
    );
    return `${constrainedTopMarginOfWindow}px ${constrainedRightMarginOfWindow}px ${constrainedBottomMarginOfWindow}px ${constrainedLeftMarginOfWindow}px`;
  }
}
//# sourceMappingURL=position-observer.js.map
