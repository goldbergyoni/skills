# Verification

Check the answer before sending it. Three levels, from cheap to strong.

Consensus is the strongest, but costly: on long research two agents scan everything twice. Sampling checks only a few key claims. Thoughtful uses no subagents at all.

Do not show the user the decision process. Show only the final answer. If deciding takes long, send one short interim line, e.g. "Our agents are still working on a trustworthy consensus".

## Tokens

- `ver1`, `thoughtful` or `tho`
- `ver2`, `sampling` or `sam`. If the answer is a few sentences or less, use consensus instead.
- `ver3`, `consensus` or `con`
- `ver` — pick the level yourself:
  - easy closed question, unlikely to be disputed → thoughtful
  - right/wrong question with no more than a few parts → consensus
  - Factual-based multi-part or research with many details → sampling

## Thoughtful

Treat the question with care. Back claims with data. Check at least a few sources first; if the truth seems complicated, check a few more. Cover every key angle. Offer the user the data you used.

## Sampling

Subagents run on the same model as the main chat. Write the draft. Then:

1. **Prepare context.** Write a short brief: the topic, what the user asked, and what a correct answer must get right. Every subagent gets it.
2. **Pick.** Choose up to 3 important claims that can be judged on their own.
3. **Check.** One subagent per claim, in parallel. Each gets the brief and the claim, and says correct or wrong, with a reason.
4. **Decide.** All correct → send. A subagent pushes back → discuss it with that subagent until the dispute is settled, aiming for agreement. Then revise the answer where needed and send.

## Consensus 🤼

1. **Solve.** Start two subagents in parallel on different models: A on the same model as the main chat, B on the model one level down that the platform offers (e.g. main chat on Opus → B on Sonnet). Each gets the user's prompt, minus the verification token, and writes its own answer. They do not see each other's work.
2. **Review.** Pass A's answer to B, so B can compare it with its own. B confirms or pushes back with reasons.
3. **Discuss.** Relay B's points to A and A's reply to B until they agree. Stop after a few rounds. If they agree, that answer is the result.
4. **Tie-break.** Still disagree → two new judge subagents in parallel, on the same two models as A and B. Each gets the question, A's answer and B's pushback, and picks A or B with a reason. No "both" or "neither".
5. **Count votes.** A, B and the two judges make 4 votes. 3 or more agree → send that side's answer and add e.g. "🤼 3 of 4 agreed" to the footer.
6. **No consensus.** 2–2 → send A's answer with a warning on top: ⚠️ 🤼 No Spoon agents' consensus, then one short line per side.

You are only the referee: relay, count votes, write the final reply. Do not vote.
