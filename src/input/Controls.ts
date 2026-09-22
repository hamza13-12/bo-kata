import { Vector2 } from 'three';

/** How far above a finger the kite aims (px). */
const TOUCH_LIFT = 70;

/**
 * Mouse, touch and keyboard: move to steer, hold (or Space) to pull.
 * `pointer` is in normalised device coordinates (-1..1).
 */
export class Controls {
  readonly pointer = new Vector2(0.1, 0.35);
  enabled = false;
  private pointerDown = false;
  private spaceDown = false;
  private readonly abort = new AbortController();

  constructor(surface: HTMLElement) {
    const { signal } = this.abort;
    const track = (e: PointerEvent): void => {
      // Aim a little above a finger, so your thumb doesn't hide the kite.
      const y = e.pointerType === 'touch' ? e.clientY - TOUCH_LIFT : e.clientY;
      this.pointer.set((e.clientX / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    };
    const release = (): void => {
      this.pointerDown = false;
    };

    surface.addEventListener(
      'pointermove',
      (e) => {
        if (this.enabled) track(e);
      },
      { signal },
    );
    surface.addEventListener(
      'pointerdown',
      (e) => {
        if (!this.enabled) return;
        track(e);
        this.pointerDown = true;
        surface.setPointerCapture(e.pointerId);
      },
      { signal },
    );
    surface.addEventListener('pointerup', release, { signal });
    // No long-press menu or magnifier while holding khainch on a phone.
    surface.addEventListener(
      'contextmenu',
      (e) => {
        e.preventDefault();
      },
      { signal },
    );
    surface.addEventListener('pointercancel', release, { signal });

    addEventListener(
      'keydown',
      (e) => {
        if (e.code === 'Space' && this.enabled) {
          this.spaceDown = true;
          e.preventDefault();
        }
      },
      { signal },
    );
    addEventListener(
      'keyup',
      (e) => {
        if (e.code === 'Space') this.spaceDown = false;
      },
      { signal },
    );
    addEventListener(
      'blur',
      () => {
        this.pointerDown = false;
        this.spaceDown = false;
      },
      { signal },
    );
  }

  get pulling(): boolean {
    return this.enabled && (this.pointerDown || this.spaceDown);
  }

  dispose(): void {
    this.abort.abort();
  }
}
