/**
 * Password generation for Tetris Attack (SNES) / パネルでポン.
 *
 * The algorithm is a faithful port of the one implemented in the original
 * Windows tool "Tetris Attack/Panel De Pon Passwords" (tapass.exe, v1.5, 2003).
 * It was recovered by static analysis of the binary and verified against the
 * running program; see README.md for the methodology.
 *
 * This module is pure: no I/O, no globals, no side effects.
 */

export type Game = "tetris-attack" | "panel-de-pon";

export class PasswordInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordInputError";
  }
}

/* ------------------------------------------------------------------ *
 * Low level: 40 bit payload -> 8 character password
 * ------------------------------------------------------------------ */

/** Per-position XOR mask applied to each 5 bit group. */
const POSITION_MASK = [0, 16, 8, 24, 4, 20, 28, 12] as const;

/** 32 symbol alphabets. The two games differ only at indices 3, 11, 12 and 21. */
const ALPHABET: Record<Game, string> = {
  "tetris-attack": "NXT&24HLDRZ!?K3P76YB9%S5JGQ8CM1F",
  "panel-de-pon": "NXTA24HLDRZUIK3P76YB9ES5JGQ8CM1F",
};

/**
 * Splits the 40 bit payload (w2:w1:w0, big endian) into eight 5 bit groups,
 * most significant group first.
 */
export function splitPayload(w0: number, w1: number, w2: number): number[] {
  return [
    (w2 & 0xf8) >> 3,
    ((w1 & 0xc000) >> 14) | ((w2 & 0x7) << 2),
    (w1 >> 9) & 0x1f,
    (w1 >> 4) & 0x1f,
    ((w1 & 0xf) << 1) | ((w0 & 0x8000) >> 15),
    (w0 >> 10) & 0x1f,
    (w0 >> 5) & 0x1f,
    w0 & 0x1f,
  ];
}

/**
 * Renders the 40 bit payload as the printable 8 character password.
 *
 * @param charSet Alphabet rotation (0-7). The original program exposes this
 *   through a hidden control that always holds 0, and forces 0 for
 *   Panel de Pon. It is kept here for completeness.
 */
export function encodePassword(
  w0: number,
  w1: number,
  w2: number,
  game: Game,
  charSet = 0,
): string {
  const row = game === "panel-de-pon" ? 0 : charSet & 0x7;
  const alphabet = ALPHABET[game];
  return splitPayload(w0, w1, w2)
    .map((value, index) => {
      let t = value ^ POSITION_MASK[index];
      if (game === "tetris-attack") {
        // Tetris Attack swaps the two symbols at indices 11 and 12.
        if (t === 11) t = 12;
        else if (t === 12) t = 11;
      }
      return alphabet[t ^ POSITION_MASK[row]];
    })
    .join("");
}

/* ------------------------------------------------------------------ *
 * Shared helpers
 * ------------------------------------------------------------------ */

function requireInteger(name: string, value: number, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new PasswordInputError(
      `${name} must be an integer between ${min} and ${max} (got ${value})`,
    );
  }
  return value;
}

const u16 = (value: number) => value & 0xffff;

/* ------------------------------------------------------------------ *
 * Puzzle mode
 * ------------------------------------------------------------------ */

export interface PuzzleInput {
  /** Stage group, 1-6. */
  stageHigh: number;
  /** Stage within the group, 1-10. */
  stageLow: number;
  /** Elapsed hours, 0-9. */
  hours: number;
  /** Elapsed minutes, 0-59. */
  minutes: number;
  /** Elapsed seconds, 0-59. */
  seconds: number;
  /** "Extra Puzzle Set" (the second set of 60 puzzles). */
  extraPuzzleSet: boolean;
}

export const PUZZLE_LIMITS = {
  stageHigh: [1, 6],
  stageLow: [1, 10],
  hours: [0, 9],
  minutes: [0, 59],
  seconds: [0, 59],
} as const;

/** Encodes Puzzle mode into the raw 40 bit payload. */
export function encodePuzzlePayload(game: Game, input: PuzzleInput): [number, number, number] {
  const stageHigh = requireInteger("stageHigh", input.stageHigh, 1, 6);
  const stageLow = requireInteger("stageLow", input.stageLow, 1, 10);
  const hours = requireInteger("hours", input.hours, 0, 9);
  const minutes = requireInteger("minutes", input.minutes, 0, 59);
  const seconds = requireInteger("seconds", input.seconds, 0, 59);
  const extra = input.extraPuzzleSet ? 1 : 0;

  const stage = (stageHigh - 1) * 10 + stageLow - 1;

  const w0 = u16(
    (stage & 0x7f) | (extra << 7) | ((seconds & 0x3f) << 8) | ((minutes & 0x3) << 14),
  );
  const check =
    game === "tetris-attack"
      ? u16(~((minutes & 0x3) + (stage & 0x7f) + (seconds & 0x3f)))
      : w0;
  const w1 = u16(((minutes & 0x3f) >> 2) | ((hours & 0xf) << 4) | ((check & 0xff) << 8));
  const w2 = check >> 8;
  return [w0, w1, w2];
}

export function generatePuzzlePassword(game: Game, input: PuzzleInput, charSet = 0): string {
  return encodePassword(...encodePuzzlePayload(game, input), game, charSet);
}

/* ------------------------------------------------------------------ *
 * Vs. mode (Tetris Attack only)
 * ------------------------------------------------------------------ */

export const VS_STAGES = [
  "Breeze",
  "Glacial",
  "Forest",
  "Flower",
  "Water",
  "Blaze",
  "Sea",
  "Lunar",
  "Hookbill",
  "Naval Piranha",
] as const;

export const VS_DIFFICULTIES = ["Easy", "Normal", "Hard", "Very Hard"] as const;

/** Characters that can be freed, in the order used by the password bit mask. */
export const VS_FREEABLE_CHARACTERS = [
  "Lakitu",
  "Bumpty",
  "Poochy",
  "Wiggler",
  "Froggy",
  "Blargg",
  "Lunge Fish",
  "Raphael",
] as const;

/** Playable characters. Index 0 is Yoshi, 1-8 match VS_FREEABLE_CHARACTERS. */
export const VS_CHARACTERS = ["Yoshi", ...VS_FREEABLE_CHARACTERS] as const;

export interface VsInput {
  /** Continues used, 0-127. */
  continues: number;
  /** Index into VS_STAGES, 0-9. */
  stage: number;
  /** Index into VS_DIFFICULTIES, 0-3. */
  difficulty: number;
  /** Best ending achieved. */
  bestEnding: boolean;
  /** Index into VS_CHARACTERS, 0-8. */
  useCharacter: number;
  /** Eight flags, aligned with VS_FREEABLE_CHARACTERS. */
  freedCharacters: readonly boolean[];
}

export const VS_LIMITS = {
  continues: [0, 127],
  stage: [0, VS_STAGES.length - 1],
  difficulty: [0, VS_DIFFICULTIES.length - 1],
  useCharacter: [0, VS_CHARACTERS.length - 1],
} as const;

/**
 * The "Stage Sync" preset of the original tool: every character up to the
 * currently selected stage has been freed.
 */
export function freedCharactersForStage(stage: number): boolean[] {
  const n = Math.min(Math.max(stage, 0), VS_FREEABLE_CHARACTERS.length);
  return VS_FREEABLE_CHARACTERS.map((_, i) => i < n);
}

/** Encodes Vs. mode into the raw 40 bit payload. */
export function encodeVsPayload(input: VsInput): [number, number, number] {
  const continues = requireInteger("continues", input.continues, 0, 127);
  const stage = requireInteger("stage", input.stage, 0, VS_STAGES.length - 1);
  const difficulty = requireInteger("difficulty", input.difficulty, 0, 3);
  const useCharacter = requireInteger("useCharacter", input.useCharacter, 0, 8);
  const good = input.bestEnding ? 1 : 0;

  if (input.freedCharacters.length !== VS_FREEABLE_CHARACTERS.length) {
    throw new PasswordInputError(
      `freedCharacters must contain exactly ${VS_FREEABLE_CHARACTERS.length} entries`,
    );
  }

  // The original maps the "Use" dropdown index onto a 2 bit character id plus
  // a group flag: 0 (Yoshi) -> id 4, 1-4 -> id 0-3 group 0, 5-8 -> id 0-3 group 1.
  let charId: number;
  let group: number;
  if (useCharacter === 0) {
    charId = 4;
    group = 0;
  } else if (useCharacter <= 4) {
    charId = useCharacter - 1;
    group = 0;
  } else {
    charId = (useCharacter - 1) & 0x3;
    group = 1;
  }

  const w0 = u16(
    (continues & 0x7f) |
      ((stage & 0xf) << 7) |
      ((difficulty & 0x3) << 11) |
      (good << 13) |
      (group << 14) |
      ((charId & 0x1) << 15),
  );

  let freedMask = 0;
  let freedCount = 0;
  input.freedCharacters.forEach((freed, i) => {
    if (freed) {
      freedMask |= 1 << i;
      freedCount += 1;
    }
  });

  const sum =
    freedCount +
    (continues & 0x7f) +
    (stage & 0xf) +
    (difficulty & 0x3) +
    good +
    (charId & 0xf) +
    group;
  const check = (sum ^ 0x2db) & 0x3ff;

  const w1 = u16(((charId & 0xe) >> 1) | (freedMask << 3) | ((check & 0x3) << 14));
  const w2 = (check & 0x3fc) >> 2;
  return [w0, w1, w2];
}

export function generateVsPassword(input: VsInput, charSet = 0): string {
  return encodePassword(...encodeVsPayload(input), "tetris-attack", charSet);
}

/* ------------------------------------------------------------------ *
 * Stage Clear mode
 * ------------------------------------------------------------------ */

export type StageClearKind = "custom" | "special" | "final";

export interface StageClearInput {
  kind: StageClearKind;
  /** Stage group, 1-6. Only used when kind is "custom". */
  stageHigh: number;
  /** Stage within the group, 1-5. Only used when kind is "custom". */
  stageLow: number;
  /** Score, 0-99999. */
  score: number;
  /**
   * "Special stage cleared". The original tool only enables this for the final
   * stage, where it feeds a flag that never changes the resulting password.
   */
  specialStageCleared?: boolean;
}

export const STAGE_CLEAR_LIMITS = {
  stageHigh: [1, 6],
  stageLow: [1, 5],
  score: [0, 99999],
} as const;

/** Encodes Stage Clear mode into the raw 40 bit payload. */
export function encodeStageClearPayload(
  game: Game,
  input: StageClearInput,
): [number, number, number] {
  const score = requireInteger("score", input.score, 0, 99999);

  let stageHigh: number;
  let stageLow: number;
  let stageHighMinusOne: number;
  let special: number;
  let extra: number;

  if (input.kind === "custom") {
    stageHigh = requireInteger("stageHigh", input.stageHigh, 1, 6);
    stageLow = requireInteger("stageLow", input.stageLow, 1, 5);
    stageHighMinusOne = stageHigh - 1;
    special = input.specialStageCleared ? 1 : 0;
    extra = 0;
  } else if (input.kind === "special") {
    // Selecting "Special stage" forces the stage fields to 4-1.
    stageHigh = 4;
    stageLow = 1;
    stageHighMinusOne = 3;
    special = game === "tetris-attack" ? 0 : 1;
    extra = game === "tetris-attack" ? 0 : 1;
  } else {
    // Selecting "Final stage" forces the stage fields to 6-1.
    stageHigh = 6;
    stageLow = 1;
    stageHighMinusOne = 6;
    special = 1;
    extra = game === "tetris-attack" ? 0 : (input.specialStageCleared ? 1 : 0) + 1;
  }

  if (special === 0 && extra === 1) special = 1;

  const w0 = u16(score);
  const check = u16(
    special + (score & 0xff) + (stageLow & 0x7) + (stageHigh & 0xf) + (stageHighMinusOne & 0xf),
  );
  const w1 = u16(
    ((score >> 16) & 0x1) |
      ((stageLow & 0x7) << 1) |
      ((stageHigh & 0xf) << 4) |
      ((stageHighMinusOne & 0xf) << 8) |
      (special << 12) |
      ((check & 0x7) << 13),
  );
  const w2 = (check >> 3) & 0xff;
  return [w0, w1, w2];
}

export function generateStageClearPassword(
  game: Game,
  input: StageClearInput,
  charSet = 0,
): string {
  return encodePassword(...encodeStageClearPayload(game, input), game, charSet);
}
