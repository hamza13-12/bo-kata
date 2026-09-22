/**
 * The soundtrack is listed in `public/music/tracks.json`, so songs can be
 * added or swapped without touching code:
 *
 * {
 *   "tracks": [
 *     { "title": "Khamosh", "artist": "MALIK.", "file": "khamosh.mp3",
 *       "link": "https://soundcloud.com/miraclemangal/khamosh" }
 *   ]
 * }
 *
 * `file` is relative to the manifest. `link` is optional and must be https.
 */

export interface Track {
  readonly title: string;
  readonly artist: string;
  /** Absolute URL of the audio file. */
  readonly url: string;
  /** Where to hear more from the artist. */
  readonly link?: string;
}

const nonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

function httpsUrl(value: unknown): string | undefined {
  if (!nonEmpty(value)) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/** Validates a parsed manifest. Bad entries are skipped rather than breaking the game. */
export function parseTracks(json: unknown, manifestUrl: string): Track[] {
  if (typeof json !== 'object' || json === null || !('tracks' in json)) return [];
  const { tracks } = json;
  if (!Array.isArray(tracks)) return [];

  const result: Track[] = [];
  for (const entry of tracks as unknown[]) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { title, artist, file, link } = entry as Record<string, unknown>;
    if (!nonEmpty(title) || !nonEmpty(artist) || !nonEmpty(file)) continue;
    let url: string;
    try {
      url = new URL(file, manifestUrl).href;
    } catch {
      continue;
    }
    const safeLink = httpsUrl(link);
    result.push({
      title: title.trim(),
      artist: artist.trim(),
      url,
      ...(safeLink ? { link: safeLink } : {}),
    });
  }
  return result;
}

/** The artists to credit, in first-appearance order. */
export function creditedArtists(tracks: readonly Track[]): string[] {
  return [...new Set(tracks.map((t) => t.artist))];
}
