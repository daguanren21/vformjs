---
"vformjs": patch
---

Fix migrate precision: deduplicate sfc-parse-failed to one issue per malformed SFC (Vue compiler cascades duplicate errors), and skip minified vendor bundles so they never appear in the manual review queue.
