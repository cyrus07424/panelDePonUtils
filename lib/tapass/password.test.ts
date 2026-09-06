import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  PasswordInputError,
  encodePassword,
  freedCharactersForStage,
  generatePuzzlePassword,
  generateStageClearPassword,
  generateVsPassword,
  splitPayload,
  type Game,
  type StageClearKind,
} from "./password.ts";

interface PuzzleVector {
  game: Game;
  stageHigh: number;
  stageLow: number;
  hours: number;
  minutes: number;
  seconds: number;
  extraPuzzleSet: boolean;
  password: string;
}

interface StageClearVector {
  game: Game;
  kind: StageClearKind;
  stageHigh: number;
  stageLow: number;
  score: number;
  specialStageCleared: boolean;
  password: string;
}

interface VsVector {
  continues: number;
  stage: number;
  difficulty: number;
  bestEnding: boolean;
  useCharacter: number;
  freedCharacters: boolean[];
  password: string;
}

const vectors = JSON.parse(
  readFileSync(fileURLToPath(new URL("./vectors.json", import.meta.url)), "utf8"),
) as { puzzle: PuzzleVector[]; stageClear: StageClearVector[]; vs: VsVector[] };

describe("splitPayload", () => {
  it("splits a 40 bit value into eight 5 bit groups, most significant first", () => {
    assert.deepEqual(splitPayload(0x0000, 0x0000, 0x00), [0, 0, 0, 0, 0, 0, 0, 0]);
    assert.deepEqual(splitPayload(0xffff, 0xffff, 0xff), [31, 31, 31, 31, 31, 31, 31, 31]);
    assert.deepEqual(splitPayload(0x0000, 0xff00, 0xff), [31, 31, 31, 16, 0, 0, 0, 0]);
    assert.deepEqual(splitPayload(0x0001, 0x0000, 0x00), [0, 0, 0, 0, 0, 0, 0, 1]);
  });
});

describe("encodePassword", () => {
  it("always produces eight characters", () => {
    for (const game of ["tetris-attack", "panel-de-pon"] as const) {
      assert.equal(encodePassword(0, 0, 0, game).length, 8);
      assert.equal(encodePassword(0xffff, 0xffff, 0xff, game).length, 8);
    }
  });

  it("ignores the alphabet rotation for Panel de Pon", () => {
    const a = encodePassword(0x1234, 0x5678, 0x9a, "panel-de-pon", 0);
    const b = encodePassword(0x1234, 0x5678, 0x9a, "panel-de-pon", 5);
    assert.equal(a, b);
  });
});

describe("Puzzle mode", () => {
  it("matches the reference password for stage 1-1 at 0:00:00 (Tetris Attack)", () => {
    assert.equal(
      generatePuzzlePassword("tetris-attack", {
        stageHigh: 1,
        stageLow: 1,
        hours: 0,
        minutes: 0,
        seconds: 0,
        extraPuzzleSet: false,
      }),
      "FP5D29C!",
    );
  });

  for (const v of vectors.puzzle) {
    it(`${v.game} ${v.stageHigh}-${v.stageLow} ${v.hours}:${v.minutes}:${v.seconds} extra=${v.extraPuzzleSet} -> ${v.password}`, () => {
      assert.equal(generatePuzzlePassword(v.game, v), v.password);
    });
  }

  it("rejects out of range inputs", () => {
    const base = {
      stageHigh: 1,
      stageLow: 1,
      hours: 0,
      minutes: 0,
      seconds: 0,
      extraPuzzleSet: false,
    };
    assert.throws(
      () => generatePuzzlePassword("tetris-attack", { ...base, stageHigh: 7 }),
      PasswordInputError,
    );
    assert.throws(
      () => generatePuzzlePassword("tetris-attack", { ...base, stageLow: 0 }),
      PasswordInputError,
    );
    assert.throws(
      () => generatePuzzlePassword("tetris-attack", { ...base, hours: 10 }),
      PasswordInputError,
    );
    assert.throws(
      () => generatePuzzlePassword("tetris-attack", { ...base, minutes: 60 }),
      PasswordInputError,
    );
    assert.throws(
      () => generatePuzzlePassword("tetris-attack", { ...base, seconds: -1 }),
      PasswordInputError,
    );
    assert.throws(
      () => generatePuzzlePassword("tetris-attack", { ...base, seconds: 1.5 }),
      PasswordInputError,
    );
  });
});

describe("Stage Clear mode", () => {
  for (const v of vectors.stageClear) {
    it(`${v.game} ${v.kind} ${v.stageHigh}-${v.stageLow} score=${v.score} -> ${v.password}`, () => {
      assert.equal(generateStageClearPassword(v.game, v), v.password);
    });
  }

  it("ignores the custom stage fields for the special and final stages", () => {
    const a = generateStageClearPassword("tetris-attack", {
      kind: "special",
      stageHigh: 1,
      stageLow: 1,
      score: 4242,
    });
    const b = generateStageClearPassword("tetris-attack", {
      kind: "special",
      stageHigh: 6,
      stageLow: 5,
      score: 4242,
    });
    assert.equal(a, b);
  });

  it("rejects out of range inputs", () => {
    assert.throws(
      () =>
        generateStageClearPassword("tetris-attack", {
          kind: "custom",
          stageHigh: 1,
          stageLow: 1,
          score: 100000,
        }),
      PasswordInputError,
    );
    assert.throws(
      () =>
        generateStageClearPassword("tetris-attack", {
          kind: "custom",
          stageHigh: 1,
          stageLow: 6,
          score: 0,
        }),
      PasswordInputError,
    );
  });
});

describe("Vs. mode", () => {
  for (const v of vectors.vs) {
    it(`continues=${v.continues} stage=${v.stage} diff=${v.difficulty} use=${v.useCharacter} -> ${v.password}`, () => {
      assert.equal(generateVsPassword(v), v.password);
    });
  }

  it("derives the Stage Sync freed set", () => {
    assert.deepEqual(freedCharactersForStage(0), new Array(8).fill(false));
    assert.deepEqual(freedCharactersForStage(1), [
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    assert.deepEqual(freedCharactersForStage(8), new Array(8).fill(true));
    assert.deepEqual(freedCharactersForStage(9), new Array(8).fill(true));
  });

  it("rejects out of range inputs", () => {
    const base = {
      continues: 0,
      stage: 0,
      difficulty: 0,
      bestEnding: false,
      useCharacter: 0,
      freedCharacters: new Array(8).fill(false) as boolean[],
    };
    assert.throws(() => generateVsPassword({ ...base, continues: 128 }), PasswordInputError);
    assert.throws(() => generateVsPassword({ ...base, stage: 10 }), PasswordInputError);
    assert.throws(() => generateVsPassword({ ...base, difficulty: 4 }), PasswordInputError);
    assert.throws(() => generateVsPassword({ ...base, useCharacter: 9 }), PasswordInputError);
    assert.throws(
      () => generateVsPassword({ ...base, freedCharacters: [true] }),
      PasswordInputError,
    );
  });
});
