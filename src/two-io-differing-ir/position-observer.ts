export type positionData = {
  x: number;
  y: number;
  target: HTMLElement | Element;
  outOfViewport: boolean;
  rootBounds: DOMRect | null;
};

export class PositionObserver {
  private intersectionObserver!: IntersectionObserver;
  private positionObserverCallback: (data: positionData) => unknown;
  private thresholdList;

  private target?: HTMLElement | Element;

  private viewportIR?: number;

  private viewportVisible?: boolean;

  private backupViewportIntersectionObserver?: IntersectionObserver;

  constructor(
    positionObserverCallback: typeof this.positionObserverCallback,
    thresholdFraction = 1000
  ) {
    this.positionObserverCallback = positionObserverCallback;
    this.thresholdList = new Array(thresholdFraction + 1)
      .fill(0)
      .map((_, ind) => ind / thresholdFraction);
  }

  public observe(targetElement: HTMLElement | Element) {
    this.target = targetElement;
    this.backupViewportIntersectionObserver = new IntersectionObserver(
      (e) => {
        this.intersectionObserver?.unobserve(e[0].target);
        this.intersectionObserver?.disconnect();
        this.setupIntersectionObserverFromStart(e[0].target);
      },
      {
        threshold: this.thresholdList,
      }
    );
    this.backupViewportIntersectionObserver.observe(targetElement);
  }

  private setupIntersectionObserverFromStart(
    targetElement: HTMLElement | Element
  ) {
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

  private reportPosition(rootBounds: DOMRect | null = null) {
    this.target?.dispatchEvent(
      new CustomEvent("movement-observed", {
        composed: true,
        bubbles: true,
        detail: {
          rootBounds,
          outOfViewport: !this.viewportVisible,
        },
      })
    );
  }

  private getMargins(
    windowDimensions: {
      left: number;
      top: number;
      right: number;
      bottom: number;
    },
    rootBounds: DOMRect
  ) {
    const viewportBounds = rootBounds;
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

  private viewportWindowDetectionCallback(e: IntersectionObserverEntry[]) {
    console.log("viewport callback", e[0].intersectionRatio);
    const entry = e[0];
    const IR = entry.intersectionRatio;
    this.viewportVisible = IR > 0;
    this.reportPosition(entry.rootBounds);

    this.viewportIR = IR;

    if (IR > 0) {
      const options: IntersectionObserverInit = {
        threshold: this.thresholdList,
        rootMargin: this.getMargins(
          entry.intersectionRect,
          entry.rootBounds as DOMRect
        ),
        root: document,
      };
      this.intersectionObserver.unobserve(entry.target);
      this.intersectionObserver.disconnect();
      this.intersectionObserver = new IntersectionObserver(
        this.finerWindowDetectionCallback.bind(this),
        options
      );
      this.intersectionObserver.observe(entry.target);
    } else {
      // do nothing if outside
    }
  }

  private finerWindowDetectionCallback(e: IntersectionObserverEntry[]) {
    console.log("fine window callback", e[0].intersectionRatio);
    const entry = e[0];
    const IR = entry.intersectionRatio;
    this.reportPosition(entry.rootBounds);
    if (this.viewportIR !== IR) {
      // motion started
      this.intersectionObserver.disconnect();

      this.setupIntersectionObserverFromStart(entry.target);
    } else {
      // motion stopped. Wait for next detection.
    }
  }
}
