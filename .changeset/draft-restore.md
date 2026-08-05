---
"@vformjs/core": minor
"@vformjs/vue": minor
---

Add draft persistence contracts: `snapshotDraft()` captures a versioned, JSON-serializable snapshot, and `restoreDraft()` heals or rejects drafts against the current baseline shape with a structured `DraftRestoreResult` (`restored` / `healed` / `fresh` + `droppedPaths` / `filledPaths`) instead of throwing or silently corrupting state. Restore never rebases, so `dirty` / `changedPaths` keep reflecting the restored draft as unsaved input.
