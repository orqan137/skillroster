from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RECORDING = Path(
    os.environ.get("SKILLROSTER_RECORDING_DIR", ROOT / "artifacts" / "video" / "recording")
).resolve()
if ROOT / "artifacts" / "video" not in RECORDING.parents:
    raise SystemExit("녹화 경로는 artifacts/video 아래여야 함")
OUTPUT = ROOT / "artifacts" / "video" / "skillroster-demo-silent-ko.mp4"
SUBTITLES = ROOT / "artifacts" / "video" / "skillroster-demo-silent-ko.srt"
CAPTION_TRACK = RECORDING / "captions.ass"
FFMPEG = Path(
    os.environ.get(
        "FFMPEG_PATH",
        r"C:\Users\castle\AppData\Local\Temp\skillroster-video-tools\node_modules\ffmpeg-static\ffmpeg.exe",
    )
)


def main() -> None:
    manifest = json.loads((RECORDING / "manifest.json").read_text(encoding="utf-8"))
    frames = manifest["frames"]
    duration = float(manifest["duration"])
    if len(frames) < 100:
        raise SystemExit("녹화 프레임이 부족함")

    def srt_time(value: float) -> str:
        milliseconds = max(0, round(value * 1000))
        hours, remainder = divmod(milliseconds, 3_600_000)
        minutes, remainder = divmod(remainder, 60_000)
        seconds, milliseconds = divmod(remainder, 1000)
        return f"{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03}"

    subtitle_blocks = []
    for index, caption in enumerate(manifest.get("captions", []), start=1):
        subtitle_blocks.append(
            f"{index}\n{srt_time(float(caption['start']))} --> {srt_time(float(caption['end']))}\n{caption['text']}\n"
        )
    SUBTITLES.write_text("\n".join(subtitle_blocks), encoding="utf-8-sig")

    def ass_time(value: float) -> str:
        centiseconds = max(0, round(value * 100))
        hours, remainder = divmod(centiseconds, 360_000)
        minutes, remainder = divmod(remainder, 6_000)
        seconds, centiseconds = divmod(remainder, 100)
        return f"{hours}:{minutes:02}:{seconds:02}.{centiseconds:02}"

    def ass_text(value: str) -> str:
        return value.replace("\\", r"\\").replace("{", r"\{").replace("}", r"\}")

    ass_lines = [
        "[Script Info]",
        "ScriptType: v4.00+",
        "PlayResX: 1920",
        "PlayResY: 1080",
        "WrapStyle: 2",
        "ScaledBorderAndShadow: yes",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        "Style: Caption,Malgun Gothic,29,&H00FFFFFF,&H00FFFFFF,&H0007120D,&H0007120D,-1,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1",
        "Style: Step,Malgun Gothic,27,&H0007120D,&H0007120D,&H0000E684,&H0000E684,-1,0,0,0,100,100,0,0,1,0,0,5,0,0,0,1",
        "Style: Shape,Arial,10,&H0000E684,&H0000E684,&H0000E684,&H0000E684,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
        f"Dialogue: 0,0:00:00.00,{ass_time(duration)},Shape,,0,0,0,,{{\\an7\\pos(0,0)\\p1\\c&H0D1207&}}m 0 960 l 1920 960 l 1920 1080 l 0 1080{{\\p0}}",
        f"Dialogue: 1,0:00:00.00,{ass_time(duration)},Shape,,0,0,0,,{{\\an7\\pos(0,0)\\p1\\c&H84E600&}}m 0 960 l 1920 960 l 1920 965 l 0 965{{\\p0}}",
        f"Dialogue: 1,0:00:00.00,{ass_time(duration)},Shape,,0,0,0,,{{\\an7\\pos(0,0)\\p1\\c&HFF5700&}}m 0 1073 l 1920 1073 l 1920 1080 l 0 1080{{\\p0}}",
    ]
    for caption in manifest.get("captions", []):
        start = ass_time(float(caption["start"]))
        end = ass_time(float(caption["end"]))
        raw_text = str(caption["text"])
        if raw_text.startswith("[") and "]" in raw_text:
            step, text = raw_text[1:].split("]", maxsplit=1)
        else:
            step, text = "", raw_text
        ass_lines.extend(
            [
                f"Dialogue: 2,{start},{end},Shape,,0,0,0,,{{\\an7\\pos(0,0)\\p1\\c&H84E600&}}m 88 986 l 176 986 l 176 1044 l 88 1044{{\\p0}}",
                f"Dialogue: 3,{start},{end},Step,,0,0,0,,{{\\pos(132,1015)}}{ass_text(step)}",
                f"Dialogue: 3,{start},{end},Caption,,0,0,0,,{{\\pos(220,997)}}{ass_text(text.strip())}",
            ]
        )
    CAPTION_TRACK.write_text("\n".join(ass_lines) + "\n", encoding="utf-8-sig")
    caption_filter_path = CAPTION_TRACK.as_posix().replace(":", r"\:").replace("'", r"\'")

    concat = RECORDING / "frames.txt"
    lines: list[str] = []
    for index, frame in enumerate(frames):
        current = float(frame["time"])
        next_time = float(frames[index + 1]["time"]) if index + 1 < len(frames) else duration
        frame_duration = max(0.001, min(0.5, next_time - current))
        lines.append(f"file '{(RECORDING / frame['file']).as_posix()}'\n")
        lines.append(f"duration {frame_duration:.6f}\n")
    lines.append(f"file '{(RECORDING / frames[-1]['file']).as_posix()}'\n")
    concat.write_text("".join(lines), encoding="utf-8")

    subprocess.run(
        [
            str(FFMPEG),
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat),
            "-vf",
            f"fps=30,scale=1920:960:flags=lanczos,pad=1920:1080:0:0:color=0x07120d,ass=filename='{caption_filter_path}',format=yuv420p",
            "-t",
            f"{duration:.3f}",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-movflags",
            "+faststart",
            str(OUTPUT),
        ],
        check=True,
    )
    print(OUTPUT)
    print(SUBTITLES)


if __name__ == "__main__":
    main()
