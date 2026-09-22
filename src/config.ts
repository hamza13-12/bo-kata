/**
 * Every tuning number in the game lives here, so balancing never means
 * hunting through rendering code.
 */

export type Vec3Tuple = readonly [number, number, number];

export interface KiteColors {
  readonly left: string;
  readonly right: string;
  readonly accent: string;
}

export const CAMERA = {
  fov: 60,
  near: 0.3,
  far: 2500,
  position: [0, 13.7, 9] as Vec3Tuple,
  /** Tilted up: the fight happens in the sky, not on the roof. */
  baseLook: [0, 30, -60] as Vec3Tuple,
  /** How far the view leans toward your kite (0 = fixed, 1 = locked on). */
  followKite: 0.22,
  sway: 0.12,
} as const;

export const SKY = {
  top: '#2B2350',
  middle: '#D9607A',
  horizon: '#F7B252',
  fog: '#E8966D',
  fogNear: 90,
  fogFar: 760,
  sunDirection: [-0.55, 0.09, -1] as Vec3Tuple,
} as const;

/** The sky a round fades into as the evening goes on. */
export const NIGHT_SKY = {
  top: '#0B0A22',
  middle: '#261B48',
  horizon: '#6A3B5C',
  fog: '#241C3C',
  moonDirection: [0.45, 0.32, -1] as Vec3Tuple,
} as const;

export const LIGHT_LEVELS = {
  day: { hemisphere: 2.4, sun: 2.8, fill: 1.0 },
  night: { hemisphere: 0.8, sun: 0, fill: 1.3 },
} as const;

export const TIME_OF_DAY = {
  /** Seconds into a round when the sun starts to set. */
  duskStarts: 20,
  /** Seconds into a round when it's full night. */
  nightFalls: 150,
  /** How quickly the sky catches up to where it should be (per second). */
  easing: 0.6,
} as const;

/** The payoff when you cut a kite. */
export const JUICE = {
  slowMoSeconds: 0.7,
  slowMoScale: 0.3,
  shake: 0.45,
  /** Shake fades by this factor per second. */
  shakeDecay: 3,
} as const;

export const FIREWORKS = {
  poolSize: 16,
  particles: 140,
  /** Night level after which fireworks go up across the city. */
  ambientFromNight: 0.55,
  ambientEvery: [2.5, 6] as const,
  colors: ['#FFD27A', '#FF6B9A', '#7AE0FF', '#B8FF7A', '#FFF4E0', '#C79BFF'],
} as const;

export const KITE_PHYSICS = {
  minLine: 55,
  maxLine: 150,
  /** Metres of line per second while pulling (khainch). */
  reelInSpeed: 2,
  /** Hand-over-hand pull in a pecha: much faster than a steady khainch. */
  pechaReelInSpeed: 7,
  /** Metres of line per second while giving slack (dheel). */
  letOutSpeed: 9,
  pullSteer: 4.5,
  slackSteer: 0.45,
  pullLift: 2,
  slackSink: 3.4,
  pullDamping: 2.6,
  slackDamping: 1.2,
  windDrift: 0.6,
  downwindZ: 0.8,
  /** Lowest a kite can sit above its flyer's hand. */
  floorClearance: 4,
  minTargetHeight: 10,
  fallGravity: 2.5,
  fallDrag: 0.6,
} as const;

export const WIND = {
  base: 4,
  gust: 2,
  gustFrequency: 0.3,
  flutter: 1,
  flutterFrequency: 1.7,
} as const;

export const PLAYER = {
  anchor: [0.9, 12.9, 5.8] as Vec3Tuple,
  start: [8, 48, -60] as Vec3Tuple,
  startLine: 85,
  scale: 1.8,
  colors: { left: '#E0226E', right: '#F5B700', accent: '#1F9E6B' } satisfies KiteColors,
  stringColor: '#FFF1F5',
  stringSegments: 40,
  /** Seconds pinned to the rooftops before the kite counts as crashed. */
  crashSeconds: 4,
  lowWarningHeight: 14,
  /** Distance along the pointer ray used to aim the kite. */
  aimDistance: 90,
} as const;

export const PECHA = {
  /** Strings closer than this (m) hook into a pecha. */
  engageDistance: 3,
  /** A hooked pecha only breaks apart beyond this distance (m). */
  releaseDistance: 8,
  damageRate: 0.05,
  /** How much of the other line's speed you need to match to avoid damage. */
  counterFactor: 0.6,
  kiteSpeedSaw: 0.35,
  /** Ignore this fraction of each line nearest the rooftops. */
  ignoreNearAnchor: 0.25,
  /** Your dor recovers between fights (fraction per second). */
  regenPerSecond: 0.08,
} as const;

export const RIVALS = {
  scale: 1.8,
  stringColor: '#FFE3B8',
  stringSegments: 24,
  firstSpawnDelay: 2.5,
  respawnDelay: [2, 4] as const,
  names: [
    'Gawalmandi',
    'Mochi Gate',
    'Anarkali',
    'Ichhra',
    'Shahdara',
    'Krishan Nagar',
    'Bhati Gate',
    'Samanabad',
    'Mozang',
    'Lohari Gate',
  ],
  colors: [
    { left: '#3E6FB0', right: '#FFF4E0', accent: '#C4323B' },
    { left: '#1F9E6B', right: '#F5B700', accent: '#FFF4E0' },
    { left: '#7B3FA0', right: '#F08A24', accent: '#FFF4E0' },
    { left: '#C4323B', right: '#FFF4E0', accent: '#1F9E6B' },
    { left: '#F08A24', right: '#3E6FB0', accent: '#F5B700' },
  ] satisfies KiteColors[],
} as const;

export const LANDMARKS = {
  badshahi: { x: -170, z: -400, halfWidth: 92, halfDepth: 58 },
  minar: { x: 165, z: -320, clearRadius: 58 },
} as const;

export const CITY = {
  cell: 9,
  gridX: [-36, 36] as readonly [number, number],
  gridZ: [-54, 6] as readonly [number, number],
  /** Every Nth row/column of cells is a street. */
  streetEveryX: 5,
  streetEveryZ: 6,
  /** Keep this rectangle clear for the player's own house. */
  playerLot: { halfWidth: 16, minZ: -14, maxZ: 22 },
  /** Rooftops in this band are where rival flyers stand. */
  flyerZone: { minAbsX: 25, maxAbsX: 95, minZ: -80, maxZ: -15 },
  plaster: [
    '#D9B48C',
    '#C99A73',
    '#B87858',
    '#E3C9A2',
    '#A8684A',
    '#CFA27E',
    '#8FB3A8',
    '#D98E8E',
    '#E6D3B3',
    '#B5896B',
  ],
} as const;

export const AMBIENT_KITES = {
  count: 12,
  colors: [
    { left: '#F5B700', right: '#E0226E', accent: '#FFF4E0' },
    { left: '#1F9E6B', right: '#FFF4E0', accent: '#E0226E' },
    { left: '#3E6FB0', right: '#F5B700', accent: '#FFF4E0' },
    { left: '#FFF4E0', right: '#C4323B', accent: '#1F9E6B' },
    { left: '#7B3FA0', right: '#F5B700', accent: '#FFF4E0' },
    { left: '#E0226E', right: '#3E6FB0', accent: '#F5B700' },
  ] satisfies KiteColors[],
} as const;
