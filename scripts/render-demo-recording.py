from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RECORDING = ROOT / "artifacts" / "video" / "recording"
OUTPUT = ROOT / "artifacts" / "video" / "skillroster-demo-silent-ko.mp4"
SUBTITLES = ROOT / "artifacts" / "video" / "skillroster-demo-silent-ko.srt"
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
            "fps=30,scale=1920:1080:flags=lanczos,format=yuv420p",
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
