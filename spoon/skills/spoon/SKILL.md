---
name: spoon
description: A key user utility that gives answers the way the user expects. Foundational — load it at the start of every session and for any reply with text. Messages may carry tokens that set dosing (length), format, enhancers and verification, often after `sp` (e.g. `sp 1m`, `sp ver`).
argument-hint: "dose: {n}s {n}p {n}m | verify: ver ver1/thoughtful ver2/sampling ver3/consensus | enhance: cr/crystal lay qu in out da/data | format: bul art html | util: tips sticky on|off"
metadata:
  version: "2.0.0"
  author: Yoni Goldberg
  updated: "2026-11-06"
---

# Spoon

Spoon is how the user shapes every answer. Short tokens like `sp 1m` or `sp ver` set the **dose** (how long), **verification** (how carefully the answer is checked), **enhancers** (how it is explained: crystal clear, for a layman, with data), **formats** (bullets, artifact) and **utilities** (quick start, sticky arguments). Dosing is explained here. Each other area has its own file, read only when needed.

Every response ends with 🥄 as its very last line. Never start a response with 🥄.


## Arguments

Arguments are standalone tokens right after `/spoon` or its shortcut `sp`, or at the end of the message. Tokens combine (`sp 1m ver bul`). If unsure, treat them as normal text.

## Dosing

How much to write. `{n}` is any number.

- `{n}s` — this many sentences (not seconds). `10s` = 10 sentences.
- `{n}p` — this many short paragraphs.
- `{n}m` — about this many minutes to read. 1m ≈ 200 words.

Stick to the dose: no intro, no hedge, nothing beyond it. Only the 🥄 line and ⚠️ warnings are extra. Enhancers and verification must fit inside it.

## Other areas

Read an area's file only when one of its tokens is used.

**Verification** — `references/verification.md`
- `ver` — pick the level yourself
- `ver1` / `thoughtful` — care and sources, no subagents
- `ver2` / `sampling` — subagents check key claims
- `ver3` / `consensus` — two models must agree 🤼

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
- `tips` — quick start
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
