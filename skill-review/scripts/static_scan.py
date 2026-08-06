#!/usr/bin/env python3
"""Quick-win static scanner for agent skills (SKILL.md + bundled files).

Implements the statically-detectable checks from references/rubric.md and
references/security-checks.md. Stdlib only. Usage:

    python3 static_scan.py <skill-dir-or-SKILL.md> [--json]

Exit codes: 0 = no HIGH/CRITICAL, 1 = CRITICAL present, 2 = HIGH present.
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

# ---------------------------------------------------------------- patterns
SEC_PATTERNS = [
    # (rule_id, severity, regex, description)
    ("SEC-01-override", "HIGH",
     r"(?i)(ignore|disregard|forget|bypass)\s+(all\s+)?(previous|prior|earlier|above|your|system)\s+(instructions|rules|prompts|guidelines|constraints)",
     "Instruction-override (prompt injection)"),
    ("SEC-01-jailbreak", "HIGH",
     r"(?i)you are now in (unrestricted|debug|developer|admin|god|jailbreak) mode|disable (safety|security|content|ethical) (filters|checks|guidelines)",
     "Mode-switch / jailbreak phrasing"),
    ("SEC-02-concealment", "HIGH",
     r"(?i)do not (tell|inform|mention|notify) (the )?user|keep this (secret|hidden)|don'?t mention (that )?you used",
     "Concealment from user"),
    ("SEC-03-coercion", "HIGH",
     r"(?i)always use this (tool|skill) (first|immediately)|before (executing|using) any other (tool|skill)|(tool|skill) will not work unless",
     "Coercive precedence / tool poisoning"),
    ("SEC-05-exfil-dest", "CRITICAL",
     r"(?i)discord\.com/api/webhooks|telegram\.org/bot|pastebin\.com|webhook\.site|requestbin|ngrok\.io|pipedream\.net",
     "Known exfiltration destination"),
    ("SEC-05-md-image-exfil", "HIGH",
     r"!\[[^\]]*\]\(https?://[^)]*[?&][a-z_]*=(\{\{|\$)",
     "Markdown-image data exfiltration"),
    ("SEC-06-sensitive-files", "HIGH",
     r"(?i)(~|\$HOME|/home/\w+|/Users/\w+)?/?\.(ssh/id_|aws/credentials|netrc|pgpass|gnupg)|/etc/(shadow|sudoers)\b",
     "Sensitive credential file access"),
    ("SEC-07-curl-pipe-sh", "CRITICAL",
     r"(curl|wget)[^\n|]*\|\s*(ba|z)?sh\b|iwr [^\n|]*\|\s*iex",
     "Remote script piped to shell"),
    ("SEC-07-reverse-shell", "CRITICAL",
     r"/dev/tcp/\d|nc (-\w+ )*-e /bin/|socat [^\n]*exec",
     "Reverse shell"),
    ("SEC-07-destructive", "CRITICAL",
     r"rm -rf +(/|~|\$HOME|/etc|/home|/root|/usr)(\s|$)|dd if=/dev/zero of=/|mkfs\.|wipefs",
     "Destructive filesystem operation"),
    ("SEC-07-priv-esc", "CRITICAL",
     r"chmod (777|4755|u\+s)\s+/|chown root|sudo (usermod|sh -c)|>>?\s*/etc/(passwd|shadow|sudoers)",
     "Privilege escalation / system modification"),
    ("SEC-07-persistence", "HIGH",
     r"(?i)crontab -|>>?\s*~/\.(bashrc|zshrc|profile)|LaunchAgents|~/\.claude/settings\.json",
     "Persistence mechanism"),
    ("SEC-08-b64-exec", "HIGH",
     r"(b64decode|atob|base64 (-d|--decode))[\s\S]{0,140}(eval|exec|os\.system|subprocess|sh\b)|"
     r"(eval|exec)[\s\S]{0,140}(b64decode|atob\()",
     "Base64-decode chained to execution"),
    ("SEC-09-secrets", "CRITICAL",
     r"AKIA[A-Z0-9]{16}|ghp_[A-Za-z0-9]{36}|sk_live_[A-Za-z0-9]{20}|sk-ant-api\d{2}-|AIza[\w-]{35}|xox[bp]-\d|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----",
     "Hardcoded credential"),
    ("SEC-13-autonomy", "HIGH",
     r"(?i)(don'?t|do not|without) ask(ing)? (the )?user (for )?(confirmation|permission)|proceed without asking|retry (indefinitely|forever)|ignore (the )?user'?s? (decision|input|choice)",
     "Autonomy abuse"),
]

QUALITY_PATTERNS = [
    ("ACT-04-first-person", "WARN", r"(?i)^description:.*\b(I can|I will|I help|you can use)\b",
     "Description not in third person"),
]

INVISIBLE_RANGES = [
    (0xE0000, 0xE007F, "CRITICAL", "Unicode Tags block (ASCII smuggling)"),
    (0x202D, 0x202E, "HIGH", "Bidi override"),
    (0x2028, 0x2029, "MEDIUM", "Invisible line/paragraph separator"),
]
ZERO_WIDTH = {0x200B, 0x200C, 0x200D, 0xFEFF}

EXFIL_CONTEXT = re.compile(r"(?i)curl|wget|requests\.|fetch\(|httpx|urllib")


def parse_frontmatter(text):
    m = re.match(r"\A---\s*\n(.*?)\n---\s*\n?", text, re.DOTALL)
    if not m:
        return {}, text
    fm, body = {}, text[m.end():]
    key = None
    for line in m.group(1).splitlines():
        km = re.match(r"^([A-Za-z_-]+):\s*(.*)$", line)
        if km:
            key = km.group(1)
            fm[key] = km.group(2).strip().strip("\"'")
        elif key and line.startswith(" "):
            fm[key] += " " + line.strip()
    return fm, body


def scan_text(path, text, findings):
    for rule_id, sev, pattern, desc in SEC_PATTERNS:
        for m in re.finditer(pattern, text):
            line_no = text[: m.start()].count("\n") + 1
            line = text.splitlines()[line_no - 1].strip()[:160]
            # negation context: skip lines that quote the pattern as a warning
            if re.search(r"(?i)never|don'?t|avoid|warning|example of|detect", line) and "SEC-0" not in line:
                sev_adj = "INFO"
            else:
                sev_adj = sev
            findings.append({"rule": rule_id, "severity": sev_adj, "file": str(path),
                             "line": line_no, "evidence": line, "desc": desc})
    # invisible unicode
    counts = {}
    for i, ch in enumerate(text):
        cp = ord(ch)
        for lo, hi, sev, desc in INVISIBLE_RANGES:
            if lo <= cp <= hi:
                counts.setdefault((sev, desc), []).append(i)
        if cp in ZERO_WIDTH:
            counts.setdefault(("ZW", "Zero-width character"), []).append(i)
    for (sev, desc), idxs in counts.items():
        if sev == "ZW":
            sev = "HIGH" if len(idxs) > 50 else "INFO"
        findings.append({"rule": "SEC-04-invisible", "severity": sev, "file": str(path),
                         "line": text[: idxs[0]].count("\n") + 1,
                         "evidence": f"{len(idxs)} occurrence(s), first at offset {idxs[0]}", "desc": desc})


def check_frontmatter(fm, body, path, findings, checks):
    name = fm.get("name", "")
    desc = fm.get("description", "")
    ok = True
    if not name:
        ok = False
        checks.append({"id": "ACT-01", "result": "fail", "note": "missing name"})
    elif len(name) > 64 or not re.fullmatch(r"[a-z0-9-]+", name):
        ok = False
        checks.append({"id": "ACT-01", "result": "fail", "note": f"invalid name: {name!r}"})
    if not desc:
        ok = False
        checks.append({"id": "ACT-01", "result": "fail", "note": "missing description"})
    elif len(desc) > 1024:
        checks.append({"id": "ACT-01", "result": "warn", "note": f"description {len(desc)} chars (>1024)"})
    if re.search(r"<[a-zA-Z]+>", name + desc):
        checks.append({"id": "ACT-01", "result": "fail", "note": "XML tags in frontmatter"})
    if ok and not any(c["id"] == "ACT-01" for c in checks):
        checks.append({"id": "ACT-01", "result": "pass", "note": ""})
    if desc and len(desc) > 1536:
        checks.append({"id": "ACT-08", "result": "warn",
                       "note": f"description {len(desc)} chars — truncated in skill listing at 1536"})
    if re.search(r"(?i)\b(I can|I will|you can use)\b", desc):
        checks.append({"id": "ACT-04", "result": "fail", "note": "first/second person in description"})
    lines = body.count("\n") + 1
    checks.append({"id": "STR-01", "result": "pass" if lines < 500 else ("warn" if lines <= 800 else "fail"),
                   "note": f"body {lines} lines"})


def check_evals_exist(target, checks):
    if target.is_file():
        target = target.parent
    evals_dir = target / "evals"
    has_evals = evals_dir.is_dir() and any(evals_dir.iterdir())
    if not has_evals:
        has_evals = any(target.glob("evals.json")) or any(target.glob("promptfooconfig.yaml")) or any(
            p for p in target.iterdir() if p.is_file() and ".eval." in p.name)
    checks.append({"id": "EVL-01", "result": "pass" if has_evals else "fail",
                   "note": "evals directory or eval config found" if has_evals else "no evals found"})
    return has_evals


def scan(target):
    target = Path(target)
    files = [target] if target.is_file() else sorted(
        p for p in target.rglob("*") if p.is_file() and p.suffix in
        {".md", ".txt", ".py", ".sh", ".js", ".ts", ".json", ".yaml", ".yml", ""} and p.stat().st_size < 2_000_000)
    findings, checks, stats = [], [], {}
    for f in files:
        try:
            text = f.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        scan_text(f, text, findings)
        if f.name == "SKILL.md" or (target.is_file() and f == target):
            fm, body = parse_frontmatter(text)
            check_frontmatter(fm, body, f, findings, checks)
            stats = {"body_lines": body.count("\n") + 1, "body_words": len(body.split()),
                     "desc_chars": len(fm.get("description", "")),
                     "desc_words": len(fm.get("description", "").split()),
                     "est_skillmd_tokens": int(len(text.split()) * 1.35),
                     "allowed_tools": fm.get("allowed-tools", "")}
    check_evals_exist(target, checks)
    sevs = [f["severity"] for f in findings]
    verdict = ("UNSAFE" if "CRITICAL" in sevs else "REVIEW" if "HIGH" in sevs else "SAFE")
    return {"target": str(target), "verdict": verdict, "stats": stats,
            "findings": findings, "checks": checks,
            "severity_counts": {s: sevs.count(s) for s in ("CRITICAL", "HIGH", "MEDIUM", "INFO") if s in sevs}}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    result = scan(sys.argv[1])
    print(json.dumps(result, indent=2))
    sys.exit(1 if result["verdict"] == "UNSAFE" else 2 if result["verdict"] == "REVIEW" else 0)
