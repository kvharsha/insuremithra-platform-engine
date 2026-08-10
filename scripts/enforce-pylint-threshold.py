import re, sys, pathlib
report = pathlib.Path(sys.argv[1]).read_text()
gate = float(sys.argv[2])
m = re.search(r'Your code has been rated at ([\d\.]+)/10', report)
score = float(m.group(1)) if m else 0.0
print(f"pylint score: {score}/10 (gate {gate}/10)")
sys.exit(0 if score >= gate else 1)
