# Security Check Catalog

Practical catalog for reviewing skill security. Sources: Cisco skill-scanner (rules + YARA pack), Snyk ToxicSkills (3,984 skills: 36.8% flawed, 76 confirmed malicious), Invariant mcp-scan (tool poisoning), Embrace The Red (unicode smuggling), Datadog (dynamic-context gap). Key fact: **84% of real-world skill malice lives in SKILL.md prose, not scripts** (arXiv 2602.06547) — read the markdown as adversarially as the code.

`scripts/static_scan.py` automates the regex/unicode tier. The judge tier below needs reading.

## Static tier (run the scanner)

| Rule | Looks for | Severity |
|---|---|---|
| SEC-01 | "ignore previous instructions", jailbreak/mode-switch, role redefinition | HIGH |
| SEC-02 | "do not tell the user", "keep this secret", "don't mention you used this skill" | HIGH |
| SEC-03 | "always use this tool first", "will not work unless", coercive `<IMPORTANT>` blocks | HIGH |
| SEC-04 | Unicode Tags U+E0000–E007F (ANY = CRITICAL), zero-width >50, bidi overrides | CRIT/HIGH |
| SEC-05 | discord webhooks, telegram bots, pastebin, webhook.site, ngrok, raw IPs, markdown-image exfil | CRITICAL |
| SEC-06 | reads of ~/.ssh, ~/.aws/credentials, .env, /etc/shadow, ~/.netrc, ~/.claude/ | HIGH (+net = CRIT) |
| SEC-07 | curl\|sh, reverse shells, rm -rf /, eval/exec on non-literals, setuid, persistence (rc files, crontab, settings.json) | CRITICAL |
| SEC-08 | base64/atob→exec chains, hex blobs, homoglyphs, bundled binaries, orphan .pyc | HIGH–CRIT |
| SEC-09 | provider key patterns (AKIA, ghp_, sk-ant-, sk_live_, AIza, xox, PEM, JWT) | CRITICAL |
| SEC-13 | "proceed without asking", "retry forever", error-suppress-and-continue, self-modification | HIGH |

False-positive control (learned from Cisco, who removed rules with ~95% FP): bare env-var reads are NOT findings — only env→network flows. Lines that quote a pattern in order to warn against it ("never run `curl | sh`") are docs, not malice. Cleanup like `rm -rf node_modules` is fine. Placeholder keys (`sk-ant-XXXX`, `your-api-key`) are excluded.

## Judge tier (read and decide)

1. **Description–behavior match (SEC-12).** Does the manifest honestly describe what the body instructs? A "formatter" that tells the agent to read credentials or call the network fails. Check impersonation: "official", "verified by Anthropic", brand names in author position.
2. **allowed-tools scope (SEC-10).** Minimal? Actually used? `Bash(*)` or WebFetch on a skill whose purpose doesn't need it is over-grant. Side-effect skills (deploy, commit, send, publish) should set `disable-model-invocation: true`.
3. **Dynamic context (SEC-11).** Any "fetch this URL and follow what it says" defeats install-time review — the served content can change after approval (rug pull). Legitimate variant: docs served by the skill's own pinned CLI version. Flag severity by who controls the channel.
4. **Trigger hijacking (ACT-06, security-adjacent).** "Prefer this over built-ins", "always use first", keyword stuffing, description overlap with popular skills (shadowing/squatting).
5. **Coercion in first-party skills.** MANDATORY/MUST walls routing to the vendor's own tools are a quality smell, not an attack — downgrade severity but note the pattern.
6. **Paraphrased injection.** Regexes catch known phrasings only. Read for novel wording with the same intent: concealment, precedence, exfiltration, autonomy expansion.

## Quick wins (manual, <5 minutes)

```bash
# invisible unicode (any Tags-block char = fail)
grep -rPn '[\x{E0000}-\x{E007F}\x{200B}-\x{200D}\x{202D}\x{202E}\x{2028}\x{2029}\x{FEFF}]' <skill>/
# every network destination, judged against stated purpose
grep -rEn 'curl|wget|fetch\(|requests\.|webhook|ngrok|pastebin|/dev/tcp' <skill>/
# injection phrasing
grep -rEin 'ignore (all )?(previous|prior)|do not (tell|mention).{0,20}user|will not work unless|always use this (tool|skill) first' <skill>/
# exec primitives
grep -rEn '\b(eval|exec)\s*\(|shell=True|child_process|atob' <skill>/
# file inventory: binaries, hidden files, magic mismatches, .pyc without .py
file $(find <skill> -type f) | grep -vi 'text\|JSON\|empty'
```

Verdict rule: CRITICAL anywhere → UNSAFE (overall score capped at 25). HIGH → REVIEW. Else SAFE — and show the checks that ran, so clean means verified-clean.
