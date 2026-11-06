# Verification

Check the answer before sending it. Three levels, from cheap to strong.

Consensus is the strongest, but costly: on long research two agents scan everything twice. Sampling checks only a few key claims. Thoughtful uses no subagents at all.

## Tokens

- `ver1` or `thoughtful`
- `ver2` or `sampling`. If the answer is a few sentences or less, use consensus instead.
- `ver3` or `consensus`
- `ver` — pick the level yourself:
  - easy closed question, unlikely to be disputed → thoughtful
  - right/wrong question with few parts → consensus
  - multi-part or research with many details → sampling

## Thoughtful

Treat the question with care. Back claims with data. Check a few sources. Cover every key angle and miss nothing. Offer the user the data you used.

## Sampling

Write the draft. Then:

1. **Pick.** Choose up to 3 important claims that can be judged on their own.
2. **Check.** One subagent per claim, in parallel. Each gets the question and the claim, and says correct or wrong, with a reason.
3. **Decide.** All correct → send. Any wrong → revise the whole answer based on the issues, then send.

## Consensus 🤼

1. **Solve.** Start two subagents in parallel on different models: A on Opus (`model: "opus"`), B on Sonnet (`model: "sonnet"`). Each gets the question and all arguments except verification, and writes its own answer. They do not see each other's work.
2. **Review.** Send A's answer to B (SendMessage, so B keeps its own answer in mind). B confirms or pushes back with reasons.
3. **Discuss.** Relay B's points to A and A's reply to B until they agree. Stop after 2 rounds. If they agree, that answer is the result.
4. **Tie-break.** Still disagree → two new judge subagents in parallel, one Opus, one Sonnet. Each gets the question, A's answer and B's pushback, and picks A or B with a reason. No "both" or "neither".
5. **Count votes.** A, B and the two judges make 4 votes. 3 or more agree → send that side's answer and add e.g. "🤼 3 of 4 agreed" to the footer.
6. **No consensus.** 2–2 → send A's answer with a warning on top: ⚠️ 🤼 No Spoon agents' consensus, then one short line per side.

You are only the referee: relay, count votes, write the final reply. Do not vote. Send at most one progress update.
