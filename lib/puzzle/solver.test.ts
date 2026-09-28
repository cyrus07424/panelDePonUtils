import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyGravity,
  clearMatched,
  createEmptyGrid,
  findMatchedCells,
  isGridEmpty,
  resolveGrid,
  solvePuzzle,
  swapPanels,
  CHAR_TO_PANEL,
  PANEL_TO_CHAR,
  type Grid,
  type PanelType,
} from "./solver.ts";

// Builds a grid from an array of row strings using the same character
// mapping as the puzzle editor's text import/export
// (. = empty, a = red, b = yellow, c = green, d = blue, e = pink, f = purple).
function gridFromRows(rows: string[]): Grid {
  return rows.map((row) =>
    row.split("").map((c) => CHAR_TO_PANEL[c] as PanelType),
  );
}

// Renders a row back to its single-character form for readable assertions.
function rowToChars(row: PanelType[]): string {
  return row.map((cell) => PANEL_TO_CHAR[cell]).join("");
}

describe("applyGravity", () => {
  it("moves panels to the bottom of each column, preserving order", () => {
    const grid = gridFromRows(["a.....", "......", "b....."]);
    const result = applyGravity(grid);
    assert.deepEqual(
      result.map(rowToChars),
      ["......", "a.....", "b....."],
    );
  });
});

describe("findMatchedCells / clearMatched", () => {
  it("detects a horizontal run of 3+", () => {
    const grid = gridFromRows(["aaab.."]);
    const matched = findMatchedCells(grid);
    assert.deepEqual(matched[0], [true, true, true, false, false, false]);
  });

  it("detects a vertical run of 3+", () => {
    const grid = gridFromRows(["a.....", "a.....", "a.....", "b....."]);
    const matched = findMatchedCells(grid);
    assert.equal(matched[0][0], true);
    assert.equal(matched[1][0], true);
    assert.equal(matched[2][0], true);
    assert.equal(matched[3][0], false);
  });

  it("ignores runs shorter than 3", () => {
    const grid = gridFromRows(["aab..."]);
    const matched = findMatchedCells(grid);
    assert.ok(matched[0].every((cell) => cell === false));
  });

  it("clearMatched empties matched cells only", () => {
    const grid = gridFromRows(["aaab.."]);
    const matched = findMatchedCells(grid);
    const cleared = clearMatched(grid, matched);
    assert.equal(rowToChars(cleared[0]), "...b..");
  });
});

describe("resolveGrid", () => {
  it("clears matches and chains after gravity", () => {
    // Column 0 has a 3-in-a-row vertical match; clearing it lets the panel
    // above fall down, which itself is already resolved (no further chain).
    const grid = gridFromRows([
      "......",
      "b.....",
      "a.....",
      "a.....",
      "a.....",
    ]);
    const { grid: resolved, chains } = resolveGrid(grid);
    assert.equal(chains, 1);
    assert.equal(
      resolved.map(rowToChars).join("|"),
      ["......", "......", "......", "......", "b....."].join("|"),
    );
  });

  it("leaves a grid with no matches unchanged aside from gravity", () => {
    const grid = gridFromRows(["a.....", "......", "b....."]);
    const { grid: resolved, chains } = resolveGrid(grid);
    assert.equal(chains, 0);
    assert.equal(rowToChars(resolved[1]), "a.....");
    assert.equal(rowToChars(resolved[2]), "b.....");
  });
});

describe("swapPanels", () => {
  it("swaps two horizontally adjacent cells", () => {
    const grid = gridFromRows(["ab...."]);
    const swapped = swapPanels(grid, 0, 0);
    assert.equal(rowToChars(swapped[0]), "ba....");
  });
});

describe("solvePuzzle", () => {
  it("reports already-solved boards with zero moves", () => {
    const grid = createEmptyGrid(6, 12);
    const outcome = solvePuzzle(grid, 3);
    assert.deepEqual(outcome, { status: "solved", steps: [] });
  });

  it("finds a one-move solution for a simple swap-to-clear puzzle", () => {
    // "a.aa.." is not pre-matched (the gap breaks the run), but swapping the
    // leading 'a' into the gap aligns all three into "aaa", clearing the
    // whole (otherwise-empty) board in a single move.
    const grid = gridFromRows(["a.aa.."]);
    const outcome = solvePuzzle(grid, 1);
    assert.equal(outcome.status, "solved");
    if (outcome.status === "solved") {
      assert.equal(outcome.steps.length, 1);
      assert.deepEqual(outcome.steps[0].move, { row: 0, col: 0 });
      assert.ok(isGridEmpty(outcome.steps[0].grid));
    }
  });

  it("returns no_solution when the move budget is too small", () => {
    const grid = gridFromRows(["a.aa.."]);
    const outcome = solvePuzzle(grid, 0);
    assert.equal(outcome.status, "no_solution");
  });

  it("does not find a solution beyond what the board allows", () => {
    // A single stray panel can never be matched, no matter how many moves
    // are allowed.
    const grid = gridFromRows(["a....."]);
    const outcome = solvePuzzle(grid, 5);
    assert.equal(outcome.status, "no_solution");
  });

  it("rejects a negative or non-integer move count", () => {
    const grid = createEmptyGrid(6, 12);
    assert.equal(solvePuzzle(grid, -1).status, "invalid_move_count");
    assert.equal(solvePuzzle(grid, 1.5).status, "invalid_move_count");
  });
});
