"""从分集脚本 markdown 中抽取旁白，生成配音用的逐句稿。

用法: python tools/extract_narration.py EP01_一顿饭_脚本_v1.md
输出: build/EP01/narration.tsv  每行 "编号<TAB>段落<TAB>旁白"
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# 只从这些段落抽旁白；片头无旁白
SECTION_RE = re.compile(r"^###\s+(.+?)(?:（[\d:–-]+）)?\s*$")
SKIP_SECTIONS = {"片头", "弹幕投票"}


def clean(text: str) -> str:
    text = re.sub(r"【[^】]*】", "", text)  # 去掉【真】【模】【待核】标记
    text = text.replace("**", "").strip()
    return text


def extract(md_path: Path):
    lines = md_path.read_text(encoding="utf-8").splitlines()
    in_script = False
    section = None
    out = []
    for line in lines:
        if line.startswith("## "):
            in_script = line.strip() == "## 脚本"
            continue
        if not in_script:
            continue
        m = SECTION_RE.match(line)
        if m:
            section = m.group(1).strip()
            continue
        if section is None or any(section.startswith(s) for s in SKIP_SECTIONS):
            continue
        s = line.strip()
        if s.startswith("|"):
            cells = [c.strip() for c in s.strip("|").split("|")]
            # 表头与分隔行跳过；旁白在第二列
            if len(cells) < 2 or cells[1] in ("旁白", "") or set(cells[1]) <= {"-", " "}:
                continue
            out.append((section, clean(cells[1])))
        elif "旁白：" in s:
            # 剂量地图等段落里，旁白写在画面说明之后
            out.append((section, clean(s.split("旁白：", 1)[1])))
        elif section.startswith("这一集不能推出什么") and re.match(r"^\d+\.\s", s):
            out.append((section, clean(re.sub(r"^\d+\.\s*", "", s))))
        elif section.startswith("片尾") and s and not s.startswith(("画面", "#")):
            out.append((section, clean(s)))
    return [(sec, t) for sec, t in out if t]


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    md = Path(sys.argv[1])
    if not md.is_absolute():
        md = ROOT / md
    ep = re.match(r"(EP\d+)", md.name).group(1)
    rows = extract(md)
    out_dir = ROOT / "build" / ep
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / "narration.tsv"
    with out.open("w", encoding="utf-8") as f:
        for i, (sec, text) in enumerate(rows, 1):
            f.write(f"{ep}_{i:03d}\t{sec}\t{text}\n")
    chars = sum(len(t) for _, t in rows)
    # 中文旁白按约 4 字/秒估算
    print(f"{out}: {len(rows)} 句, {chars} 字, 约 {chars / 4 / 60:.1f} 分钟")


if __name__ == "__main__":
    main()
