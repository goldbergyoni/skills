---
name: spoon
description: A key user utility that gives answers the way the user expects. Load it whenever a message mentions `spoon` or `sp`. Such messages may carry tokens that set dosing (length), format, enhancers and verification (e.g. `sp 1m`, `sp ver`).
argument-hint: "dose: {n}s {n}p {n}m | verify: ver ver1/thoughtful/tho ver2/sampling/sam ver3/consensus/con | enhance: cr/crystal lay qu in out da/data | format: bul art html | util: tips/cheatsheet sticky on|off"
metadata:
  version: "2.2.0"
  author: Yoni Goldberg
  updated: "2026-11-07"
---

# Spoon

Spoon is how the user shapes every answer. Short tokens like `sp 1m` or `sp ver` set the **dose** (how long), **verification** (how carefully the answer is checked), **enhancers** (how it is explained: crystal clear, for a layman, with data), **formats** (bullets, artifact) and **utilities** (quick start, sticky arguments). Dosing is explained here. Each other area has its own file, read only when needed.

Every response ends with 🥄 as its very last line. Never start a response with 🥄.


## Arguments

Arguments are standalone tokens right after `spoon` or its shortcut `sp`. Tokens combine (`sp 1m ver bul`)

## Dosing

Dosing tokens set how long the answer should be. For example, `sp 1m` means the response should take no longer than 1 minute to read. `{n}` is any number.

- `{n}s` — this many sentences (not seconds). `10s` = 10 sentences.
- `{n}p` — this many short paragraphs.
- `{n}m` — about this many minutes to read. 1m ≈ 200 words.

Stick to the dose: no intro, no hedge, nothing beyond it. Only the 🥄 line and ⚠️ warnings are extra. Enhancers and verification must fit inside it.

## Other areas

When any token below appears, you must read its area's file before answering: the instructions for that token live only there. Read nothing otherwise.

**Verification** — `references/verification.md`
- `ver` — pick the level yourself
- `ver1` / `thoughtful` / `tho` — care and sources, no subagents
- `ver2` / `sampling` / `sam` — subagents check key claims
- `ver3` / `consensus` / `con` — two models must agree 🤼

**Enhancers** — `references/enhancers.md`
- `cr` / `crystal` — crystal clear, via subagents
- `lay` — explain to a layman
- `qu` — ask me a question first
- `in` / `out` — more / less detail
- `da` / `data` — back it with verified data

**Formats** — `references/formats.md`
- `bul` — a few bullets with bold titles
- `art` — an artifact
- `html` — an HTML artifact

**Utilities** — `references/utilities.md`
- `tips` / `cheatsheet` — quick start
- `sticky on|off` — keep the arguments for the session

## Footer

If arguments were used, write their full meaning after the 🥄, not the tokens. Put nothing after this line. Examples:

- `1m` → `🥄 1 minute read`
- `5s out` → `🥄 5 sentences, zoomed out`
- `html sticky on` → `🥄 HTML artifact, sticky`
- `1m cr da` → `🥄 1 minute read, crystal clear, with data`
- `ver` (picked sampling) → `🥄 verified: sampling`
- `2p ver3` → `🥄 2 paragraphs, verified: consensus 🤼`
- `bul lay` → `🥄 bullets, for a layman`
