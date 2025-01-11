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
export declare class PositionObserver {
    private intersectionObserver;
    private positionObserverCallback;
    private thresholdList;
    constructor(positionObserverCallback: positionObserverCallback, thresholdFraction?: number);
    observe(targetElement: HTMLElement | Element): void;
    private viewportCallback;
    private intersectionObsCallback;
    disconnect(): void;
    private constructBoxWindow;
    private getMargins;
}
//# sourceMappingURL=position-observer.d.ts.map