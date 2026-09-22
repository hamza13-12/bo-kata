# Soundtrack

Drop audio files in this folder and list them in `tracks.json`. No code
changes are needed: the game shuffles the list, shows "Now playing" with a
link to the artist, and credits every artist on the title screen.

```json
{
  "tracks": [
    {
      "title": "Khamosh",
      "artist": "MALIK.",
      "file": "khamosh.mp3",
      "link": "https://soundcloud.com/miraclemangal/khamosh"
    }
  ]
}
```

- `file` is relative to this folder. MP3 or OGG at 128–192 kbps keeps the
  game quick to load.
- `link` is optional and must be an `https://` URL.
- Leave `tracks` empty and the game plays with its own sound effects only.

Only add music you have the artist's permission to use. The music in this
folder belongs to its artists and is not covered by the game's code licence.
