# panelDePonUtils

『パネルでポン』/ *Tetris Attack*（スーパーファミコン / SNES）向けのユーティリティ集です。

- `/` — パスワードジェネレーター（パズル / 対戦 / ステージクリア）
- `/puzzle` — パズルエディタ

## Getting Started

```bash
npm install
npm run dev    # 開発サーバー
npm test       # パスワード生成ロジックのテスト
npm run build  # 本番ビルド（TypeScript の型チェックを含む）
```

[http://localhost:3000](http://localhost:3000) を開いてください。

---

## パスワード生成ロジックについて

### アルゴリズム（確定仕様）

各モードは 40bit のペイロード `W2:W1:W0`（`W0`/`W1` は 16bit、`W2` は 8bit）を作り、
共通の描画処理で 8 文字に変換します。

**ビット分割**（上位から 5bit ずつ 8 グループ）

```
v0 = (W2 & 0xF8) >> 3
v1 = ((W1 & 0xC000) >> 14) | ((W2 & 7) << 2)
v2 = (W1 >> 9) & 0x1F
v3 = (W1 >> 4) & 0x1F
v4 = ((W1 & 0xF) << 1) | ((W0 & 0x8000) >> 15)
v5 = (W0 >> 10) & 0x1F
v6 = (W0 >> 5) & 0x1F
v7 = W0 & 0x1F
```

**文字への変換**

```
M = [0, 16, 8, 24, 4, 20, 28, 12]                 // 位置ごとの XOR マスク
A(Tetris Attack) = "NXT&24HLDRZ!?K3P76YB9%S5JGQ8CM1F"
A(パネルでポン)  = "NXTA24HLDRZUIK3P76YB9ES5JGQ8CM1F"

for i in 0..7:
    t = v[i] XOR M[i]
    if game == Tetris Attack: t が 11 なら 12、12 なら 11 に入れ替える
    char = A[ t XOR M[charSet] ]
```

`charSet`（0-7 の文字表ローテーション）は元ツールでは非表示コントロールで常に 0、
パネルでポンでは強制的に 0 です。移植版でも任意引数として残していますが既定は 0 です。

**パズルモード**（`stage = (前半 - 1) * 10 + 後半 - 1`）

```
W0  = (stage & 0x7F) | (extra << 7) | ((sec & 0x3F) << 8) | ((min & 3) << 14)
chk = Tetris Attack ? ~((min & 3) + (stage & 0x7F) + (sec & 0x3F))   // 16bit
                    : W0
W1  = ((min & 0x3F) >> 2) | ((hour & 0xF) << 4) | ((chk & 0xFF) << 8)
W2  = chk >> 8
```

**対戦モード**（Tetris Attack のみ。パネルでポンではタブごと存在しません）

```
W0  = (cont & 0x7F) | ((stage & 0xF) << 7) | ((diff & 3) << 11)
      | (bestEnding << 13) | (group << 14) | ((charId & 1) << 15)
sum = popcount(freed) + (cont & 0x7F) + (stage & 0xF) + (diff & 3)
      + bestEnding + (charId & 0xF) + group
chk = (sum XOR 0x2DB) & 0x3FF
W1  = ((charId & 0xE) >> 1) | (freed << 3) | ((chk & 3) << 14)
W2  = (chk & 0x3FC) >> 2
```

使用キャラクターのインデックス → `(charId, group)`：
`0`(Yoshi) → `(4, 0)`、`1..4` → `(idx - 1, 0)`、`5..8` → `((idx - 1) & 3, 1)`。

**ステージクリアモード**

```
W0  = score & 0xFFFF
chk = special + (score & 0xFF) + (下位 & 7) + (上位 & 0xF) + (上位M1 & 0xF)
W1  = ((score >> 16) & 1) | ((下位 & 7) << 1) | ((上位 & 0xF) << 4)
      | ((上位M1 & 0xF) << 8) | (special << 12) | ((chk & 7) << 13)
W2  = (chk >> 3) & 0xFF
```

クリア地点の指定による前処理（実機で確認）:

| 指定 | 上位 | 下位 | 上位M1 | special |
| --- | --- | --- | --- | --- |
| ステージ指定 | 入力値 (1-6) | 入力値 (1-5) | 上位 - 1 | 0 |
| スペシャルステージ | 4 | 1 | **3** | Tetris Attack: 0 / パネルでポン: 1 |
| ファイナルステージ | 6 | 1 | **6** | 1 |

### 入力範囲

| モード | 項目 | 範囲 |
| --- | --- | --- |
| パズル | ステージ前半 / 後半 | 1-6 / 1-10 |
| パズル | 時 / 分 / 秒 | 0-9 / 0-59 / 0-59 |
| パズル | エクストラパズル（裏面） | on/off |
| 対戦 | コンティニュー回数 | 0-127 |
| 対戦 | ステージ | 0-9（Breeze … Naval Piranha） |
| 対戦 | 難易度 | 0-3（Easy / Normal / Hard / Very Hard） |
| 対戦 | 使用キャラクター | 0-8（Yoshi + 解放可能 8 名） |
| 対戦 | 解放済みキャラクター | 8 要素の真偽値 |
| ステージクリア | ステージ前半 / 後半 | 1-6 / 1-5 |
| ステージクリア | スコア | 0-99999 |

---

## 構成

| パス | 内容 |
| --- | --- |
| `lib/tapass/password.ts` | パスワード生成ロジック（純粋関数・型定義・入力検証） |
| `lib/tapass/password.test.ts` | `node --test` による回帰テスト |
| `lib/tapass/vectors.json` | 元ツール実機出力から採取した検証用ベクタ（162 件） |
| `app/page.tsx` | パスワードジェネレーター UI |
| `app/puzzle/page.tsx` | パズルエディタ |
