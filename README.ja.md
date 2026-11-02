# Voice Wave

**話すと赤く、黙ると穏やかに。** Pipecat Waveを元にしたReact用の音声UIと、ブラウザ内だけで音声を解析するデモです。

[デモを開く](https://dj-thank.github.io/voice-wave/) · [English](README.md) · [初回リリース](https://github.com/dj-thank/voice-wave/releases/tag/v0.1.0) · [検証状況](docs/STATUS.md)

## 使い方

1. 「マイクを開始」を押し、ブラウザのマイクアクセスを許可します。
2. 声を検出すると真っ赤に反応し、黙ると丸い緑の球へ落ち着きます。
3. 「ミュート」で入力を止め、「再開」で戻ります。「終了」でマイクを解放します。

中央にはWaveだけを表示します。思考は緑の点滅、エージェント出力は青紫。「動きを控えめに」は初期OFFです。HTTPSまたはlocalhostで利用してください。

「見た目をプレビュー」は模擬表示。「日本語サンプルで試す」は同梱音声を検出器へ通す無音の検証。「エージェント音声を試す」は音声を実際に再生します。音量と低・中・高帯域に同期しますが、音素・単語の認識ではありません。実際のAI会話サービスは未接続です。

配置比較ではWave単体、内側Wave＋外側Radial、その逆を同じ入力で比較できます。本人とエージェントの内外の担当も交換できます。初期表示はWave単体のままです。単体で同時発話した場合は本人が優先され、複合配置では両方を独立表示します。実マイクとスピーカー出力を比較するときはヘッドホンが役立ちます。

## Reactへ組み込む

初回はnpmレジストリではなくGitHub Releaseのパッケージで配布します。

```sh
npm install https://github.com/dj-thank/voice-wave/releases/download/v0.1.0/dj-thank-voice-wave-0.1.0.tgz
```

```tsx
import { VoiceWave } from '@dj-thank/voice-wave';

<VoiceWave
  mode="user"
  level={0.6}
  bands={[0.3, 0.6, 0.2]}
  style={{ width: 320, height: 320 }}
/>
```

上は固定値の例です。実際には音量と帯域を0〜1で渡し、`mode`を`waiting` / `user` / `agent` / `thinking`で切り替えます。部品自体はマイク取得・録音・権限要求を行いません。入出力を別々に渡す`VoiceConversation`、内外配置、詳しいAPIは[英語README](README.md)と[最小導入例](examples/minimal-react/)を参照してください。

## ローカル起動

Node.js 24とnpmを使用します。

```sh
git clone https://github.com/dj-thank/voice-wave.git
cd voice-wave
npm ci
npm run build
npm run dev
```

`http://127.0.0.1:4317/`を開きます。`npm test`、`npm run typecheck`、`npm run build`で検証できます。`npm run test:package`は実際の配布パッケージを独立した導入例へインストールし、型・ビルド・サーバー描画を検証します。音声判定用のモデル・WASMは固定した依存パッケージから準備し、同じサイトから配信します。外部CDNからの実行時取得は不要です。

## ログと音声の扱い

マイク音声はブラウザ内で解析し、録音の保存・外部への音声送信はしません。ホスティングサービスにはページやファイルの通常のアクセスが届きます。

「診断・ログ」は初期状態では折りたたみ。状態・発話確率・入出力の音量・帯域をメモリに最大900件保持します。数値は最大毎秒4回、状態遷移は即時記録。「JSONを保存」「クリア」「ログを記録」で書き出し・消去・一時停止ができます。再読み込みでも消えます。音声そのもの・端末ID・会話内容は含めません。

## 確認範囲

Silero v6を初期値とし、v5との比較もできます。日本語全体の精度順位を示すものではありません。表示の発話判定とAIが返答を始めるターン終了判定は別です。周囲の声やスピーカーの回り込みは検出される可能性があります。本人マイク・実際の生活音・モバイル端末・遅延の定量評価には未確認項目があります。[検証状況](docs/STATUS.md)に証拠と限界を記載します。

PipecatとLiveKitの公式製品ではありません。元のコード・モデル・サンプル音声の出典とライセンスは[THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.md)、独自コードは[BSD-2-Clause](LICENSE)を参照してください。
