import type { AudioEngine, MusicBus } from './AudioEngine';
import type { Track } from './tracks';
import { parseTracks } from './tracks';

/**
 * Plays the soundtrack from `public/music/tracks.json` on shuffle. With no
 * manifest or no playable tracks it quietly does nothing: the game's own
 * sound effects still play.
 */
export class MusicPlayer {
  private readonly element = new Audio();
  private tracks: Track[] = [];
  private index = 0;
  private bus: MusicBus | null = null;
  private started = false;
  private failures = 0;

  constructor(
    private readonly engine: AudioEngine,
    private readonly onTrackChange: (track: Track | null) => void,
  ) {
    this.element.preload = 'auto';
    this.element.addEventListener('ended', () => {
      this.advance();
    });
    this.element.addEventListener('playing', () => {
      this.failures = 0;
      this.onTrackChange(this.current ?? null);
    });
    this.element.addEventListener('error', () => {
      this.failures += 1;
      if (this.failures >= this.tracks.length) {
        this.onTrackChange(null);
        return; // Nothing plays: give up rather than loop on errors.
      }
      this.advance();
    });
  }

  private get current(): Track | undefined {
    return this.tracks[this.index];
  }

  async load(manifestUrl: string): Promise<readonly Track[]> {
    try {
      const response = await fetch(manifestUrl, { cache: 'no-cache' });
      if (!response.ok) return [];
      this.tracks = shuffle(parseTracks(await response.json(), manifestUrl));
    } catch {
      this.tracks = [];
    }
    return this.tracks;
  }

  /** Call from a user gesture (browsers block audio before one). */
  start(): void {
    if (this.started || !this.tracks.length) return;
    this.started = true;
    this.bus = this.engine.connectMusic(this.element);
    this.syncMute();
    this.playCurrent();
  }

  /** Muffled = heard from the neighbour's roof (title and game over screens). */
  setMuffled(muffled: boolean): void {
    this.bus?.setMuffled(muffled);
  }

  /** Only needed without Web Audio; otherwise the master bus handles muting. */
  syncMute(): void {
    this.element.muted = this.bus === null && this.engine.isMuted;
  }

  private advance(): void {
    this.index = (this.index + 1) % this.tracks.length;
    this.playCurrent();
  }

  private playCurrent(): void {
    const track = this.current;
    if (!track) return;
    this.element.src = track.url;
    this.element.play().catch(() => {
      // Autoplay refused or file missing: the 'error' handler moves on.
    });
  }
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    const other = a[j];
    if (tmp === undefined || other === undefined) continue;
    a[i] = other;
    a[j] = tmp;
  }
  return a;
}
