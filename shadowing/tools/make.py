"""シャドーイング教材を作るスクリプト。文章の仕事（区間選び・和訳・単語・クイズ）は OpenAI に任せ、
切り出し・圧縮・字幕の時刻合わせはローカル（ffmpeg / faster-whisper の結果）で行う。

使い方（shadowing/ で）:
  python3 tools/make.py plan L1-1 ...   # OpenAI に区間・訳・単語・クイズを作らせる → sources/{id}_plan.json
  python3 tools/make.py build L1-1 ...  # 動画を切って圧縮・字幕を作る・data/lessons.json を更新
引数なしなら全部。APIキーは環境変数 OPENAI_API_KEY か、ENV_FILE（既定 ~/apush/sns-pipeline/.env）から読む。
"""
import json, os, re, sys, html, subprocess, difflib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC, MEDIA, SUBS, DATA = ROOT / "sources", ROOT / "media", ROOT / "subs", ROOT / "data"
MODEL = os.environ.get("OPENAI_MODEL", "gpt-5.1")

LINKS = {"line": "https://lin.ee/Wxep7BH",
         "meeting": "https://calendar.app.google/kX21qNU7f9NdJtQY9?utm_source=training&utm_medium=shadowing&utm_content=meeting"}
VOA_CREDIT = "Video: VOA Learning English (learningenglish.voanews.com) — public domain"
NASA_CREDIT = ("Video: NASA Goddard Space Flight Center / NASA Scientific Visualization Studio. "
               "NASAはA-PUSHを推薦・提携していません。動画内の音楽・一部映像は第三者の権利を含むため、加工せずに配信しています。")

LESSONS = {
    "L1-1": dict(level=1, source="voa", title="Hello, I'm Anna!", url="https://learningenglish.voanews.com/a/lets-learn-english-lesson-2-hello/3113733.html", dur=(60, 120)),
    "L1-2": dict(level=1, source="voa", title="Are You Busy?", url="https://learningenglish.voanews.com/a/lets-learn-english-lesson-8-are-you-busy/3253185.html", dur=(60, 120)),
    "L1-3": dict(level=1, source="voa", title="What Can You Do?", url="https://learningenglish.voanews.com/a/lets-learn-english-lesson-20-what-can-you-do/3384429.html", dur=(60, 120)),
    "L2-1": dict(level=2, source="voa", title="When Do I Start?", url="https://learningenglish.voanews.com/a/lets-learn-english-lesson-19-when-do-you-start/3357760.html", dur=(120, 180)),
    "L2-2": dict(level=2, source="voa", title="Yesterday Was Amazing!", url="https://learningenglish.voanews.com/a/lets-learn-english-lesson-24-yesterday-was-amazing/3439164.html", dur=(120, 180)),
    "L2-3": dict(level=2, source="voa", title="Have You Ever ...?", url="https://learningenglish.voanews.com/a/lets-learn-english-lesson-48-have-you-ever/3753664.html", dur=(120, 180)),
    "L3-1": dict(level=3, source="nasa", title="Northward Shift of Boreal Tree Cover", url="https://svs.gsfc.nasa.gov/14965/"),
    "L3-2": dict(level=3, source="nasa", title="Webb Spies Rain Clouds, New Molecule on Titan", url="https://svs.gsfc.nasa.gov/14843/"),
    "L3-3": dict(level=3, source="voa", title="The Ransom of Red Chief", url="https://learningenglish.voanews.com/a/the-ransom-of-red-chief-by-o-henry/4656557.html", dur=(270, 330), story=True),
}


def ask(prompt):
    if not os.environ.get("OPENAI_API_KEY"):
        for line in open(os.path.expanduser(os.environ.get("ENV_FILE", "~/apush/sns-pipeline/.env"))):
            m = re.match(r"\s*(?:export\s+)?OPENAI_API_KEY\s*=\s*[\"']?([^\"'\s]+)", line)
            if m:
                os.environ["OPENAI_API_KEY"] = m[1]
    from openai import OpenAI
    r = OpenAI().chat.completions.create(model=MODEL, response_format={"type": "json_object"},
                                         messages=[{"role": "user", "content": prompt}])
    return json.loads(r.choices[0].message.content)


def page_text(i):
    s = re.sub(r"<script.*?</script>|<style.*?</style>", "", (SRC / f"{i}_page.html").read_text(), flags=re.S)
    t = html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"</p>|<br\s*/?>", "\n", s)))
    return re.sub(r"[ \t]+", " ", re.sub(r"\n\s*\n+", "\n", t))


def srt_cues(path):
    cues = []
    for block in re.split(r"\n\s*\n", path.read_text(encoding="utf-8-sig").strip()):
        ls = block.strip().splitlines()
        k = next(n for n, l in enumerate(ls) if "-->" in l)
        a, b = [ts(x) for x in ls[k].split("-->")]
        cues.append({"start": a, "end": b, "en": " ".join(ls[k + 1:]).strip()})
    return cues


def ts(x):
    h, m, s = x.strip().replace(",", ".").split(":")
    return int(h) * 3600 + int(m) * 60 + float(s)


COMMON = """日本人の英語学習者向けシャドーイング教材を作ります。レベル{level}（1=英検4級程度、2=英検3級程度、3=英検2級〜準1級程度）。
次のJSONも作ってください：
- "vocab": 学習者が知らなそうな単語・フレーズ 5〜10個 [{{"en":..., "ja":...}}]（en は本文に出てくる形）
- "quiz": 内容理解クイズ5問 [{{"q": 日本語の問い, "choices": [日本語4つ], "answer": 正解の番号0〜3, "explain": 日本語の解説1〜2文}}]
- "ja_unsure": 和訳に自信のない行 [{{"line": 行番号(0始まり), "why": 日本語で理由}}]
和訳は自然な日本語で、直訳しすぎない。字幕なので1行は短めに。
「話せるようになる」「ペラペラ」「必ず」「科学的」「研究で証明」は使わない。"""


def plan(i):
    L = LESSONS[i]
    if L["source"] == "nasa":
        cues = srt_cues(SRC / f"{i}.en.srt")
        out = ask(COMMON.format(level=3) + "\n\nNASAの解説動画の英語字幕（公式）です。番号つきの各行（文の途中で切れている行もある）に対応する和訳を、"
                  '同じ番号をキーにして "ja": {"0": .., "1": ..} に入れてください。全部の番号を入れる。\n\n'
                  + json.dumps({str(n): c["en"] for n, c in enumerate(cues)}, ensure_ascii=False))
        ja = out.pop("ja")
        miss = [n for n in range(len(cues)) if str(n) not in ja]
        assert not miss, f"{i}: 和訳がない行 {miss}"
        out["lines"] = [{"en": c["en"], "ja": ja[str(n)]} for n, c in enumerate(cues)]
    else:
        segs = json.load(open(SRC / f"{i}_whisper.json"))
        lo, hi = L["dur"]
        task = (f"約14分の朗読から、子どもが誘拐犯を振り回す場面を中心に、話の筋が分かる {lo}〜{hi}秒 の区間を選んでください。"
                "始まりと終わりは文の切れ目。\"synopsis\": 区間の前までの日本語のあらすじ2〜3行 も作ってください。"
                if L.get("story") else
                f"動画（約5分）は会話＋解説です。登場人物の会話の部分だけ（解説・ナレーターの文法説明は除く）の、連続した {lo}〜{hi}秒 の区間を選んでください。"
                "冒頭の主人公のひとこと（カメラに向かって話す部分）は会話の流れに必要なら含めてよい。")
        prompt = (COMMON.format(level=L["level"]) + f"\n\n{task}\n"
                  '"start_seg" と "end_seg": 区間の最初と最後の音声認識セグメントの番号（下のsegsのi）。\n'
                  '"lines": 区間内のせりふを、公式の本文（transcript）の文章どおりに1文〜短い1まとまりずつ [{"en": 本文どおり（話者名は付けない）, "ja": 和訳}]。'
                  "音声認識の聞き間違いは使わず、本文の文章を正とする。本文にない音声（例：歌）は入れない。\n\n"
                  "segs（音声認識、秒）:\n" + json.dumps([{"i": n, "s": round(s["s"], 1), "e": round(s["e"], 1), "t": s["t"]} for n, s in enumerate(segs)], ensure_ascii=False)
                  + "\n\n公式ページの本文（UIの文字が混ざっています）:\n" + page_text(i))
        note = ""
        for _ in range(4):  # 長さが範囲外なら、測った長さを伝えて選び直させる
            out = ask(prompt + note)
            d = segs[out["end_seg"]]["e"] - segs[out["start_seg"]]["s"]
            if lo <= d <= hi:
                break
            note = f"\n\n【やり直し】前の答えは start_seg={out['start_seg']} end_seg={out['end_seg']} で {d:.0f}秒でした。必ず {lo}〜{hi}秒 にしてください（s と e の秒で計算）。"
            print(i, "retry:", round(d))
    (SRC / f"{i}_plan.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print(i, "plan ok", len(out["lines"]), "lines")


def norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower().replace("’", "'"))


def align(lines, words, t0, t1):
    """本文の各行を whisper の単語の時刻に合わせる（文章は本文、時刻だけ whisper）。"""
    W = [w for w in words if t0 - 3 <= w[0] <= t1 + 3 and norm(w[2])]
    wn = [norm(w[2]) for w in W]
    toks, owner = [], []
    for k, l in enumerate(lines):
        for t in l["en"].split():
            if norm(t):
                toks.append(norm(t)); owner.append(k)
    hit = {}
    for a, b, n in difflib.SequenceMatcher(None, toks, wn, autojunk=False).get_matching_blocks():
        for d in range(n):
            hit[a + d] = b + d
    out = []
    for k in range(len(lines)):
        idx = [hit[j] for j, o in enumerate(owner) if o == k and j in hit]
        out.append((W[idx[0]][0], W[idx[-1]][1]) if idx else None)
    for k, v in enumerate(out):  # 合わなかった行は前後の間を使う
        if v is None:
            a = next((out[j][1] for j in range(k - 1, -1, -1) if out[j]), t0)
            b = next((out[j][0] for j in range(k + 1, len(out)) if out[j]), t1)
            out[k] = (a, b)
            print("  ! 時刻を推定した行:", lines[k]["en"])
    return out


def vtt(path, cues, key):
    def f(x):
        x = max(x, 0); return f"{int(x // 3600):02}:{int(x % 3600 // 60):02}:{x % 60:06.3f}"
    path.write_text("WEBVTT\n\n" + "\n".join(f"{n + 1}\n{f(c['start'])} --> {f(c['end'])}\n{c[key]}\n" for n, c in enumerate(cues)), encoding="utf-8")


def ff(*a):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *a], check=True)


def still(title, path):
    from PIL import Image, ImageDraw, ImageFont
    im = Image.new("RGB", (1280, 720), "#F6F6F4"); d = ImageDraw.Draw(im)
    big = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 64)
    small = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 34)
    d.text((640, 330), title, font=big, fill="#0B0B0C", anchor="mm")
    d.text((640, 420), "A-PUSH", font=small, fill="#E8321F", anchor="mm")
    im.save(path)


def build(i):
    L, P = LESSONS[i], json.load(open(SRC / f"{i}_plan.json"))
    src = SRC / f"{i}_src.mp4"
    enc = ["-vf", "scale=-2:720", "-c:v", "libx264", "-crf", "28", "-preset", "slow", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart"]
    lesson = dict(id=i, level=L["level"], title=L["title"], source=L["source"], source_url=L["url"],
                  video=f"media/{i}.mp4", audio_only=None, subs_en=f"subs/{i}.en.vtt", subs_ja=f"subs/{i}.ja.vtt",
                  clip_start=None, clip_end=None, cover_height=0.22 if L["source"] == "voa" else 0,
                  repeat="minute" if L["level"] == 3 else "line", synopsis=P.get("synopsis"),
                  vocab=P["vocab"], quiz=P["quiz"], ja_reviewed=False, ja_unsure=P.get("ja_unsure", []),
                  credit=VOA_CREDIT if L["source"] == "voa" else NASA_CREDIT, active=True)
    if L["source"] == "nasa":  # 切らない・焼き込まない。720pに縮めるだけ
        cues = [dict(c, ja=l["ja"]) for c, l in zip(srt_cues(SRC / f"{i}.en.srt"), P["lines"])]
        ff("-i", src, *enc, MEDIA / f"{i}.mp4")
    else:
        segs = json.load(open(SRC / f"{i}_whisper.json"))
        # 区間は OpenAI が選んだセグメントの少し外まで探し、実際に最初と最後の行が聞こえる所で切る
        w0 = segs[max(P["start_seg"] - 2, 0)]["s"]; w1 = segs[min(P["end_seg"] + 3, len(segs) - 1)]["e"]
        words = [w for s in segs for w in s["w"]]
        times = align(P["lines"], words, w0, w1)
        a = max(times[0][0] - 0.4, 0); b = times[-1][1] + 0.6
        cues = [{"start": s - a, "end": e - a + 0.15, "en": l["en"], "ja": l["ja"]} for (s, e), l in zip(times, P["lines"])]
        lesson.update(clip_start=round(a, 2), clip_end=round(b, 2))
        ff("-ss", f"{a:.2f}", "-to", f"{b:.2f}", "-i", src, *enc, MEDIA / f"{i}.mp4")
        if L.get("story"):  # 字幕なしの段：同じ区間の音声＋タイトルだけの静止画
            png = SRC / f"{i}_still.png"; still(L["title"], png)
            ff("-loop", "1", "-framerate", "1", "-i", png, "-ss", f"{a:.2f}", "-to", f"{b:.2f}", "-i", src,
               "-map", "0:v", "-map", "1:a", "-shortest", "-c:v", "libx264", "-tune", "stillimage", "-pix_fmt", "yuv420p", "-r", "1",
               "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", MEDIA / f"{i}_audio.mp4")
            lesson["audio_only"] = f"media/{i}_audio.mp4"
    vtt(SUBS / f"{i}.en.vtt", cues, "en"); vtt(SUBS / f"{i}.ja.vtt", cues, "ja")
    lesson["lines"] = [{"start": round(c["start"], 2), "end": round(c["end"], 2), "en": c["en"], "ja": c["ja"]} for c in cues]
    (SRC / f"{i}_lesson.json").write_text(json.dumps(lesson, ensure_ascii=False))
    f = DATA / "lessons.json"  # 並列で走らせても、最後に終わったものが全部をまとめる
    db = json.load(open(f)) if f.exists() else {"links": LINKS, "lessons": []}
    db["lessons"] = [json.load(open(x)) for x in sorted(SRC.glob("*_lesson.json"))]
    f.write_text(json.dumps(db, ensure_ascii=False, indent=1))
    mb = (MEDIA / f"{i}.mp4").stat().st_size / 1e6
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", MEDIA / f"{i}.mp4"], capture_output=True, text=True).stdout)
    print(f"{i} build ok  clip={lesson['clip_start']}–{lesson['clip_end']}  {dur:.1f}s  {mb:.1f}MB")
    if "dur" in L and not L["dur"][0] - 5 <= dur <= L["dur"][1] + 5:
        print(f"  ! 長さが範囲外: {dur:.0f}s（目安 {L['dur']}）")
    if mb > 50:
        print("  ! 50MBを超えた")


if __name__ == "__main__":
    cmd, ids = sys.argv[1], sys.argv[2:] or list(LESSONS)
    for i in ids:
        {"plan": plan, "build": build}[cmd](i)
