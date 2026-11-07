// Checks promptfoo has no built-in for. Each returns { pass, score, reason }.
// They read promptfoo's standard agent metadata (toolCalls, skillCalls), so they work on every provider.
const fs = require('fs');
const path = require('path');

const res = (pass, reason) => ({ pass, score: pass ? 1 : 0, reason });
const meta = (context) => context.providerResponse?.metadata || context.metadata || {};
const WS = process.env.SPOON_WS;
const wsReal = WS && fs.realpathSync(WS);

// The answer without the 🥄 footer line.
const body = (out) => out.split('\n').filter((l) => !l.includes('🥄')).join('\n').trim();

// Every case: any spoon file the agent loaded or read sits in the eval workspace (a link to this repo),
// not in ~/.claude, a plugin or a marketplace. Relative paths are relative to the workspace.
function spoonFromWorkspace(out, context) {
  const m = meta(context);
  const paths = [
    ...[...(m.skillCalls || []), ...(m.attemptedSkillCalls || [])].map((s) => s.path),
    ...(m.toolCalls || []).map((t) => t.input?.file_path || t.input?.filePath),
  ].filter((p) => typeof p === 'string' && /(^|\/)spoon\//.test(p));
  const inside = (p) => !path.isAbsolute(p) || p.startsWith(`${WS}/`) || p.startsWith(`${wsReal}/`);
  const bad = paths.filter((p) => !inside(p));
  if (!paths.length) return res(true, 'No spoon path exposed by this provider; isolated by its config.');
  return res(!bad.length, bad.length ? `spoon loaded from outside the workspace: ${bad[0]}` : `${paths.length} spoon path(s), all in the workspace.`);
}

// 1s: one sentence, with up to 1 extra allowed.
function oneSentence(out) {
  const b = body(out).replace(/\b(?:[A-Z]\.){2,}/g, 'X').replace(/\b[A-Z]\.(?=\s+[A-Z])/g, 'X').replace(/\b(Mr|Mrs|Dr|St|Jr|vs|e\.g|i\.e)\./g, '$1');
  const n = (b.match(/[.!?]+(?=\s|$)/g) || []).length;
  return res(n >= 1 && n <= 2 && !b.includes('\n'), `${n} sentence(s) (want 1–2), newlines: ${b.includes('\n')}.`);
}

// Consensus: the main agent started at least two subagents.
function twoSubagents(out, context) {
  const calls = meta(context).toolCalls || [];
  const n = calls.filter((t) => ['Agent', 'Task'].includes(t.name) && !t.parentToolUseId).length;
  const sub = calls.filter((t) => t.parentToolUseId).length;
  return res(n >= 2, `${n} subagent(s) started; ${sub} tool call(s) inside subagents.`);
}

// bul: 2–7 bullets, each starting with a 2–4 word bold title.
function boldBullets(out) {
  const lines = body(out).split('\n').filter((l) => l.trim());
  const bullets = lines.filter((l) => /^\s*[-*•]\s/.test(l));
  const bad = bullets.filter((l) => {
    const m = l.match(/^\s*[-*•]\s+\*\*([^*]+)\*\*/);
    const words = m ? m[1].replace(/[:.—-]+\s*$/, '').trim().split(/\s+/).length : 0;
    return words < 2 || words > 4;
  });
  const ok = bullets.length >= 2 && bullets.length <= 7 && bad.length === 0;
  return res(ok, `${bullets.length} bullet(s), ${bad.length} without a 2–4 word bold title${bad[0] ? `: "${bad[0].slice(0, 60)}"` : ''}.`);
}

// html: a full HTML page, in the reply or in a .html file the reply names.
function htmlPage(out) {
  const inline = /<html[\s>]/i.test(out);
  const file = (out.match(/[\w./~-]+\.html\b/g) || []).map((f) => path.resolve(WS, f)).find((f) => fs.existsSync(f));
  const ok = inline || (file && /<html[\s>]/i.test(fs.readFileSync(file, 'utf8')));
  return res(Boolean(ok), `HTML in reply: ${inline}; HTML file: ${file || 'none'}.`);
}

// For the ver1 judge: the tool calls (with what they returned) plus the final answer.
function transcript(out, context) {
  const cut = (x) => (x && x.length > 1500 ? `${x.slice(0, 1500)} …[cut]` : x || '');
  const calls = (meta(context).toolCalls || []).map((t) => `TOOL ${t.name} ${JSON.stringify(t.input)}\nRESULT ${cut(typeof t.output === 'string' ? t.output : JSON.stringify(t.output))}`);
  return `${calls.join('\n')}\n\nFINAL ANSWER:\n${out}`;
}

module.exports = { spoonFromWorkspace, transcript, oneSentence, twoSubagents, boldBullets, htmlPage };

// ---- Subagent features (ver2, ver3, cr): the reply must be a finished, clean answer ----

// The run finished (no "agents are still running"), the last line is the 🥄 footer, and the body
// has no referee/subagent narration: the user asked a question, not for a process report.
function cleanAnswer(out) {
  const lines = out.trim().split('\n').filter((l) => l.trim());
  const footerOk = /^🥄/.test((lines[lines.length - 1] || '').trim());
  const stalled = body(out).match(/still (running|reviewing|checking)|are running|waiting (on|for)|wait for (them|their)|once they report/i);
  const narration = body(out).match(/\b(sub)?agents?\b|tie-?break|\bopus\b|\bsonnet\b|referee|\bvotes?\b|judges?|spot-checks?|claim checks?|both models|(review|verification) step/i);
  const ok = footerOk && !stalled && !narration;
  return res(ok, `footer last: ${footerOk}; stalled: ${stalled ? `"${stalled[0]}"` : 'no'}; narration in body: ${narration ? `"${narration[0]}"` : 'none'}.`);
}

// 2s: two sentences, with up to 1 extra allowed, no line breaks.
function twoSentences(out) {
  const b = body(out).replace(/\b(?:[A-Z]\.){2,}/g, 'X').replace(/\b(Mr|Mrs|Dr|St|Jr|vs|e\.g|i\.e)\./g, '$1');
  const n = (b.match(/[.!?]+(?=\s|$)/g) || []).length;
  return res(n >= 2 && n <= 3 && !b.includes('\n'), `${n} sentence(s) (want 2–3), newlines: ${b.includes('\n')}.`);
}

const topAgents = (context) => (meta(context).toolCalls || []).filter((t) => ['Agent', 'Task'].includes(t.name) && !t.parentToolUseId);
const readRef = (context, name) => (meta(context).toolCalls || []).some((t) => t.name === 'Read' && (t.input?.file_path || '').endsWith(`references/${name}`));

// cr: the crystal protocol ran (enhancers.md read, 3 capability subagents + judges). Reports the fan-out.
function crystalRan(out, context) {
  const n = topAgents(context).length;
  const read = readRef(context, 'enhancers.md');
  return res(read && n >= 3, `enhancers.md read: ${read}; ${n} top-level subagent(s) (protocol needs ≥3, typically 6).`);
}

// ver2: sampling ran as written: 1–3 claim-check subagents and the footer says sampling.
function samplingRan(out, context) {
  const n = topAgents(context).length;
  const footer = /🥄[^\n]*sampling/i.test(out);
  return res(n >= 1 && n <= 3 && footer, `${n} top-level subagent(s) (want 1–3); footer says sampling: ${footer}.`);
}

module.exports = { ...module.exports, cleanAnswer, twoSentences, crystalRan, samplingRan };
