import { Vector2 } from 'three';

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
      this.pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
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
