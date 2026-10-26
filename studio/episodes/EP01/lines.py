# -*- coding: utf-8 -*-
"""《剂量》EP01 一顿饭 —— v3 旁白（单一事实来源）。
- sub: 屏幕字幕（规范写法）；tts: 送进语音合成的文本（读音修正写在这里，字幕不受影响）
- pre/post: 该句前/后停顿（秒）；场景 lead/tail: 场景首尾留白；min_dur: 场景最短时长
- 事实依据见 EP01_一顿饭_脚本_v3.md 的核查表（F 编号写在每句末尾注释里）
"""

SCENES = [
    # ---------------- 冷开场：三句真话 ----------------
    dict(id="s00_paradox", lead=1.7, tail=0.2, lines=[
        dict(id="D001", spk="nar", sub="同一个分子。", tts="同一个芬子。", post=0.55),                     # F14
        dict(id="D002", spk="nar", sub="一份说明书写着：空腹服用。", tts="一份说明书写着：空腹服用。", post=0.4),   # F4
        dict(id="D003", spk="nar", sub="另一份写着：随餐、不随餐，都可以。", tts="另一份写着：随餐，不随餐，都可以。", post=0.4),  # F5
        dict(id="D004", spk="nar", sub="还有一篇论文：配一顿早餐，只吃四分之一。", tts="还有一篇论文：配一顿早餐，只吃四分之一。", post=0.7),  # F7
        dict(id="D005", spk="nar", sub="三句话，彼此矛盾——", tts="三句话，彼此矛盾。", post=0.3),
        dict(id="D006", spk="nar", sub="却全都是真的。", tts="却，全都是真的。", post=1.5),
    ]),
    dict(id="s01_meal", lead=0.3, tail=0.3, lines=[
        dict(id="D007", spk="nar", sub="秘密，藏在一顿饭里。", tts="秘密，藏在一顿饭里。", post=0.7),
        dict(id="D008", spk="nar", sub="一顿丰盛的早餐，能让它在血液里的峰值，\n冲到空腹时的17倍。",
             tts="一顿丰盛的早餐，能让它在血液里的峰值，冲到空腹时的十七倍。", post=1.6),               # F2
        dict(id="D009", spk="nar", sub="药没变。", tts="药没变。", post=0.25),
        dict(id="D010", spk="nar", sub="剂量没变。", tts="剂量没变。", post=0.45),
        dict(id="D011", spk="nar", sub="变的，只是早餐。", tts="变的，只是早餐。", post=1.0),
        dict(id="D012", spk="nar", sub="一顿饭，凭什么改写一个剂量？", tts="一顿饭，凭什么改写一个剂量？", post=0.6),
    ]),
    # ---------------- 片名 ----------------
    dict(id="s02_title", lead=0.0, tail=0.0, min_dur=6.6, lines=[]),
]

VOICES = {
    # 临时：Kokoro zm_089（《监查者》旁白同款）。正式版换 ElevenLabs
    "nar": dict(engine="zh", voice="zm_089", speed=1.02),
}

# 混音：各场景配乐目标电平（dB，越大越响），与《监查者》同一套标尺
MIX_TARGET = {"s00_paradox": -23, "s01_meal": -22, "s02_title": -19}
