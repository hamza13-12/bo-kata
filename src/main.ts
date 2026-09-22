import './styles.css';
import { AudioEngine } from './audio/AudioEngine';
import { MusicPlayer } from './audio/MusicPlayer';
import { creditedArtists } from './audio/tracks';
import { createRng } from './core/rng';
import { Game } from './game/Game';
import { loadBest, loadMuted, saveMuted } from './game/storage';
import { Controls } from './input/Controls';
import { Hud } from './ui/Hud';

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function boot(): void {
  const canvas = document.getElementById('scene');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing #scene canvas');

  if (!supportsWebGL()) {
    const message = document.getElementById('nogl');
    if (message) message.hidden = false;
    return;
  }

  const hud = new Hud();
  const audio = new AudioEngine(loadMuted());
  const controls = new Controls(canvas);
  const music = new MusicPlayer(audio, (track) => {
    hud.setNowPlaying(track);
  });
  void music.load(new URL('music/tracks.json', document.baseURI).href).then((tracks) => {
    hud.setCredits(creditedArtists(tracks));
  });

  const game = new Game({
    canvas,
    hud,
    audio,
    controls,
    // A new neighbourhood every visit.
    rng: createRng(Date.now()),
    best: loadBest(),
    reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    // Clear while you fly; muffled, like the neighbour's roof, on the menus.
    onPhaseChange: (phase) => {
      music.setMuffled(phase !== 'playing');
    },
  });

  hud.setMuted(audio.isMuted);
  hud.muteButton.addEventListener('click', () => {
    audio.unlock();
    audio.setMuted(!audio.isMuted);
    hud.setMuted(audio.isMuted);
    music.syncMute();
    saveMuted(audio.isMuted);
  });
  hud.flyButton.addEventListener('click', () => {
    audio.unlock();
    music.start();
    game.play();
  });
  hud.againButton.addEventListener('click', () => {
    audio.unlock();
    music.start();
    game.restart();
  });

  game.start();

  // Dev-only playtesting hook: `__boKata.debugState()` in the console.
  if (import.meta.env.DEV) Object.assign(window, { __boKata: game, __music: music });
}

boot();
