# -*- coding: utf-8 -*-
"""旁白脚本 = 全片唯一的事实来源。改这里 → 重配音 → 重建时间轴，画面/音乐/字幕自动对齐。
字段：id 唯一编号（对应 build/tts/<id>.wav）；spk 角色（见 VOICES）；tts 送进合成的文本；sub 屏幕字幕（\n 换行=长句分段显示）；
      sub_en 英文引文原文（可选）；pre/post 句前/句后停顿秒；speed 语速（Kokoro）
场景：lead 首句前留白（有章节卡时 ≥2.8）、tail 末句后留白、min_dur 无台词场景的最短时长、chapter 仅作标注"""
SCENES = [
    dict(id="s00_open", lead=2.0, tail=1.0, lines=[
        dict(id="L001", spk="narrator", tts="你好，我是这部片子的叙述者。", sub="你好，我是这部片子的叙述者。", post=.7),
        dict(id="L002", spk="narrator", tts="此刻，我正同时注视着一万两千个目标。", sub="此刻，我正同时注视着12,000个目标。", post=.6),
    ]),
    dict(id="s01_hbo", lead=2.8, tail=2.0, chapter=("第一章", "深夜"), lines=[
        dict(id="L003", spk="narrator", tts="深夜，办公室里只剩下一盏台灯。", sub="深夜，办公室里只剩下一盏台灯。", post=1.0),
    ]),
    dict(id="s02_hollywood", lead=1.0, tail=3.5, lines=[
        dict(id="L004", spk="narrator", tts="而天，就要亮了。", sub="而天，就要亮了。", post=.4),
    ]),
]
VOICES = {
    "narrator": dict(engine="zh", voice="zm_089", speed=1.0),
    "en_quote": dict(engine="en", voice="bm_george", speed=.9, lang="en-gb"),
}
