# シャドーイング（training.apush.jp/shadowing/）

9本の中身は `data/lessons.json` だけで決まる（HTMLに素材名は書いていない）。
LINE・体験レッスンのURLも `lessons.json` の `links` 1か所だけ。

## 作り直し・追加（スクリプト）
```
cd shadowing
python3 tools/make.py plan L1-1    # OpenAIが区間・和訳・単語・クイズを作る → sources/L1-1_plan.json
python3 tools/make.py build L1-1   # 切り出し・720p圧縮・字幕(vtt)・lessons.json 更新
```
- 必要：ffmpeg、`pip install faster-whisper openai`、OpenAIのキー（`OPENAI_API_KEY`、なければ `~/apush/sns-pipeline/.env` から読む）
- `sources/` は元のファイル置き場。git には入れない
- 和訳を直したら `lessons.json` の `lines[].ja` と `subs/{id}.ja.vtt` の両方を直し、確認後に `ja_reviewed: true`

## 講師の動画に差し替える
1. mp4を `media/{id}.mp4` に置く（字幕は焼き込まずに撮る。720p・`-movflags +faststart` 推奨。50MB以下）
2. `lessons.json` の1本を書き換える：
   - `source: "apush"`、`title`、`credit: "講師：〇〇（A-PUSH）"`
   - `cover_height: 0`（字幕カバーを使わない）、`audio_only: null`、`clip_start/clip_end: null`
3. 字幕を作る：英語の台本を1文ずつ `lines: [{"start","end","en","ja"}]` に入れる。
   時刻は whisper で取る（`tools/make.py` の `align()` と同じやり方）か、動画を見ながら手で入れる。
   `subs/{id}.en.vtt` / `.ja.vtt` も同じ内容で作る（ページは `lines` を表示に使う）
4. `vocab`（5〜10語）と `quiz`（5問）を入れる。外したい本は `active: false`

## 確認（手元）
動画の頭出しには Range 対応のサーバーが必要（`python3 -m http.server` だとシークできない）：
```
pip install rangehttpserver && python3 -m RangeHTTPServer 8765   # リポジトリ直下で → http://localhost:8765/shadowing/
```
