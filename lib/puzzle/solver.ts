// Core simulation and search logic for Panel de Pon puzzles.
//
// A puzzle is a grid of panels. The player repeatedly swaps two horizontally
// adjacent panels; after each swap, gravity pulls panels down and any group
// of 3+ same-colored panels in a row/column is cleared (possibly chaining).
// A puzzle is solved when the grid becomes completely empty within a given
// number of swaps ("moves").

export type PanelType =
  | "empty"
  | "red"
  | "green"
  | "blue"
  | "yellow"
  | "purple"
  | "pink";

export type Grid = PanelType[][];

export const GRID_WIDTH = 6;
export const GRID_HEIGHT = 12;

// Text import/export character mapping (compatible with
// https://tl.foxcalculators.com/miscellaneous/20378.html)
export const PANEL_TO_CHAR: Record<PanelType, string> = {
  empty: ".",
  red: "a",
  yellow: "b",
  green: "c",
  blue: "d",
  pink: "e",
  purple: "f",
};

export const CHAR_TO_PANEL: Record<string, PanelType> = {
  ".": "empty",
  a: "red",
  b: "yellow",
  c: "green",
  d: "blue",
  e: "pink",
  f: "purple",
};

export function createEmptyGrid(
  width: number = GRID_WIDTH,
  height: number = GRID_HEIGHT,
): Grid {
  return Array.from({ length: height }, () =>
    Array<PanelType>(width).fill("empty"),
  );
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

export function isGridEmpty(grid: Grid): boolean {
  return grid.every((row) => row.every((cell) => cell === "empty"));
}

/** Panels fall to the bottom of each column, keeping their relative order. */
export function applyGravity(grid: Grid): Grid {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const newGrid = createEmptyGrid(width, height);

  for (let col = 0; col < width; col++) {
    const panels: PanelType[] = [];
    for (let row = 0; row < height; row++) {
      if (grid[row][col] !== "empty") {
        panels.push(grid[row][col]);
      }
    }
    for (let i = 0; i < panels.length; i++) {
      newGrid[height - 1 - i][col] = panels[panels.length - 1 - i];
    }
  }

  return newGrid;
}

/** Returns a boolean mask of cells that are part of a 3+ same-color run. */
export function findMatchedCells(grid: Grid): boolean[][] {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const matched: boolean[][] = Array.from({ length: height }, () =>
    Array<boolean>(width).fill(false),
  );

  // Horizontal runs
  for (let row = 0; row < height; row++) {
    let runStart = 0;
    for (let col = 1; col <= width; col++) {
      const prevType = grid[row][col - 1];
      const curType = col < width ? grid[row][col] : null;
      if (curType !== prevType || prevType === "empty") {
        const runLength = col - runStart;
        if (runLength >= 3 && prevType !== "empty") {
          for (let c = runStart; c < col; c++) matched[row][c] = true;
        }
        runStart = col;
      }
    }
  }

  // Vertical runs
  for (let col = 0; col < width; col++) {
    let runStart = 0;
    for (let row = 1; row <= height; row++) {
      const prevType = grid[row - 1][col];
      const curType = row < height ? grid[row][col] : null;
      if (curType !== prevType || prevType === "empty") {
        const runLength = row - runStart;
        if (runLength >= 3 && prevType !== "empty") {
          for (let r = runStart; r < row; r++) matched[r][col] = true;
        }
        runStart = row;
      }
    }
  }

  return matched;
}

export function hasAnyMatch(matched: boolean[][]): boolean {
  return matched.some((row) => row.some(Boolean));
}

export function clearMatched(grid: Grid, matched: boolean[][]): Grid {
  return grid.map((row, r) =>
    row.map((cell, c) => (matched[r][c] ? "empty" : cell)),
  );
}

/**
 * Repeatedly applies gravity and clears matches until the grid is stable.
 * Returns the resolved grid and the number of chain steps (clears) that
 * occurred.
 */
export function resolveGrid(grid: Grid): { grid: Grid; chains: number } {
  let current = applyGravity(grid);
  let chains = 0;

  while (true) {
    const matched = findMatchedCells(current);
    if (!hasAnyMatch(matched)) break;
    current = clearMatched(current, matched);
    current = applyGravity(current);
    chains++;
  }

  return { grid: current, chains };
}

/** Swaps two horizontally adjacent panels at (row, col) and (row, col + 1). */
export function swapPanels(grid: Grid, row: number, col: number): Grid {
  const newGrid = cloneGrid(grid);
  const tmp = newGrid[row][col];
  newGrid[row][col] = newGrid[row][col + 1];
  newGrid[row][col + 1] = tmp;
  return newGrid;
}

export function gridToKey(grid: Grid): string {
  return grid.map((row) => row.join(",")).join("|");
}

/** A single move: swap the panels at (row, col) and (row, col + 1). */
export interface SolveMove {
  row: number;
  col: number;
}

export interface SolveStep {
  move: SolveMove;
  grid: Grid;
  chains: number;
}

export interface SolveOptions {
  /** Safety cap on the number of states explored before giving up. */
  maxNodes?: number;
  /** Safety cap on wall-clock search time, in milliseconds. */
  maxTimeMs?: number;
}

export type SolveOutcome =
  | { status: "solved"; steps: SolveStep[] }
  | { status: "no_solution" }
  | { status: "limit_exceeded" }
  | { status: "invalid_move_count" };

/**
 * Searches for a sequence of at most `maxMoves` swaps that clears the whole
 * board (all panels removed), simulating panel de pon's swap / gravity /
 * match / chain rules. Uses breadth-first search so that, when a solution
 * exists, the first one found uses the minimum possible number of moves.
 */
export function solvePuzzle(
  initialGrid: Grid,
  maxMoves: number,
  options: SolveOptions = {},
): SolveOutcome {
  if (!Number.isInteger(maxMoves) || maxMoves < 0) {
    return { status: "invalid_move_count" };
  }

  const maxNodes = options.maxNodes ?? 200_000;
  const maxTimeMs = options.maxTimeMs ?? 8_000;
  const startTime = Date.now();

  const height = initialGrid.length;
  const width = initialGrid[0]?.length ?? 0;

  const startGrid = resolveGrid(initialGrid).grid;
  if (isGridEmpty(startGrid)) {
    return { status: "solved", steps: [] };
  }
  if (maxMoves === 0) {
    return { status: "no_solution" };
  }

  interface Node {
    grid: Grid;
    steps: SolveStep[];
  }

  let frontier: Node[] = [{ grid: startGrid, steps: [] }];
  const visited = new Set<string>();
  visited.add(gridToKey(startGrid));
  let nodesExplored = 0;

  for (let depth = 0; depth < maxMoves; depth++) {
    const nextFrontier: Node[] = [];

    for (const node of frontier) {
      for (let row = 0; row < height; row++) {
        for (let col = 0; col < width - 1; col++) {
          // Swapping two identical panels never changes the board, so skip it.
          if (node.grid[row][col] === node.grid[row][col + 1]) continue;

          if (
            ++nodesExplored > maxNodes ||
            Date.now() - startTime > maxTimeMs
          ) {
            return { status: "limit_exceeded" };
          }

          const swapped = swapPanels(node.grid, row, col);
          const { grid: resolved, chains } = resolveGrid(swapped);
          const key = gridToKey(resolved);
          if (visited.has(key)) continue;
          visited.add(key);

          const steps = [
            ...node.steps,
            { move: { row, col }, grid: resolved, chains },
          ];

          if (isGridEmpty(resolved)) {
            return { status: "solved", steps };
          }

          nextFrontier.push({ grid: resolved, steps });
        }
      }
    }

    frontier = nextFrontier;
    if (frontier.length === 0) break;
  }

  return { status: "no_solution" };
}
