// Assertions. Each gets the provider output and returns { pass, score, reason }.
const res = (pass, reason) => ({ pass, score: pass ? 1 : 0, reason });

// The answer without the 🥄 footer line.
const body = (out) => out.split('\n').filter((l) => !l.includes('🥄')).join('\n').trim();

// Every case: spoon was loaded, from this repo. (The provider errors if it loads from anywhere else.)
function spoonFromRepo(out, context) {
  const spoon = context.providerResponse?.metadata?.spoon;
  return res(spoon === 'repo', `spoon source: ${spoon}.`);
}

// 1s: one sentence, with up to 1 extra allowed.
function oneSentence(out) {
  const b = body(out).replace(/\b(?:[A-Z]\.){2,}/g, 'X').replace(/\b[A-Z]\.(?=\s+[A-Z])/g, 'X').replace(/\b(Mr|Mrs|Dr|St|Jr|vs|e\.g|i\.e)\./g, '$1');
  const n = (b.match(/[.!?]+(?=\s|$)/g) || []).length;
  return res(n >= 1 && n <= 2 && !b.includes('\n'), `${n} sentence(s) (want 1–2), newlines: ${b.includes('\n')}.`);
}

function oneParagraph(out) {
  const n = body(out).split(/\n\s*\n/).filter((p) => p.trim()).length;
  return res(n === 1, `${n} paragraph(s).`);
}

// 1m ≈ 200 words.
function oneMinute(out) {
  const n = body(out).split(/\s+/).filter(Boolean).length;
  return res(n >= 60 && n <= 220, `${n} words (want 60–220).`);
}

// Consensus: at least two Agent subagents were started.
function twoSubagents(out) {
  const n = (out.match(/^TOOL Agent /gm) || []).length;
  const sub = (out.match(/^SUB /gm) || []).length;
  return res(n >= 2, `${n} Agent call(s); ${sub} subagent event(s) seen.`);
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

// html: a full HTML page, written to a .html file or given in the reply.
function htmlPage(out) {
  const wrote = /^TOOL Write \{"file_path":"[^"]+\.html","content":"[^]*?<html/m.test(out);
  const inline = /<html[\s>]/i.test(out.split('FINAL ANSWER:\n').pop());
  return res(wrote || inline, `wrote .html file: ${wrote}, HTML in reply: ${inline}.`);
}

// Footer: last line starts with 🥄, nothing after it, and spells out the tokens (not the raw tokens).
const footer = (...want) => (out) => {
  const last = out.trim().split('\n').pop().trim();
  const missing = want.filter((w) => !new RegExp(w, 'i').test(last));
  const ok = last.startsWith('🥄') && missing.length === 0;
  return res(ok, `last line: "${last}"${missing.length ? `, missing: ${missing.join(', ')}` : ''}.`);
};
const footerSentencesOut = footer('2 sentences', 'zoomed out');

// No tokens: the reply still ends with a bare 🥄 line.
function footerBare(out) {
  const last = out.trim().split('\n').pop().trim();
  return res(last === '🥄', `last line: "${last}".`);
}

module.exports = { spoonFromRepo, oneSentence, oneParagraph, oneMinute, twoSubagents, boldBullets, htmlPage, footerSentencesOut, footerBare };
