import type { Track } from '../audio/tracks';

function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in index.html`);
  return el;
}

function buttonById(id: string): HTMLButtonElement {
  const el = byId(id);
  if (!(el instanceof HTMLButtonElement)) throw new Error(`#${id} must be a <button>`);
  return el;
}

export interface GameOverInfo {
  readonly reason: 'cut' | 'crash';
  readonly by?: string;
  readonly cuts: number;
  readonly best: number;
  readonly newBest: boolean;
}

/** A floating name tag that follows a rival kite on screen. */
export class RivalLabel {
  private readonly el: HTMLDivElement;
  private readonly bar: HTMLElement;

  constructor(layer: HTMLElement, name: string) {
    this.el = document.createElement('div');
    this.el.className = 'label';
    const title = document.createElement('span');
    title.textContent = name;
    const meter = document.createElement('span');
    meter.className = 'label-meter';
    this.bar = document.createElement('i');
    meter.append(this.bar);
    this.el.append(title, meter);
    layer.append(this.el);
  }

  place(x: number, y: number, visible: boolean): void {
    this.el.hidden = !visible;
    if (visible) this.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }

  setLine(health: number, hooked: boolean): void {
    this.el.classList.toggle('hooked', hooked);
    this.bar.style.transform = `scaleX(${Math.max(0, health).toFixed(3)})`;
  }

  remove(): void {
    this.el.remove();
  }
}

/** All DOM overlay: screens, flight readout, pecha meter and celebrations. */
export class Hud {
  readonly flyButton = buttonById('fly');
  readonly againButton = buttonById('again');
  readonly muteButton = buttonById('mute');
  readonly labelLayer = byId('labels');

  private readonly intro = byId('intro');
  private readonly gameOver = byId('gameover');
  private readonly flight = byId('flight');
  private readonly score = byId('score');
  private readonly scoreCount = byId('score-count');
  private readonly state = byId('state');
  private readonly dor = byId('dor');
  private readonly height = byId('height');
  private readonly warn = byId('warn');
  private readonly tip = byId('tip');
  private readonly pecha = byId('pecha');
  private readonly pechaRival = byId('pecha-rival');
  private readonly pechaYou = byId('pecha-you');
  private readonly pechaThem = byId('pecha-them');
  private readonly pechaHint = byId('pecha-hint');
  private readonly bokata = byId('bokata');
  private readonly bokataSub = byId('bokata-sub');
  private readonly nowPlaying = byId('now-playing');
  private readonly nowPlayingTitle = byId('now-playing-title');
  private readonly credit = byId('credit');
  private readonly creditArtists = byId('credit-artists');
  private tipTimer = 0;
  private celebrateTimer = 0;
  private last = { state: '', dor: -1, height: -1 };

  showPlaying(): void {
    this.intro.hidden = true;
    this.gameOver.hidden = true;
    this.flight.hidden = false;
    this.score.hidden = false;
    this.setScore(0);
    this.showTip('Hold to pull and climb. Let go to give dheel. Hook a rival’s dor to fight.');
  }

  showGameOver(info: GameOverInfo): void {
    this.flight.hidden = true;
    this.setLow(false);
    this.hidePecha();
    this.tip.hidden = true;
    byId('over-title').textContent = info.reason === 'cut' ? 'Bo kata…' : 'Crashed!';
    byId('over-text').textContent =
      info.reason === 'cut'
        ? `${info.by ?? 'A rival'} cut your dor. Your patang is drifting over the Walled City.`
        : 'Your patang came down on the rooftops. Khainch to keep it in the sky.';
    byId('over-cuts').textContent = String(info.cuts);
    byId('over-best').textContent = String(info.best);
    byId('over-record').hidden = !info.newBest;
    this.gameOver.hidden = false;
    this.againButton.focus({ preventScroll: true });
  }

  setScore(cuts: number): void {
    this.scoreCount.textContent = String(cuts);
  }

  setFlight(pull: boolean, lineLength: number, height: number): void {
    const state = pull ? 'Khainch' : 'Dheel';
    if (state !== this.last.state) {
      this.state.textContent = state;
      this.state.classList.toggle('pull', pull);
      this.last.state = state;
    }
    const dor = Math.round(lineLength);
    if (dor !== this.last.dor) this.dor.textContent = String((this.last.dor = dor));
    const h = Math.round(height);
    if (h !== this.last.height) this.height.textContent = String((this.last.height = h));
  }

  setLow(low: boolean): void {
    if (this.warn.hidden === !low) return;
    this.warn.hidden = !low;
    if (low) this.tip.hidden = true;
  }

  showPecha(rival: string, yours: number, theirs: number, hint: string): void {
    this.pecha.hidden = false;
    this.pechaRival.textContent = rival;
    this.pechaYou.style.transform = `scaleX(${Math.max(0, yours).toFixed(3)})`;
    this.pechaThem.style.transform = `scaleX(${Math.max(0, theirs).toFixed(3)})`;
    if (this.pechaHint.textContent !== hint) this.pechaHint.textContent = hint;
  }

  hidePecha(): void {
    this.pecha.hidden = true;
  }

  celebrate(rival: string): void {
    this.bokataSub.textContent = `You cut ${rival}’s patang`;
    this.bokata.hidden = false;
    // Restart the CSS animation on back-to-back cuts.
    for (const animation of this.bokata.getAnimations()) {
      animation.cancel();
      animation.play();
    }
    window.clearTimeout(this.celebrateTimer);
    this.celebrateTimer = window.setTimeout(() => {
      this.bokata.hidden = true;
    }, 1900);
  }

  /** Shows what's playing, linking to the artist when there's a link. */
  setNowPlaying(track: Track | null): void {
    this.nowPlaying.hidden = track === null;
    if (!track) return;
    this.nowPlayingTitle.textContent = `${track.title} · ${track.artist}`;
    if (track.link && this.nowPlaying instanceof HTMLAnchorElement) {
      this.nowPlaying.href = track.link;
    } else {
      this.nowPlaying.removeAttribute('href');
    }
  }

  setCredits(artists: readonly string[]): void {
    this.credit.hidden = artists.length === 0;
    this.creditArtists.textContent = new Intl.ListFormat('en', { type: 'conjunction' }).format(
      artists,
    );
  }

  setMuted(muted: boolean): void {
    this.muteButton.setAttribute('aria-pressed', String(muted));
    this.muteButton.textContent = muted ? 'Sound off' : 'Sound on';
  }

  private showTip(text: string): void {
    this.tip.textContent = text;
    this.tip.hidden = false;
    window.clearTimeout(this.tipTimer);
    this.tipTimer = window.setTimeout(() => {
      this.tip.hidden = true;
    }, 5500);
  }
}
