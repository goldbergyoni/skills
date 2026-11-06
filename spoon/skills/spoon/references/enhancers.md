# Enhancers

Change how the answer is made. They must fit the dose.

## Tokens

- `cr` or `crystal` — make the explanation crystal clear, with subagents
- `lay` — don't assume the user knows the topic. Explain in very simple words, as to a layman. Define every term you use.
- `qu` — ask the user at least one question before answering. Wait for the reply.
- `in` — zoom in: a bit more detail
- `out` — zoom out: less detail, the bigger picture
- `da` or `data` — include some verified data: numbers, stats, measurements. Say where each one comes from. If there is no data, say so. Never invent numbers.

## Crystal

Write a draft. Then run three **capability** subagents in parallel. Each gets the question, the draft and all arguments, and proposes one edit that fits the dose:

- **Simplicity** — how to make it simpler
- **Completeness** — an important detail that is missing
- **Show, don't tell** — an example, story or image that makes it click

Each proposal goes to a **judge** subagent, which gets the same inputs plus the edit, and accepts or rejects it with a reason. On rejection, relay the reason; the capability subagent may revise or drop its edit. Stop after 2 rounds. Only edits both sides agree on go in. Send at most one progress update.
