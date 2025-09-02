"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

// Panel types for Panel de Pon
type PanelType = 'empty' | 'red' | 'green' | 'blue' | 'yellow' | 'purple' | 'pink';

const PANEL_COLORS: Record<PanelType, string> = {
  empty: 'bg-gray-200',
  red: 'bg-red-500',
  green: 'bg-green-500', 
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500'
};

const PANEL_NAMES: Record<PanelType, string> = {
  empty: '空',
  red: '赤',
  green: '緑',
  blue: '青', 
  yellow: '黄',
  purple: '紫',
  pink: 'ピンク'
};

// Grid dimensions
const GRID_WIDTH = 6;
const GRID_HEIGHT = 12;

export default function PuzzleEditor() {
  // Initialize grid with empty panels
  const [grid, setGrid] = useState<PanelType[][]>(() => 
    Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill('empty'))
  );
  
  const [selectedPanelType, setSelectedPanelType] = useState<PanelType>('red');
  const [solution, setSolution] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);

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
  }, []);

  // Basic gravity simulation - panels fall down
  const applyGravity = useCallback(() => {
    setGrid(prevGrid => {
      const newGrid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill('empty'));
      
      // For each column, collect non-empty panels and stack them at bottom
      for (let col = 0; col < GRID_WIDTH; col++) {
        const panels: PanelType[] = [];
        for (let row = 0; row < GRID_HEIGHT; row++) {
          if (prevGrid[row][col] !== 'empty') {
            panels.push(prevGrid[row][col]);
          }
        }
        
        // Place panels from bottom up
        for (let i = 0; i < panels.length; i++) {
          newGrid[GRID_HEIGHT - 1 - i][col] = panels[panels.length - 1 - i];
        }
      }
      
      return newGrid;
    });
  }, []);

  // Simple puzzle solver - finds groups of 3+ matching adjacent panels
  const solvePuzzle = useCallback(() => {
    setIsCalculating(true);
    
    // This is a simplified solver that identifies matching groups
    setTimeout(() => {
      const matches: string[] = [];
      
      // Check horizontal matches
      for (let row = 0; row < GRID_HEIGHT; row++) {
        let count = 1;
        let currentType = grid[row][0];
        
        for (let col = 1; col < GRID_WIDTH; col++) {
          if (grid[row][col] === currentType && currentType !== 'empty') {
            count++;
          } else {
            if (count >= 3 && currentType !== 'empty') {
              matches.push(`横の${PANEL_NAMES[currentType]}パネル: 行${row + 1}, 列${col - count + 1}-${col} (${count}個)`);
            }
            count = 1;
            currentType = grid[row][col];
          }
        }
        
        // Check last group
        if (count >= 3 && currentType !== 'empty') {
          matches.push(`横の${PANEL_NAMES[currentType]}パネル: 行${row + 1}, 列${GRID_WIDTH - count + 1}-${GRID_WIDTH} (${count}個)`);
        }
      }
      
      // Check vertical matches
      for (let col = 0; col < GRID_WIDTH; col++) {
        let count = 1;
        let currentType = grid[0][col];
        
        for (let row = 1; row < GRID_HEIGHT; row++) {
          if (grid[row][col] === currentType && currentType !== 'empty') {
            count++;
          } else {
            if (count >= 3 && currentType !== 'empty') {
              matches.push(`縦の${PANEL_NAMES[currentType]}パネル: 列${col + 1}, 行${row - count + 1}-${row} (${count}個)`);
            }
            count = 1;
            currentType = grid[row][col];
          }
        }
        
        // Check last group
        if (count >= 3 && currentType !== 'empty') {
          matches.push(`縦の${PANEL_NAMES[currentType]}パネル: 列${col + 1}, 行${GRID_HEIGHT - count + 1}-${GRID_HEIGHT} (${count}個)`);
        }
      }
      
      if (matches.length > 0) {
        setSolution(`見つかったマッチ:\n${matches.join('\n')}\n\n${matches.length}個のマッチング グループが見つかりました。`);
      } else {
        setSolution('マッチングするパネルが見つかりませんでした。3個以上の同じ色のパネルを隣接させてください。');
      }
      
      setIsCalculating(false);
    }, 500);
  }, [grid]);

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
            </div>
            
            {/* Right side - Solution */}
            <div>
              <h2 className="text-xl font-semibold mb-4">パズル解析</h2>
              
              <button
                onClick={solvePuzzle}
                disabled={isCalculating}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400 mb-4"
              >
                {isCalculating ? '解析中...' : 'パズルを解析'}
              </button>
              
              {solution && (
                <div className="bg-gray-50 border border-gray-300 rounded-md p-4">
                  <h3 className="font-semibold mb-2">解析結果:</h3>
                  <pre className="text-sm whitespace-pre-wrap text-gray-700">
                    {solution}
                  </pre>
                </div>
              )}
              
              <div className="mt-6 text-sm text-gray-600">
                <h3 className="font-semibold mb-2">使い方:</h3>
                <ul className="space-y-1">
                  <li>• 上のパネルタイプを選択してグリッドをクリックしてパネルを配置</li>
                  <li>• 「重力を適用」でパネルを下に落とす</li>
                  <li>• 「パズルを解析」で3個以上の隣接する同色パネルを検出</li>
                  <li>• パネルでポンのルールに従って連鎖を計画できます</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer className="text-center text-gray-400 mt-8">
          &copy; 2025 <a href="https://github.com/cyrus07424" target="_blank" className="hover:text-gray-600">cyrus</a>
      </footer>
    </div>
  );
}