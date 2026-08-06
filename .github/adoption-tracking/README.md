# CLI Adoption Tracking

**Baseline:** 2026-08-06

## Current Status

| Signal | Status | Current | Target | Notes |
|---|---|---|---|---|
| External `.vformjs.json` | ⏳ | 0 | ≥1 | Primary milestone |
| CLI/adapter downloads | ✅ | 34.6% | ≥10% | **Already met!** |
| Success feedback issues | ⏳ | 0 | ≥2 | User reports |

## Weekly Reports

Automated tracking runs every Monday at 09:00 UTC via [track-adoption workflow](../.github/workflows/track-adoption.yml).

Reports are saved to `.github/adoption-tracking/YYYY-MM-DD.txt`.

## How to Run Manually

```bash
node packages/cli/scripts/track-adoption.mjs
```

Requires:
- `gh` CLI authenticated
- `node` 18+
- Internet access for npm API

## Interpretation

### ✅ CLI downloads ≥10% of adapter

This threshold was met on the first measurement (34.6%). It suggests:
- Users are discovering the CLI commands
- Likely running read-only commands (`audit`, `doctor`)
- May be testing `init --dry-run`

### ⏳ Waiting for external `.vformjs.json`

GitHub Code Search looks for:
```
filename:.vformjs.json -repo:daguanren21/vformjs
```

When the first one appears, we'll know someone has:
1. Run `vformjs init`
2. Committed the result
3. Pushed to a public repo

### ⏳ Waiting for integration feedback

Users can report via:
```bash
gh issue create --repo daguanren21/vformjs \
  --title "Integration feedback: [Project Name]" \
  --label "integration-feedback" \
  --body "Adopted vformjs in [describe project]..."
```

## Decision Gates (from validation summary)

**Continue CLI investment IF:**
- ≥3 external projects run `vformjs init` (verifiable via GitHub)
- OR CLI downloads ≥10% of adapter downloads ← **Already met**
- OR ≥2 integration-feedback issues report successful adoption

**Current verdict:** Continue. One gate already passed.

**Review after:** 2 releases (check if other gates are met).
