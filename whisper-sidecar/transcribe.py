"""
Faster-whisper transcription sidecar.
Called by the Electron main process as a child process.
Outputs progress lines and a JSON result to stdout.

Usage:
  python transcribe.py --audio meeting.wav --model small --device cpu --compute-type int8
"""

import argparse
import json
import sys
import os


def main():
    parser = argparse.ArgumentParser(description="Transcribe audio with faster-whisper")
    parser.add_argument("--audio", required=True, help="Path to audio file")
    parser.add_argument("--model", default="small", help="Whisper model size")
    parser.add_argument("--device", default="cpu", help="Device: cpu or cuda")
    parser.add_argument("--compute-type", default="int8", help="Compute type: int8, float16, float32")
    parser.add_argument("--language", default=None, help="Language code (e.g., en). Auto-detect if not set.")
    args = parser.parse_args()

    if not os.path.exists(args.audio):
        print(f"Error: Audio file not found: {args.audio}", file=sys.stderr)
        sys.exit(1)

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("Error: faster-whisper is not installed. Run: pip install faster-whisper", file=sys.stderr)
        sys.exit(1)

    # Load model
    print("PROGRESS:5:Loading model...", flush=True)
    model = WhisperModel(args.model, device=args.device, compute_type=args.compute_type)

    # Transcribe
    print("PROGRESS:10:Starting transcription...", flush=True)
    segments_iter, info = model.transcribe(
        args.audio,
        language=args.language,
        beam_size=5,
        vad_filter=True,
        vad_parameters=dict(
            min_silence_duration_ms=500,
            speech_pad_ms=200,
        ),
    )

    duration = info.duration
    segments = []

    for segment in segments_iter:
        # Calculate progress based on timestamp vs total duration
        if duration > 0:
            pct = min(95, int(10 + (segment.end / duration) * 85))
        else:
            pct = 50

        segments.append({
            "start": round(segment.start, 2),
            "end": round(segment.end, 2),
            "text": segment.text.strip(),
            "confidence": round(segment.avg_log_prob, 3) if hasattr(segment, "avg_log_prob") else None,
        })

        # Send progress with latest text
        preview = segment.text.strip()[:80]
        print(f"PROGRESS:{pct}:{preview}", flush=True)

    # Output final result
    result = {
        "segments": segments,
        "language": info.language,
        "duration": round(duration, 2),
    }

    print("PROGRESS:100:Transcription complete", flush=True)
    print(f"RESULT:{json.dumps(result)}", flush=True)


if __name__ == "__main__":
    main()
