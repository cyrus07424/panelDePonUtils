"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  GRID_WIDTH,
  GRID_HEIGHT,
  PANEL_TO_CHAR,
  CHAR_TO_PANEL,
  applyGravity as computeGravity,
  solvePuzzle as searchForSolution,
  type PanelType,
  type SolveStep,
} from "@/lib/puzzle/solver";

const PANEL_COLORS: Record<PanelType, string> = {
  empty: 'bg-gray-200',
  red: 'bg-red-500',
  green: 'bg-green-500', 
  blue: 'bg-cyan-400',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
  pink: 'bg-blue-500'
};

const PANEL_NAMES: Record<PanelType, string> = {
  empty: '空',
  red: '赤',
  green: '緑',
  blue: '水色', 
  yellow: '黄',
  purple: '紫',
  pink: '青'
};

export default function PuzzleEditor() {
  // Initialize grid with empty panels
  const [grid, setGrid] = useState<PanelType[][]>(() => 
    Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill('empty'))
  );
  
  const [selectedPanelType, setSelectedPanelType] = useState<PanelType>('red');
  const [solution, setSolution] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [moveCount, setMoveCount] = useState<number>(3);
  const [importExportText, setImportExportText] = useState<string>('');
  const [copyMessage, setCopyMessage] = useState<string>('');

  // Solution search results, kept separate from the editable grid so the
  // user can step through the found moves without losing their puzzle.
  const [solutionSteps, setSolutionSteps] = useState<SolveStep[] | null>(null);
  const [solvedBaseGrid, setSolvedBaseGrid] = useState<PanelType[][] | null>(null);
  const [previewStepIndex, setPreviewStepIndex] = useState<number>(0);

  // Handle cell click to place panel
  const handleCellClick = useCallback((row: number, col: number) => {
    setGrid(prevGrid => {
      const newGrid = [...prevGrid];
      newGrid[row] = [...newGrid[row]];
      newGrid[row][col] = selectedPanelType;
      return newGrid;
    });
  }, [selectedPanelType]);

  // Clear the entire grid
  const clearGrid = useCallback(() => {
    setGrid(Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill('empty')));
    setSolution('');
    setSolutionSteps(null);
    setSolvedBaseGrid(null);
    setPreviewStepIndex(0);
  }, []);

  // Auto-update importExportText whenever grid or moveCount changes
  useEffect(() => {
    const rows = grid.map(row => row.map(p => PANEL_TO_CHAR[p]).join(''));
    setImportExportText([moveCount.toString(), ...rows].join('\n'));
  }, [grid, moveCount]);

  // Basic gravity simulation - panels fall down
  const applyGravity = useCallback(() => {
    setGrid(prevGrid => computeGravity(prevGrid));
  }, []);

  // Searches for a sequence of swaps (within moveCount moves) that clears
  // every panel on the board, simulating swap / gravity / match / chain
  // resolution exactly as the actual game does.
  const solvePuzzle = useCallback(() => {
    setIsCalculating(true);
    setSolutionSteps(null);
    setSolvedBaseGrid(null);
    setPreviewStepIndex(0);

    // Defer so the "calculating" UI can render before the (potentially
    // heavy) search runs on the main thread.
    setTimeout(() => {
      const outcome = searchForSolution(grid, moveCount);

      if (outcome.status === 'solved') {
        if (outcome.steps.length === 0) {
          setSolution('既に全てのパネルが消えています。');
        } else {
          const lines = outcome.steps.map((step, i) => {
            const chainText = step.chains > 0 ? ` (${step.chains}連鎖)` : '';
            return `${i + 1}手目: 行${step.move.row + 1}の列${step.move.col + 1}と列${step.move.col + 2}を交換${chainText}`;
          });
          setSolution(`解法が見つかりました！(${outcome.steps.length}手)\n${lines.join('\n')}`);
        }
        setSolvedBaseGrid(grid.map(row => [...row]));
        setSolutionSteps(outcome.steps);
        setPreviewStepIndex(0);
      } else if (outcome.status === 'no_solution') {
        setSolution(`${moveCount}手以内では、全てのパネルを消す操作が見つかりませんでした。`);
      } else if (outcome.status === 'limit_exceeded') {
        setSolution('探索が複雑すぎるため、制限時間内に解法を見つけられませんでした。手数やパネルの数を減らして再度お試しください。');
      } else {
        setSolution('手数の設定が不正です。0以上の整数を指定してください。');
      }

      setIsCalculating(false);
    }, 50);
  }, [grid, moveCount]);

  // Steps through the found solution without modifying the editable grid.
  const goToStep = useCallback((index: number) => {
    setPreviewStepIndex(prev => {
      if (!solutionSteps) return prev;
      return Math.max(0, Math.min(index, solutionSteps.length));
    });
  }, [solutionSteps]);


  // Import grid from textarea text
  const importFromText = useCallback(() => {
    const lines = importExportText.trim().split('\n');
    if (lines.length !== GRID_HEIGHT + 1) {
      alert(`行数が不正です (${GRID_HEIGHT + 1}行必要です)`);
      return;
    }

    const moves = parseInt(lines[0], 10);
    if (isNaN(moves) || moves < 0 || moves > 100) {
      alert('手数が不正です');
      return;
    }

    const newGrid: PanelType[][] = [];
    for (let rowIndex = 0; rowIndex < GRID_HEIGHT; rowIndex++) {
      const line = lines[rowIndex + 1].trim();
      if (line.length !== GRID_WIDTH) {
        alert(`列数が不正です (${GRID_WIDTH}文字必要です)`);
        return;
      }
      const row: PanelType[] = [];
      for (let col = 0; col < GRID_WIDTH; col++) {
        const c = line[col];
        if (!(c in CHAR_TO_PANEL)) {
          alert(`不正な文字: '${c}'`);
          return;
        }
        row.push(CHAR_TO_PANEL[c]);
      }
      newGrid.push(row);
    }

    setMoveCount(moves);
    setGrid(newGrid);
  }, [importExportText]);

  // Copy current textarea content to clipboard
  const copyToClipboard = useCallback(() => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(importExportText).then(() => {
        setCopyMessage('クリップボードにコピーしました！');
        setTimeout(() => setCopyMessage(''), 3000);
      }).catch(() => {
        setCopyMessage('コピーに失敗しました');
        setTimeout(() => setCopyMessage(''), 3000);
      });
    } else {
      setCopyMessage('クリップボードへのアクセスが許可されていません');
      setTimeout(() => setCopyMessage(''), 3000);
    }
  }, [importExportText]);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">
              パネルでポン パズルエディタ
            </h1>
            <Link 
              href="/"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              パスワードジェネレーターに戻る
            </Link>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left side - Grid editor */}
            <div>
              <h2 className="text-xl font-semibold mb-4">パズルグリッド (6×12)</h2>
              
              {/* Panel type selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  パネルタイプを選択:
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(PANEL_COLORS) as PanelType[]).map(panelType => (
                    <button
                      key={panelType}
                      onClick={() => setSelectedPanelType(panelType)}
                      className={`w-12 h-12 rounded-md border-2 transition-all ${
                        selectedPanelType === panelType 
                          ? 'border-gray-800 scale-110' 
                          : 'border-gray-300 hover:border-gray-500'
                      } ${PANEL_COLORS[panelType]}`}
                      title={PANEL_NAMES[panelType]}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  選択中: {PANEL_NAMES[selectedPanelType]}
                </p>
              </div>
              
              {/* Move count selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  手数を設定:
                </label>
                <div className="flex gap-2 items-center flex-wrap">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setMoveCount(n)}
                      className={`w-10 h-10 rounded-md border-2 font-bold transition-all ${
                        moveCount === n
                          ? 'border-gray-800 bg-blue-500 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={moveCount}
                    onChange={e => {
                      const n = parseInt(e.target.value, 10);
                      if (!isNaN(n) && n >= 0 && n <= 100) setMoveCount(n);
                    }}
                    className="w-20 h-10 border-2 border-gray-300 rounded-md px-2 text-center"
                    title="任意の手数を入力"
                  />
                </div>
                <p className="text-sm text-gray-600 mt-1">選択中: {moveCount}手</p>
              </div>
              
              {/* Grid */}
              <div className="border-2 border-gray-800 inline-block bg-gray-800 p-1">
                <div className="grid grid-cols-6 gap-1">
                  {grid.map((row, rowIndex) =>
                    row.map((panel, colIndex) => (
                      <button
                        key={`${rowIndex}-${colIndex}`}
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                        className={`w-8 h-8 border border-gray-400 transition-transform hover:scale-110 ${PANEL_COLORS[panel]}`}
                        title={`行${rowIndex + 1}, 列${colIndex + 1}: ${PANEL_NAMES[panel]}`}
                      />
                    ))
                  )}
                </div>
              </div>
              
              {/* Controls */}
              <div className="mt-4 space-x-4">
                <button
                  onClick={clearGrid}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  グリッドをクリア
                </button>
                <button
                  onClick={applyGravity}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                >
                  重力を適用
                </button>
              </div>

              {/* Text import/export */}
              <div className="mt-6">
                <h3 className="text-base font-semibold mb-2">テキストインポート / エクスポート</h3>
                <p className="text-xs text-gray-500 mb-1">
                  形式: 1行目=手数、2行目以降=各行 (6文字、<code>.=空 a=赤 b=黄 c=緑 d=水色 e=青 f=紫</code>)
                </p>
                <textarea
                  value={importExportText}
                  onChange={e => setImportExportText(e.target.value)}
                  rows={14}
                  spellCheck={false}
                  className="w-full text-xs font-mono border border-gray-300 rounded-md p-2 bg-gray-50 leading-normal"
                />
                <div className="flex gap-2 mt-2 items-center flex-wrap">
                  <button
                    onClick={importFromText}
                    className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors"
                  >
                    インポート
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
                  >
                    クリップボードにコピー
                  </button>
                  {copyMessage && (
                    <span className="text-sm text-green-600">{copyMessage}</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Right side - Solution */}
            <div>
              <h2 className="text-xl font-semibold mb-4">パズル解析</h2>
              
              <button
                onClick={solvePuzzle}
                disabled={isCalculating}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400 mb-4"
              >
                {isCalculating ? '解答を探索中...' : `${moveCount}手以内の解答を探索`}
              </button>
              
              {solution && (
                <div className="bg-gray-50 border border-gray-300 rounded-md p-4">
                  <h3 className="font-semibold mb-2">解析結果:</h3>
                  <pre className="text-sm whitespace-pre-wrap text-gray-700">
                    {solution}
                  </pre>
                </div>
              )}

              {solutionSteps && solvedBaseGrid && (
                <div className="mt-4 bg-gray-50 border border-gray-300 rounded-md p-4">
                  <h3 className="font-semibold mb-2">解答プレビュー:</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {previewStepIndex === 0
                      ? '初期状態'
                      : `${previewStepIndex}手目まで適用済み`}
                    {' '}({previewStepIndex} / {solutionSteps.length})
                  </p>
                  <div className="border-2 border-gray-800 inline-block bg-gray-800 p-1">
                    <div className="grid grid-cols-6 gap-1">
                      {(previewStepIndex === 0
                        ? solvedBaseGrid
                        : solutionSteps[previewStepIndex - 1].grid
                      ).map((row, rowIndex) =>
                        row.map((panel, colIndex) => (
                          <div
                            key={`${rowIndex}-${colIndex}`}
                            className={`w-6 h-6 border border-gray-400 ${PANEL_COLORS[panel]}`}
                            title={`行${rowIndex + 1}, 列${colIndex + 1}: ${PANEL_NAMES[panel]}`}
                          />
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 items-center flex-wrap">
                    <button
                      onClick={() => goToStep(0)}
                      disabled={previewStepIndex === 0}
                      className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors disabled:bg-gray-300"
                    >
                      最初へ
                    </button>
                    <button
                      onClick={() => goToStep(previewStepIndex - 1)}
                      disabled={previewStepIndex === 0}
                      className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-300"
                    >
                      前の手
                    </button>
                    <button
                      onClick={() => goToStep(previewStepIndex + 1)}
                      disabled={previewStepIndex >= solutionSteps.length}
                      className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-300"
                    >
                      次の手
                    </button>
                    {previewStepIndex > 0 && previewStepIndex <= solutionSteps.length && (
                      <span className="text-sm text-gray-600">
                        {solutionSteps[previewStepIndex - 1].chains > 0
                          ? `${solutionSteps[previewStepIndex - 1].chains}連鎖発生`
                          : '連鎖なし'}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <div className="mt-6 text-sm text-gray-600">
                <h3 className="font-semibold mb-2">使い方:</h3>
                <ul className="space-y-1">
                  <li>• 上のパネルタイプを選択してグリッドをクリックしてパネルを配置</li>
                  <li>• 「手数を設定」でパズルの手数を選択 (ボタンまたは数値入力)</li>
                  <li>• 「重力を適用」でパネルを下に落とす</li>
                  <li>• 「手数以内の解答を探索」で、パネルの交換・消去・落下・連鎖をシミュレーションし、設定した手数以内で全てのパネルを消せる操作を探索します</li>
                  <li>• 見つかった手順は「解答プレビュー」で一手ずつ確認できます</li>
                  <li>• グリッドを編集するとテキストエリアが自動更新されます</li>
                  <li>• テキストエリアを編集して「インポート」をクリックするとグリッドに反映されます</li>
                  <li>• テキスト形式は <a href="https://tl.foxcalculators.com/miscellaneous/20378.html" target="_blank" className="text-blue-500 hover:underline">Panel de Pon Puzzle Solver</a> と互換性があります</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer className="text-center text-gray-400 mt-8">
          &copy; 2026 <a href="https://github.com/cyrus07424" target="_blank" className="hover:text-gray-600">cyrus</a>
      </footer>
    </div>
  );
}