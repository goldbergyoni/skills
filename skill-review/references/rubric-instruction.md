# Pillar 2 — Instruction Quality (INS)

- **INS-01 imperative-voice** (judge): verb-first directives ("Run X"), not narration ("You should run X"). Estimate imperative-sentence ratio.
- **INS-02 actionability** (judge): instructions are executable as written; no vague guidance the model must reinterpret.
- **INS-03 workflow-steps** (judge): complex tasks broken into sequential steps with decision points; copy-paste checklists where multi-step.
- **INS-04 examples** (judge): concrete input/output or before/after examples present; compressed, not narrative.
- **INS-05 output-format** (judge): expected output/template specified where the skill produces artifacts.
- **INS-06 exit-criteria** (judge): completion conditions defined; no unbounded iteration; validator-loop pattern ("fix → re-run → only proceed when passing") where applicable.
- **INS-07 consistency** (judge): one term per concept; no contradictions or ambiguity; a recommended default with escape hatch rather than a menu of options.
- **INS-08 freedom-calibration** (judge): degrees of freedom match task fragility — heuristics for robust tasks, exact commands for fragile ones; no over-constraining MUST/MANDATORY walls for tasks that tolerate variation, no vague prose for fragile operations.
- **INS-09 error-recovery** (judge): gotchas and failure paths documented (and not hollow); recovery instructions present.
