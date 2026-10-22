# -*- coding: utf-8 -*-
"""对问题句尝试多种 TTS 写法，ASR 回听比较。用法: python variants.py"""
import sys, re, json
import numpy as np, librosa, soundfile as sf
sys.argv = [sys.argv[0]]
import gen_tts as G

# 关闭儿化（本片没有需要儿化的词）
G.G2P_ZH.frontend._merge_erhua = lambda ini, fin, w, p: (ini, fin)

TESTS = {
    "lin_name": ("argus", ["她叫林。记住她。", "她姓林。记住她。", "她叫林夏。记住她。", "她，叫林。", "她的名字叫林。"]),
    "fangshi": ("argus", ["一位临床监查员，还在酒店房间里，写今天的访视报告。", "一位临床监查员，还在酒店房间里，写今天的监查访视报告。",
                          "一位临床监查员，还在酒店房间里，赶今天的访视报告。", "一位临床监查员，还在酒店的房间里，写着今天的访视报告。"]),
    "zhixian": ("argus", ["支线，进行中。", "支线……进行中。", "支线任务，进行中。", "支线，正在进行中。", "枝线，进行中。"]),
    "names": ("argus", ["跨国药企联盟 Transcelerate，和 Medidata 一起", "跨国药企联盟 Trans-celerate，和 Medi-data 一起",
                        "跨国药企联盟 TransCelerate，和 Meddy data 一起", "跨国药企联盟 Trance-sell-er-rate，和 Med-ih-data 一起"]),
    "fda": ("argus", ["二零一三年，美国 F D A 发布基于风险的监查指南。", "美国 F D A 上线了自己的生成式 A I 工具，Elsa。",
                      "九月一日，中国新修订的 G C P 正式施行。", "二零二二年十一月三十日，Chat G P T 发布。", "F D A 和 E M A 联合发布了"]),
    "pukai": ("argus", ["从那以后，一个职业，在全世界扑开：临床监查员。", "从那以后，一个职业，在全世界铺展开来：临床监查员。"]),
    "taier": ("argus", ["会导致胎儿畸形。全球有一万多名婴儿，受到影响。"]),
    "lin012": ("lin", ["受试者零幺二……知情同意书，版本号……核对无误。", "受试者，零幺二。知情同意书，版本号，核对无误。"]),
}

which = sys.argv[1:] if len(sys.argv) > 1 else list(TESTS)
for key in which:
    spk, vs = TESTS[key]
    print("=====", key)
    for i, t in enumerate(vs):
        line = dict(id=f"v_{key}_{i}", spk=spk, tts=t, sub=t)
        ph, s, sr, tm = G.synth(line)
        sf.write(f"{G.OUT}/../variants_{key}_{i}.wav", s, sr)
        a16 = librosa.resample(s, orig_sr=sr, target_sr=16000)
        st = G.ASR.create_stream(); st.accept_waveform(16000, a16); G.ASR.decode_stream(st)
        hyp = re.sub(r"<\|[^|]*\|>", "", st.result.text)
        print(f"  [{i}] {t}\n      ASR: {hyp}   ({len(s)/sr:.2f}s)")
