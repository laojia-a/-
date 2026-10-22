"""Two-pass loudness-normalise each mix and mux it with the rendered video."""
import json, re, subprocess, sys

FF = "/projects/sandbox/work/ffmpeg"
B = "/projects/sandbox/work/build/"
OUT = "/projects/sandbox/output/"
CHAIN = "acompressor=threshold=-20dB:ratio=2.2:attack=8:release=150,"
TARGET = "I=-14:TP=-1.5:LRA=11"


def measure(wav):
    r = subprocess.run([FF, "-hide_banner", "-nostats", "-i", wav, "-af",
                        CHAIN + f"loudnorm={TARGET}:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    return json.loads(re.findall(r"\{[^{}]+\}", r.stderr)[-1])


def mux(wav, out):
    m = measure(wav)
    ln = (f"loudnorm={TARGET}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:"
          f"offset={m['target_offset']}:linear=true")
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", B + "video_noaudio.mp4", "-i", wav,
                    "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
                    "-af", CHAIN + ln + ",aresample=48000", "-ac", "2", "-c:a", "aac", "-b:a", "192k",
                    "-shortest", "-movflags", "+faststart",
                    "-metadata", "title=BE试验CRA职责全景",
                    "-metadata", "comment=AIGC: 本视频配音为AI语音合成（Kokoro TTS），画面为程序生成",
                    out], check=True)
    print("wrote", out, "| measured input I =", m["input_i"])


if __name__ == "__main__":
    import os
    os.makedirs(OUT, exist_ok=True)
    mux(B + "mix_bgm.wav", OUT + "BE试验CRA职责_抖音成片.mp4")
    mux(B + "mix_nobgm.wav", OUT + "BE试验CRA职责_无背景音乐版.mp4")
