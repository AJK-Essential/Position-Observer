/**
 * Copyright (c) 2025 AJK-Essential
 * This file is licensed under the MIT License.
 * See the LICENSE file in the project root for license information.
 */

export type positionObserverCallback = (data: positionData) => unknown;

export type positionData = {
  x: number;
  y: number;
  target: HTMLElement | Element;
  outOfViewport: boolean;
  rootBounds: DOMRect | null;
};

/**
 * Observes the position and visibility of a target element relative to the viewport or a specified root.
 *
 * The `PositionObserver` class uses the Intersection Observer API and requestAnimationFrame to provide
 * fine-grained detection of when an element enters, leaves, or moves within the viewport. It can detect
 * when the element is fully inside, partially visible, or completely outside the viewport, and reports
 * position changes via a callback.
 *
 * ## Usage
 *
 * ```typescript
 * const observer = new PositionObserver((info) => {
 *   // Handle position updates
 * });
 * observer.observe(document.getElementById('target'));
 * ```
 *
 * @template positionObserverCallback - The callback type for position updates.
 *
 * @public
 * @class
 *
 * @example
 * const observer = new PositionObserver((info) => {
 *   console.log(info);
 * });
 * observer.observe(document.querySelector('#myElement'));
 *
 * @remarks
 * - Uses IntersectionObserver for motion start detection.
 * - Switches to requestAnimationFrame during motion and to detect motion stop.
 * - Automatically switches back to IntersectionObserver after movement stops.
 *
 * @param positionObserverCallback - Callback invoked with position and visibility information.
 * @param thresholdFraction - Number of threshold steps for IntersectionObserver (default: 1000).
 */
export class PositionObserver {
  private intersectionObserver!: IntersectionObserver;
  private positionObserverCallback;
  private thresholdList;
  private positionRAF?: number;
  private previousPositionInfo?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  private target?: HTMLElement | Element;
  private timeToWaitTillStopConfirmed = 0;
  private waitTime = 0;
  private stopWaitTime = 0.5 * 1000; // 0.5 times 1000ms = 0.5s
  constructor(
    positionObserverCallback: positionObserverCallback,
    thresholdFraction = 1000
  ) {
    this.positionObserverCallback = positionObserverCallback;
    this.thresholdList = new Array(thresholdFraction + 1)
      .fill(0)
      .map((_, ind) => ind / thresholdFraction);
  }

  /**
   * Starts observing the specified target element for position changes.
   *
   * @param targetElement - The DOM element to observe for position changes.
   *
   * @remarks
   * - The observer will monitor the element's position relative to the viewport.
   * - Position updates will be reported via the provided callback.
   * - Call `disconnect()` to stop observing.
   */
  public observe(targetElement: HTMLElement | Element) {
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

  /**
   * Disconnects the underlying IntersectionObserver, stopping all observation of target elements and cancels the underlying requestAnimationFrame.
   * This method should be called to clean up resources when observation is no longer needed.
   */
  public disconnect() {
    this.intersectionObserver?.disconnect();
    this.clearPositionInfo();
    this.clearRequestAnimationFrame();
  }

  /**
   * Callback function for the initial IntersectionObserver that detects when the target element
   * enters or exits the viewport boundary. If the target is fully inside the viewport (intersectionRatio === 1),
   * it transitions to a finer-grained IntersectionObserver with custom margins for more precise detection.
   * Otherwise, it reports the current position of the target element.
   *
   * @param e - An array of IntersectionObserverEntry objects representing intersection changes for the observed target.
   */
  private viewportWindowDetectionCallback(e: IntersectionObserverEntry[]) {
    console.log("viewport is the boundary");
    const entry = e[0];
    const target = entry.target;
    this.clearPositionInfo();
    this.clearRequestAnimationFrame();
    // Passing to the finer window detection if the target is completely inside the viewport
    if (entry.intersectionRatio == 1) {
      this.intersectionObserver?.unobserve(target);
      this.intersectionObserver?.disconnect();
      const options: IntersectionObserverInit = {
        threshold: this.thresholdList,
        rootMargin: this.getMargins(
          this.constructBoxWindow(
            entry.intersectionRect,
            entry.rootBounds as DOMRect
          ),
          entry.rootBounds
        ),
        root: document,
      };
      this.intersectionObserver = new IntersectionObserver(
        this.finerWindowCallback.bind(this),
        options
      );
      this.intersectionObserver?.observe(target);
    } else {
      this.reportPosition(
        target,
        entry.rootBounds,
        entry.intersectionRatio === 0
      );
    }
  }

  /**
   * Determines whether the position or size of an observed element has changed
   * compared to the previously stored position information.
   * This is used only during requestAnimationFrame checks to detect movement.
   *
   * @param currentRect - The current bounding rectangle of the observed element.
   * @returns `true` if this is the first check or if any of the `left`, `top`, `width`, or `height`
   *          properties have changed since the last observation; otherwise, `false`.
   */
  private hasPositionChanged(currentRect: DOMRect) {
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

  /**
   * Updates the previous position information with the current rectangle's properties.
   * This is also used only during requestAnimationFrame checks to track movement.
   *
   * @param currentRect - The current bounding client rectangle of the observed element.
   */
  private updatePosition(currentRect: DOMRect) {
    this.previousPositionInfo = {
      top: currentRect.top,
      left: currentRect.left,
      width: currentRect.width,
      height: currentRect.height,
    };
  }

  /**
   * Monitors the target element's position using requestAnimationFrame to determine when it has stopped moving.
   *
   * This method repeatedly checks the target's position. If the position changes, it updates and reports the new position,
   * and resets the confirmation wait timer. If the position remains unchanged, it decrements the wait timer until it reaches zero,
   * at which point it considers the target to have stopped and resets observation state.
   *
   * - If the target is not present, it clears any pending animation frames and position information.
   * - If the target's position changes, it updates and reports the position, and continues checking.
   * - If the position does not change, it waits for a specified number of frames before confirming the stop.
   *
   * This method is intended to be called recursively via requestAnimationFrame.
   *
   * @private
   */
  private stopConfirmationCheck() {
    // RAF to detect if the target has finally stopped or not.
    console.log("RAF 2 called");
    this.clearRequestAnimationFrame();
    if (this.target) {
      const targetRect = this.target.getBoundingClientRect();
      if (this.hasPositionChanged(targetRect)) {
        this.updatePosition(targetRect);
        this.reportPosition(this.target, targetRect, false);
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
        this.clearRequestAnimationFrame();
        this.clearPositionInfo();
        this.observe(this.target);
      }
    } else {
      this.clearRequestAnimationFrame();
      this.clearPositionInfo();
    }
  }

  /**
   * Callback function for the IntersectionObserver monitoring the "finer window" boundary.
   *
   * This method is triggered when the observed target's intersection with the boundary changes.
   * It performs the following actions:
   * - Logs when the target is at the boundary.
   * - Clears any pending animation frames and position information.
   * - If the target is fully within the boundary (`intersectionRatio === 1`), reports its position.
   * - If the target is partially within the boundary (`0 <= intersectionRatio < 1`), reports its position,
   *   stops observing the target, disconnects the observer, and initiates a confirmation check to determine
   *   if the target has stopped moving, using `requestAnimationFrame`.
   *
   * @param e - An array of `IntersectionObserverEntry` objects representing intersection changes.
   */
  private finerWindowCallback(e: IntersectionObserverEntry[]) {
    console.log("target is the boundary");
    this.clearRequestAnimationFrame();
    this.clearPositionInfo();
    const entry = e[0];
    const target = entry.target;
    requestAnimationFrame(() => {
      if (entry.intersectionRatio === 1) {
        this.reportPosition(target, entry.rootBounds, false);
      } else if (entry.intersectionRatio >= 0 && entry.intersectionRatio < 1) {
        this.reportPosition(target, entry.rootBounds, false);
        // This means the target has started moving from the finer window (but not completely out of it also)
        this.intersectionObserver?.unobserve(target);
        this.intersectionObserver?.disconnect();
        this.timeToWaitTillStopConfirmed = Math.ceil(this.waitTime / 16); // assuming 1 animation-frame takes 16ms.
        this.positionRAF = requestAnimationFrame(
          this.stopConfirmationCheck.bind(this)
        );
      }
    });
  }

  /**
   * Clears the stored previous position information.
   *
   * This method sets `previousPositionInfo` to `undefined`, effectively removing any
   * previously tracked position data. Typically used to reset the observer's state.
   *
   * @private
   */
  private clearPositionInfo() {
    this.previousPositionInfo = undefined;
  }

  /**
   * Reports the position of a target element relative to the viewport.
   *
   * @param target - The HTML element whose position is being reported.
   * @param rootBounds - The bounding rectangle of the root element, or `null` if not applicable.
   * @param outOfViewport - Indicates whether the target element is outside the viewport.
   *
   * @remarks
   * This method retrieves the bounding client rectangle of the target element and invokes
   * the `positionObserverCallback` (if defined) with the position data and additional context.
   */
  private reportPosition(
    target: HTMLElement | Element,
    rootBounds: DOMRect | null,
    outOfViewport: boolean
  ) {
    const targetBounds = target.getBoundingClientRect();
    if (this.positionObserverCallback) {
      this.positionObserverCallback({
        x: targetBounds.left,
        y: targetBounds.top,
        target,
        outOfViewport,
        rootBounds,
      });
    }
  }

  /**
   * Cancels any pending animation frame request associated with position updates.
   * If a requestAnimationFrame has been scheduled and its ID is stored in `this.positionRAF`,
   * this method will cancel it to prevent unnecessary executions.
   */
  private clearRequestAnimationFrame() {
    if (this.positionRAF) {
      cancelAnimationFrame(this.positionRAF);
    }
  }

  /**
   * Calculates a constrained bounding box for a target element within a root container.
   *
   * Ensures that the target's box does not overflow the root's bounds by adjusting its position
   * if necessary. The resulting box will have the same width and height as the target, but its
   * top-left corner will be shifted to keep it fully within the root's rectangle.
   *
   * @param targetBounds - The bounding rectangle of the target element.
   * @param rootBounds - The bounding rectangle of the root container.
   * @returns An object representing the constrained box with properties: left, top, right, and bottom.
   */
  private constructBoxWindow(targetBounds: DOMRect, rootBounds: DOMRect) {
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

  /**
   * Calculates the constrained margins between the given window dimensions and the viewport or a specified root bounds.
   *
   * The margins are computed such that they do not exceed the viewport or root bounds, and are returned as a CSS margin string
   * in the format: "top right bottom left".
   *
   * @param windowDimensions - An object representing the window's bounding rectangle with `left`, `top`, `right`, and `bottom` properties.
   * @param rootBounds - An optional `DOMRect` representing the root bounds to constrain the margins. If `null`, the current `visualViewport` is used.
   * @returns A string representing the constrained margins in CSS shorthand format: "top right bottom left".
   */
  private getMargins(
    windowDimensions: {
      left: number;
      top: number;
      right: number;
      bottom: number;
    },
    rootBounds: DOMRect | null
  ) {
    let viewportBounds;
    if (!rootBounds) {
      viewportBounds = {
        top: visualViewport!.offsetTop,
        left: visualViewport!.offsetLeft,
        right: visualViewport!.width + visualViewport!.offsetLeft,
        bottom: visualViewport!.height + visualViewport!.offsetTop,
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
