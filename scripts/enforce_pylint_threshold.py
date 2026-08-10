"""Exit with non-zero if pylint score is below a gate.

Usage: python scripts/enforce_pylint_threshold.py <pylint-report-file> <gate>
The pylint report file should include the "Your code has been rated at X/10" line.
"""
from __future__ import annotations

import pathlib
import re
import sys


def parse_score(report_text: str) -> float:
    """Return the pylint score parsed from report_text or 0.0 if not found."""
    match = re.search(r"Your code has been rated at ([\d\.]+)/10", report_text)
    if not match:
        return 0.0
    try:
        return float(match.group(1))
    except (ValueError, TypeError):
        return 0.0


def main(argv: list[str] | None = None) -> int:
    """CLI entry point. Returns 0 when score >= gate, otherwise 1."""
    if argv is None:
        argv = sys.argv[1:]

    if len(argv) < 2:
        print("Usage: <pylint-report-file> <gate>")
        return 2

    report_path = pathlib.Path(argv[0])
    try:
        report_text = report_path.read_text(encoding="utf-8")
    except OSError as exc:
        print(f"Failed to read report file '{report_path}': {exc}")
        return 3

    try:
        gate = float(argv[1])
    except ValueError:
        print(f"Invalid gate value: {argv[1]}")
        return 2

    score = parse_score(report_text)
    print(f"pylint score: {score}/10 (gate {gate}/10)")
    return 0 if score >= gate else 1


if __name__ == "__main__":
    raise SystemExit(main())
