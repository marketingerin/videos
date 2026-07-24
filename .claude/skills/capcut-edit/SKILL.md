---
name: capcut-edit
description: Automates video editing directly in CapCut Desktop — generates a CapCut project (draft) from video/audio/subtitle files via the pycapcut library, launches CapCut Desktop, and (on Windows, once calibrated) drives the app's UI to open the generated project and export the final video, since CapCut has no public API. Use this skill whenever the user asks to automate CapCut, batch-create or batch-edit videos in CapCut, generate a CapCut project/draft programmatically, or wants a video "ready in CapCut" / auto-exported from CapCut without manually opening the app themselves — even if they just say "edit this in CapCut" or "make a CapCut video from these clips."
---

# CapCut Desktop Automation

CapCut has no public API. This skill automates it in two layers that build on each other:

1. **Draft generation (reliable, cross-platform)** — build the actual CapCut project file
   programmatically with the `pycapcut` library, so CapCut opens a real, editable timeline
   instead of a plain export.
2. **App control (Windows only, needs one-time calibration)** — drive CapCut Desktop's UI
   with simulated clicks to open that project and export it, since there's nothing to call
   an API on.

Layer 1 always works. Layer 2 is inherently more fragile (screen-coordinate automation) and
only run it when the user is on Windows and has calibrated it — see "When to use each layer"
below. Never silently skip a layer or claim success on a step that didn't actually run.

## Step 1: Generate the draft

Use the project's existing script, `scripts/generate_draft.py` (repo root, not this skill's
folder), which wraps `pycapcut`. Read that file before calling it — it takes `--draft-folder`,
`--name`, `--video`, and optional `--audio`/`--srt`. It already handles the Mac/Windows draft
filename difference (`draft_content.json` vs `draft_info.json`).

```bash
python scripts/generate_draft.py --draft-folder "<capcut drafts folder>" --name <project_name> --video <path> [--audio <path>] [--srt <path>]
```

Ask the user for the video/audio/subtitle paths and a project name if they haven't given them.
The draft folder default locations are:
- Windows: `%LOCALAPPDATA%\CapCut\User Data\Projects\com.lveditor.draft`
- Mac: `~/Movies/CapCut/User Data/Projects/com.lveditor.draft`

If this step fails, stop and report the error — do not proceed to launching/automating CapCut
against a draft that wasn't actually created.

## Step 2: Launch CapCut Desktop

Run `scripts/launch_capcut.py` (this skill's folder). It finds and starts the CapCut executable
on Windows or macOS. CapCut scans its drafts folder on startup, so the new project will appear
in "My projects" — this alone is often enough for the user to take it from there manually.

```bash
python .claude/skills/capcut-edit/scripts/launch_capcut.py
```

If CapCut is already running, relaunching just brings it to focus (or the script reports that
it's already open) — that's fine, no need to close it first.

## Step 3 (Windows only): drive CapCut's UI to open + export

Requires `pyautogui` on the Windows machine (`pip install pyautogui`) — not part of the
project's main `requirements.txt` since it's only needed for this optional, Windows-only layer.

Only attempt this if:
- The user is running on Windows (not this sandbox — GUI automation needs a real display and
  mouse/keyboard, which isn't available in a remote/headless session), **and**
- A calibration file already exists at the path the user tells you (see
  `references/gui-automation.md` for how calibration works and where it's normally saved), **and**
- The user has actually asked for the open+export to happen automatically, not just for the
  draft to be generated.

If any of those aren't true, stop after Step 2 and tell the user to open/export manually, or to
run the calibration step themselves first (`.claude/skills/capcut-edit/scripts/calibrate_windows.py`) —
don't guess at coordinates or invent a calibration file.

When calibration exists, run:

```bash
python .claude/skills/capcut-edit/scripts/automate_windows.py --config <calibration.json> --export-wait <seconds>
```

This clicks through: open the most-recently-modified project (the one just generated, since
CapCut sorts by recency) → export → confirm → close, waiting `--export-wait` seconds in between
(there's no API to detect when export actually finishes — see the reference doc). Use
`--dry-run` first to preview the coordinates it would click without actually clicking. Read
`references/gui-automation.md` before running this the first time for a user — it explains why
this is fragile (resolution/DPI/window-position dependent), what can go wrong, and how to help
the user recalibrate.

## When to use each layer

| User's situation | What to do |
|---|---|
| Wants a CapCut project ready to edit, will open/export manually | Step 1 + Step 2 |
| On Windows, already calibrated | Step 1 + Step 2 + Step 3 |
| On Windows, not calibrated yet, wants full automation | Step 1 + Step 2, then walk them through `.claude/skills/capcut-edit/scripts/calibrate_windows.py` (interactive — needs to run on their machine, in their own terminal, not on your behalf) |
| On Mac, wants full automation | Explain Step 3 requires Windows (CapCut has no accessibility-API-friendly automation path on Mac in this skill); offer draft generation + manual export, or a Windows VM as the path to full automation |

## Being honest about reliability

Layer 2 is screen-coordinate clicking, not a real API — it breaks if CapCut's window moves,
resizes, gets a UI update, or if the project list order isn't what's expected. Never present a
Step 3 run as more certain than it is: report exactly what ran, ask the user to confirm the
export actually happened (check the output file), and point them at
`references/gui-automation.md`'s troubleshooting section if something looks off.
