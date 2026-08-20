from pathlib import Path
import subprocess

subprocess.check_call(["git", "show", "faa70c8:src/styles.css"], stdout=open("src/styles.css", "w"))
p = Path("src/styles.css")
text = p.read_text()
text = text.replace(
    "width: min(27.4rem, 118%);",
    "width: min(27.4rem, 100%);\n  max-width: 100%;",
    1,
)
replacements = [
(
""".ray-nudge {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 0.85rem;
  overflow: visible;
}""",
""".ray-nudge {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 0.85rem;
  overflow: hidden;
}""",
),
(
""".ray-card {
  border: 2px solid color-mix(in oklab, var(--color-sun-deep) 36%, transparent);
  border-bottom-width: 5px;
  border-radius: 22px;
  padding: 1rem 1rem 1.15rem;
  background:
    linear-gradient(180deg, #fffdf6 0%, #fff4c8 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    0 3px 0 rgba(59, 42, 20, 0.06);
}""",
""".ray-card {
  border: 2px solid color-mix(in oklab, var(--color-sun-deep) 36%, transparent);
  border-bottom-width: 5px;
  border-radius: 22px;
  padding: 1rem 1rem 1.15rem;
  background:
    linear-gradient(180deg, #fffdf6 0%, #fff4c8 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    0 3px 0 rgba(59, 42, 20, 0.06);
  overflow: hidden;
  min-width: 0;
}""",
),
(
""".help-paper {
  position: relative;
  isolation: isolate;
  border: 2px solid rgba(59, 42, 20, 0.13);
  border-bottom-width: 5px;
  border-radius: 22px;
  background-color: #fffdf6;
  background-image: linear-gradient(180deg, #ffffff 0%, #fffdf6 40%, #fff6dc 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.88),
    0 3px 0 rgba(59, 42, 20, 0.06);
}""",
""".help-paper {
  position: relative;
  isolation: isolate;
  min-width: 0;
  border: 2px solid rgba(59, 42, 20, 0.13);
  border-bottom-width: 5px;
  border-radius: 22px;
  background-color: #fffdf6;
  background-image: linear-gradient(180deg, #ffffff 0%, #fffdf6 40%, #fff6dc 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.88),
    0 3px 0 rgba(59, 42, 20, 0.06);
}""",
),
]
for old, new in replacements:
    if old not in text:
        raise SystemExit(f"block missing: {old[:40]!r}")
    text = text.replace(old, new, 1)
if "118%" in text:
    raise SystemExit("118% still present")
p.write_text(text)
print("ok", p.stat().st_size)
