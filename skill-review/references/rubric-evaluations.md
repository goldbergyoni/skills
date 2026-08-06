# Pillar 6 — Evaluations (EVL)

Gate: if EVL-01 fails (no evals present), EVL-02 through EVL-08 score 0 automatically — a skill with no evals cannot earn partial credit on eval quality.

- **EVL-01 evals-exist** (static): an `evals/` directory or eval config file (`evals.json`, `promptfooconfig.yaml`, `*.eval.*`) exists with at least one test case. Severity HIGH if absent.
- **EVL-02 trigger-evals** (judge): trigger (activation) evals are present — test cases that verify the skill fires on should-trigger prompts AND stays silent on should-NOT-trigger prompts. Both polarities required; a trigger suite with only positives scores ≤2.
- **EVL-03 functional-evals** (judge): functional (outcome) evals are present — test cases that run the skill end-to-end and assert on the quality or correctness of the output, not just whether the skill activated.
- **EVL-04 token-cost-evals** (judge): at least one eval tracks a resource metric — token count, latency, or cost — as a scored dimension or threshold, not just a log line.
- **EVL-05 discriminating-cases** (judge): test cases are non-trivial — a clearly broken or uninstalled version of the skill would fail them. Cases that pass regardless of whether the skill is present (e.g. "what is 2+2" for a math skill) score 0; cases that test the specific value the skill adds score 4.
- **EVL-06 adversarial-negatives** (judge): should-NOT-trigger cases are near-misses that share surface vocabulary with should-trigger cases, not obvious off-topic prompts. "Write a fibonacci function" is not a useful negative for a PDF skill; "I have a PDF I want to read out loud" is.
- **EVL-07 implicit-triggers** (judge): trigger evals include implicit invocations — prompts that describe a task without naming the skill, tool, or format — not just explicit mentions. A trigger suite with only "use X to do Y" prompts scores ≤2; one that includes "I need a printable handout for tomorrow's meeting" (implicit) alongside "create a PDF report" (explicit) scores 4.
- **EVL-08 substantive-prompts** (judge): eval prompts resemble real user input — multi-detail, with file paths or project context, casual phrasing, and occasional ambiguity. A suite of one-liner prompts ("convert PDF to CSV") scores ≤2; prompts that include at least two concrete facts (a path/name AND a context detail) score 4.
