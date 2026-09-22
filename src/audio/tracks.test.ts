import { describe, expect, it } from 'vitest';
import { creditedArtists, parseTracks } from './tracks';

const MANIFEST = 'https://bokata.example/music/tracks.json';

describe('parseTracks', () => {
  it('reads tracks and resolves files next to the manifest', () => {
    const tracks = parseTracks(
      {
        tracks: [
          {
            title: 'Khamosh',
            artist: 'MALIK.',
            file: 'khamosh.mp3',
            link: 'https://soundcloud.com/miraclemangal/khamosh',
          },
        ],
      },
      MANIFEST,
    );
    expect(tracks).toEqual([
      {
        title: 'Khamosh',
        artist: 'MALIK.',
        url: 'https://bokata.example/music/khamosh.mp3',
        link: 'https://soundcloud.com/miraclemangal/khamosh',
      },
    ]);
  });

  it('skips entries missing a title, artist or file', () => {
    const tracks = parseTracks(
      {
        tracks: [
          { title: 'No file', artist: 'A' },
          { artist: 'A', file: 'a.mp3' },
          { title: ' ', artist: 'A', file: 'a.mp3' },
          'not an object',
          { title: 'Good', artist: 'A', file: 'good.mp3' },
        ],
      },
      MANIFEST,
    );
    expect(tracks.map((t) => t.title)).toEqual(['Good']);
  });

  it('drops links that are not https', () => {
    const [track] = parseTracks(
      { tracks: [{ title: 'T', artist: 'A', file: 't.mp3', link: 'javascript:alert(1)' }] },
      MANIFEST,
    );
    expect(track?.link).toBeUndefined();
  });

  it('returns nothing for a malformed manifest', () => {
    expect(parseTracks(null, MANIFEST)).toEqual([]);
    expect(parseTracks({ tracks: 'nope' }, MANIFEST)).toEqual([]);
    expect(parseTracks([], MANIFEST)).toEqual([]);
  });
});

describe('creditedArtists', () => {
  it('lists each artist once, in order', () => {
    const tracks = parseTracks(
      {
        tracks: [
          { title: '1', artist: 'MALIK.', file: '1.mp3' },
          { title: '2', artist: 'Osi', file: '2.mp3' },
          { title: '3', artist: 'MALIK.', file: '3.mp3' },
        ],
      },
      MANIFEST,
    );
    expect(creditedArtists(tracks)).toEqual(['MALIK.', 'Osi']);
  });
});
