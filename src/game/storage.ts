/**
 * Tiny localStorage wrapper. Storage can be missing or throw (private
 * windows, blocked site data), so every access fails soft.
 */

const BEST_KEY = 'bo-kata:best';
const MUTED_KEY = 'bo-kata:muted';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the game just won't remember this.
  }
}

export function loadBest(): number {
  const value = Number(read(BEST_KEY));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function saveBest(best: number): void {
  write(BEST_KEY, String(best));
}

export function loadMuted(): boolean {
  return read(MUTED_KEY) === '1';
}

export function saveMuted(muted: boolean): void {
  write(MUTED_KEY, muted ? '1' : '0');
}
