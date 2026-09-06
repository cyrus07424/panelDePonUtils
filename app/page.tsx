"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  PasswordInputError,
  VS_CHARACTERS,
  VS_DIFFICULTIES,
  VS_FREEABLE_CHARACTERS,
  VS_STAGES,
  freedCharactersForStage,
  generatePuzzlePassword,
  generateStageClearPassword,
  generateVsPassword,
  type Game,
  type StageClearKind,
} from "@/lib/tapass/password";

type Mode = "puzzle" | "vs" | "stageClear";

const GAME_LABEL: Record<Game, string> = {
  "panel-de-pon": "パネルでポン",
  "tetris-attack": "Tetris Attack",
};

const MODE_LABEL: Record<Mode, string> = {
  puzzle: "パズル",
  vs: "対戦",
  stageClear: "ステージクリア",
};

const STAGE_CLEAR_KIND_LABEL: Record<StageClearKind, string> = {
  custom: "ステージ指定",
  special: "スペシャルステージ",
  final: "ファイナルステージ",
};

const fieldClass =
  "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500";
const labelClass = "block text-sm font-medium text-gray-700 mb-2";

function clamp(value: string, min: number, max: number): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
}

export default function Home() {
  const [game, setGame] = useState<Game>("panel-de-pon");
  const [mode, setMode] = useState<Mode>("puzzle");

  // Puzzle
  const [stageHigh, setStageHigh] = useState(1);
  const [stageLow, setStageLow] = useState(1);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [extraPuzzleSet, setExtraPuzzleSet] = useState(false);

  // Vs.
  const [continues, setContinues] = useState(0);
  const [vsStage, setVsStage] = useState(0);
  const [difficulty, setDifficulty] = useState(0);
  const [bestEnding, setBestEnding] = useState(false);
  const [useCharacter, setUseCharacter] = useState(0);
  const [freedCharacters, setFreedCharacters] = useState<boolean[]>(() =>
    freedCharactersForStage(0),
  );

  // Stage Clear
  const [clearKind, setClearKind] = useState<StageClearKind>("custom");
  const [clearStageHigh, setClearStageHigh] = useState(1);
  const [clearStageLow, setClearStageLow] = useState(1);
  const [score, setScore] = useState(0);
  const [specialStageCleared, setSpecialStageCleared] = useState(false);

  const availableModes: Mode[] =
    game === "tetris-attack" ? ["puzzle", "vs", "stageClear"] : ["puzzle", "stageClear"];
  const activeMode: Mode = availableModes.includes(mode) ? mode : "puzzle";

  const result = useMemo(() => {
    try {
      if (activeMode === "puzzle") {
        return {
          password: generatePuzzlePassword(game, {
            stageHigh,
            stageLow,
            hours,
            minutes,
            seconds,
            extraPuzzleSet,
          }),
          error: null,
        };
      }
      if (activeMode === "vs") {
        return {
          password: generateVsPassword({
            continues,
            stage: vsStage,
            difficulty,
            bestEnding,
            useCharacter,
            freedCharacters,
          }),
          error: null,
        };
      }
      return {
        password: generateStageClearPassword(game, {
          kind: clearKind,
          stageHigh: clearStageHigh,
          stageLow: clearStageLow,
          score,
          specialStageCleared,
        }),
        error: null,
      };
    } catch (error) {
      if (error instanceof PasswordInputError) {
        return { password: "", error: error.message };
      }
      throw error;
    }
  }, [
    activeMode,
    game,
    stageHigh,
    stageLow,
    hours,
    minutes,
    seconds,
    extraPuzzleSet,
    continues,
    vsStage,
    difficulty,
    bestEnding,
    useCharacter,
    freedCharacters,
    clearKind,
    clearStageHigh,
    clearStageLow,
    score,
    specialStageCleared,
  ]);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">
              パスワードジェネレーター
            </h1>
            <Link
              href="/puzzle"
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
            >
              パズルエディタ
            </Link>
          </div>

          {/* Game tabs */}
          <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
            {(["panel-de-pon", "tetris-attack"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setGame(value)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  game === value
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {GAME_LABEL[value]}
              </button>
            ))}
          </div>

          {/* Mode tabs */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            {availableModes.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeMode === value
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {MODE_LABEL[value]}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {activeMode === "puzzle" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="stageHigh" className={labelClass}>
                      ステージ（前半）
                    </label>
                    <select
                      id="stageHigh"
                      value={stageHigh}
                      onChange={(e) => setStageHigh(Number.parseInt(e.target.value, 10))}
                      className={fieldClass}
                    >
                      {Array.from({ length: 6 }, (_, i) => i + 1).map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="stageLow" className={labelClass}>
                      ステージ（後半）
                    </label>
                    <select
                      id="stageLow"
                      value={stageLow}
                      onChange={(e) => setStageLow(Number.parseInt(e.target.value, 10))}
                      className={fieldClass}
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <span className={labelClass}>クリアタイム</span>
                  <div className="flex space-x-2">
                    <div className="flex-1">
                      <label htmlFor="hours" className="block text-xs text-gray-500 mb-1">
                        時 (0-9)
                      </label>
                      <input
                        type="number"
                        id="hours"
                        min={0}
                        max={9}
                        value={hours}
                        onChange={(e) => setHours(clamp(e.target.value, 0, 9))}
                        className={fieldClass}
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="minutes" className="block text-xs text-gray-500 mb-1">
                        分 (0-59)
                      </label>
                      <input
                        type="number"
                        id="minutes"
                        min={0}
                        max={59}
                        value={minutes}
                        onChange={(e) => setMinutes(clamp(e.target.value, 0, 59))}
                        className={fieldClass}
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="seconds" className="block text-xs text-gray-500 mb-1">
                        秒 (0-59)
                      </label>
                      <input
                        type="number"
                        id="seconds"
                        min={0}
                        max={59}
                        value={seconds}
                        onChange={(e) => setSeconds(clamp(e.target.value, 0, 59))}
                        className={fieldClass}
                      />
                    </div>
                  </div>
                </div>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={extraPuzzleSet}
                    onChange={(e) => setExtraPuzzleSet(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">エクストラパズル（裏面）</span>
                </label>
              </>
            )}

            {activeMode === "vs" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="vsStage" className={labelClass}>
                      ステージ
                    </label>
                    <select
                      id="vsStage"
                      value={vsStage}
                      onChange={(e) => setVsStage(Number.parseInt(e.target.value, 10))}
                      className={fieldClass}
                    >
                      {VS_STAGES.map((name, index) => (
                        <option key={name} value={index}>
                          {index + 1}. {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="difficulty" className={labelClass}>
                      難易度
                    </label>
                    <select
                      id="difficulty"
                      value={difficulty}
                      onChange={(e) => setDifficulty(Number.parseInt(e.target.value, 10))}
                      className={fieldClass}
                    >
                      {VS_DIFFICULTIES.map((name, index) => (
                        <option key={name} value={index}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="continues" className={labelClass}>
                      コンティニュー回数 (0-127)
                    </label>
                    <input
                      type="number"
                      id="continues"
                      min={0}
                      max={127}
                      value={continues}
                      onChange={(e) => setContinues(clamp(e.target.value, 0, 127))}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="useCharacter" className={labelClass}>
                      使用キャラクター
                    </label>
                    <select
                      id="useCharacter"
                      value={useCharacter}
                      onChange={(e) => setUseCharacter(Number.parseInt(e.target.value, 10))}
                      className={fieldClass}
                    >
                      {VS_CHARACTERS.map((name, index) => (
                        <option key={name} value={index}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">解放済みキャラクター</span>
                    <div className="space-x-2">
                      <button
                        type="button"
                        onClick={() => setFreedCharacters(freedCharactersForStage(vsStage))}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                      >
                        ステージ連動
                      </button>
                      <button
                        type="button"
                        onClick={() => setFreedCharacters(new Array(8).fill(true))}
                        className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                      >
                        すべて解放
                      </button>
                      <button
                        type="button"
                        onClick={() => setFreedCharacters(new Array(8).fill(false))}
                        className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                      >
                        すべて未解放
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {VS_FREEABLE_CHARACTERS.map((name, index) => (
                      <label key={name} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={freedCharacters[index] ?? false}
                          onChange={(e) =>
                            setFreedCharacters((prev) =>
                              prev.map((value, i) => (i === index ? e.target.checked : value)),
                            )
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={bestEnding}
                    onChange={(e) => setBestEnding(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">ベストエンディング</span>
                </label>
              </>
            )}

            {activeMode === "stageClear" && (
              <>
                <div>
                  <span className={labelClass}>クリア地点</span>
                  <div className="space-y-2">
                    {(["custom", "special", "final"] as const).map((kind) => (
                      <label key={kind} className="flex items-center">
                        <input
                          type="radio"
                          name="clearKind"
                          checked={clearKind === kind}
                          onChange={() => setClearKind(kind)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {STAGE_CLEAR_KIND_LABEL[kind]}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {clearKind === "custom" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="clearStageHigh" className={labelClass}>
                        ステージ（前半）
                      </label>
                      <select
                        id="clearStageHigh"
                        value={clearStageHigh}
                        onChange={(e) => setClearStageHigh(Number.parseInt(e.target.value, 10))}
                        className={fieldClass}
                      >
                        {Array.from({ length: 6 }, (_, i) => i + 1).map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="clearStageLow" className={labelClass}>
                        ステージ（後半）
                      </label>
                      <select
                        id="clearStageLow"
                        value={clearStageLow}
                        onChange={(e) => setClearStageLow(Number.parseInt(e.target.value, 10))}
                        className={fieldClass}
                      >
                        {Array.from({ length: 5 }, (_, i) => i + 1).map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="score" className={labelClass}>
                    スコア (0-99999)
                  </label>
                  <input
                    type="number"
                    id="score"
                    min={0}
                    max={99999}
                    value={score}
                    onChange={(e) => setScore(clamp(e.target.value, 0, 99999))}
                    className={fieldClass}
                  />
                </div>

                {clearKind === "final" && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={specialStageCleared}
                      onChange={(e) => setSpecialStageCleared(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      スペシャルステージクリア済み（パスワードには影響しません）
                    </span>
                  </label>
                )}
              </>
            )}

            <div>
              <span className={labelClass}>生成されたパスワード</span>
              <div className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-md">
                {result.error ? (
                  <span className="text-sm text-red-600">{result.error}</span>
                ) : (
                  <span className="text-xl font-mono font-bold text-blue-600 tracking-widest">
                    {result.password}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer className="text-center text-gray-400 mt-8">
        &copy; 2026{" "}
        <a
          href="https://github.com/cyrus07424"
          target="_blank"
          className="hover:text-gray-600"
        >
          cyrus
        </a>
      </footer>
    </div>
  );
}
