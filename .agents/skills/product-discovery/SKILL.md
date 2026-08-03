---
name: product-discovery
description: >-
  Analyze normalized vformjs ecosystem signals into evidence-backed Opportunity
  candidates. Use for proactive product discovery, horizon scanning, competitor
  issue clustering, compatibility risks, and deciding what to experiment with
  before a Requirement exists. Never implement features or treat AI hypotheses
  as demand.
disable-model-invocation: true
---

# vformjs product discovery

## Input

The caller supplies a normalized `signals.json` path. If the path is missing, stop and request it; do not browse randomly as a substitute.

Read:

1. the supplied signal bundle;
2. `.agent-engineering/discovery.config.json`;
3. `.agent-engineering/schemas/opportunity-report.schema.json`;
4. `.agent-engineering/prompts/product-discovery.md`.

## Boundary

vformjs keeps host UI Forms in charge of rendering and field validation. It owns typed CRUD lifecycle state: create/edit/detail, reset baselines, dirty/changed paths, submit results, linkage, dynamic arrays, and API errors.

Reject candidates that would make vformjs:

- render inputs or become a schema/visual form builder;
- run a second field-validation engine beside the host Form;
- copy a competitor feature without a concrete CRUD-lifecycle outcome.

## Workflow

1. Validate that sources are distinct and current enough for the configured lookback.
2. Cluster signals by user workflow, not by library name.
3. Separate adoption, compatibility, correctness, performance, documentation, and strategic-horizon signals.
4. Write a falsifiable hypothesis for each credible cluster.
5. Find the strongest alternative explanation and evidence against the hypothesis.
6. Score the candidate using the configured dimensions and evidence-based confidence.
7. Design the smallest isolated experiment. It may be a reproduction, benchmark, compatibility canary, docs smoke, API sketch, or research Discussion.
8. Define observable success and kill criteria before recommending work.
9. Apply human-attention policy. Discovery can run unattended; product bets and R2/R3 promotions cannot silently pass.
10. Return only the required JSON object.

## Evidence rules

- A package download count is weak adoption evidence because CI and repeated installs contribute.
- One external Issue is a lead, not market validation.
- Several independent repositories or Issues strengthen confidence.
- A real user reproduction or failed adoption is stronger than popularity metrics.
- Upstream roadmaps justify compatibility canaries, not speculative feature work.
- Existing vformjs capability may turn a signal into a documentation or positioning experiment rather than a new API.

## Prohibited actions

Do not edit product code, tests, documentation, Issues, Discussions, policy, or release configuration. Do not contact upstream users. Do not output an implementation plan. A validated Opportunity must still enter the Requirement workflow.
