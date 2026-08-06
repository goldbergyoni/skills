# Pillar 4 — Security & Trust (SEC)

Severities: CRITICAL findings gate the overall score; HIGH → check scores 0; MEDIUM → ≤2.

- **SEC-01 instruction-override** (static): `ignore/disregard/forget previous|prior|system instructions`, mode-switch/jailbreak phrasing, role redefinition. HIGH.
- **SEC-02 concealment** (static): "do not tell/mention to the user", "keep this secret", "don't mention you used this skill". HIGH.
- **SEC-03 coercive-precedence** (static+judge): tool-poisoning language — "always use this tool first", "before executing any other tool", "will not work unless", `<IMPORTANT>` tags wrapping read/send/execute directives. HIGH.
- **SEC-04 invisible-unicode** (static): Unicode Tags block U+E0000–E007F (ANY occurrence = CRITICAL), zero-width chars beyond emoji-legit thresholds, bidi overrides U+202E/202D, variation-selector runs. CRITICAL/HIGH.
- **SEC-05 exfil-destinations** (static): discord webhooks, telegram bot API, pastebin, webhook.site, requestbin, ngrok, raw IPs; markdown-image exfil `![](https://…?data=…)`. CRITICAL.
- **SEC-06 sensitive-file-access** (static): reads of `~/.ssh`, `~/.aws/credentials`, `.env`, `/etc/shadow|passwd`, `~/.netrc`, browser profiles, `~/.claude/`. HIGH; CRITICAL when paired with any network call.
- **SEC-07 dangerous-commands** (static): `curl|wget … | sh`, reverse shells (`/dev/tcp/`, `nc -e`), `rm -rf /|~|$HOME` (exclude node_modules/cache cleanup), `eval`/`exec` on non-literals, `shell=True` with interpolation, chmod 777/setuid, sudo system mods, persistence (crontab, rc files, LaunchAgents, editing `~/.claude/settings.json`). CRITICAL.
- **SEC-08 obfuscation** (static): base64/atob within ~140 chars of eval/exec/system, large hex blobs, XOR-decode context, homoglyphs in identifiers, bundled binaries, `.pyc` without source. HIGH–CRITICAL.
- **SEC-09 secrets** (static): provider key patterns (AKIA…, ghp_…, sk-ant-…, sk_live_…, AIza…, xox[bp]-, PEM blocks, JWTs), connection strings with credentials. CRITICAL (placeholder/example values excluded).
- **SEC-10 tool-scope** (static+judge): `allowed-tools` minimal and actually used; no wildcard Bash for skills that don't need it; side-effect skills (deploy/commit/send) should set `disable-model-invocation: true`. MEDIUM–HIGH.
- **SEC-11 dynamic-context** (static+judge): instructions to fetch a URL and follow/execute its content at runtime — defeats install-time review entirely. Pattern is legitimate for version-synced docs (CLI-served help) but must be flagged and the fetched channel assessed. HIGH; MEDIUM when the source is the skill's own pinned tooling.
- **SEC-12 manifest-honesty** (judge): description matches actual behavior; "read-only" skills with write/network instructions fail; no "official/verified by Anthropic" claims. MEDIUM–HIGH.
- **SEC-13 autonomy** (static): "don't ask the user for confirmation", "proceed without asking", unbounded retries, error-suppression-and-continue, self-modification of skill files. HIGH.
