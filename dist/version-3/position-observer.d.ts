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
export declare class PositionObserver {
    private intersectionObserver;
    private positionObserverCallback;
    private thresholdList;
    private positionRAF?;
    private previousPositionInfo?;
    private target?;
    private timeToWaitTillStopConfirmed;
    private waitTime;
    private stopWaitTime;
    constructor(positionObserverCallback: positionObserverCallback, thresholdFraction?: number);
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
    observe(targetElement: HTMLElement | Element): void;
    /**
     * Disconnects the underlying IntersectionObserver, stopping all observation of target elements and cancels the underlying requestAnimationFrame.
     * This method should be called to clean up resources when observation is no longer needed.
     */
    disconnect(): void;
    /**
     * Callback function for the initial IntersectionObserver that detects when the target element
     * enters or exits the viewport boundary. If the target is fully inside the viewport (intersectionRatio === 1),
     * it transitions to a finer-grained IntersectionObserver with custom margins for more precise detection.
     * Otherwise, it reports the current position of the target element.
     *
     * @param e - An array of IntersectionObserverEntry objects representing intersection changes for the observed target.
     */
    private viewportWindowDetectionCallback;
    /**
     * Determines whether the position or size of an observed element has changed
     * compared to the previously stored position information.
     * This is used only during requestAnimationFrame checks to detect movement.
     *
     * @param currentRect - The current bounding rectangle of the observed element.
     * @returns `true` if this is the first check or if any of the `left`, `top`, `width`, or `height`
     *          properties have changed since the last observation; otherwise, `false`.
     */
    private hasPositionChanged;
    /**
     * Updates the previous position information with the current rectangle's properties.
     * This is also used only during requestAnimationFrame checks to track movement.
     *
     * @param currentRect - The current bounding client rectangle of the observed element.
     */
    private updatePosition;
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
    private stopConfirmationCheck;
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
    private finerWindowCallback;
    /**
     * Clears the stored previous position information.
     *
     * This method sets `previousPositionInfo` to `undefined`, effectively removing any
     * previously tracked position data. Typically used to reset the observer's state.
     *
     * @private
     */
    private clearPositionInfo;
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
    private reportPosition;
    /**
     * Cancels any pending animation frame request associated with position updates.
     * If a requestAnimationFrame has been scheduled and its ID is stored in `this.positionRAF`,
     * this method will cancel it to prevent unnecessary executions.
     */
    private clearRequestAnimationFrame;
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
    private constructBoxWindow;
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
    private getMargins;
}
//# sourceMappingURL=position-observer.d.ts.map