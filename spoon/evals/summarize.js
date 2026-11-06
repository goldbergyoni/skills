// Writes results/summary.txt: per-case pass/fail with real output, init skills/plugins, total cost.
const fs = require('fs');
const [, , dir] = process.argv;
const read = (f) => (fs.existsSync(`${dir}/${f}`) ? fs.readFileSync(`${dir}/${f}`, 'utf8') : '');

const rows = JSON.parse(read('results.json')).results.results;
const costs = read('cost.log').split('\n').filter(Boolean).map(Number);
const inits = [...new Set(read('init.log').split('\n').filter(Boolean))];

const lines = rows.map((r) => {
  const g = r.gradingResult || {};
  const why = (g.componentResults || []).map((c) => c.reason).join(' ') || g.reason || r.error || '';
  const out = (r.response && r.response.output) || '';
  const tools = (out.match(/^(SUB )?TOOL \w+ .{0,50}/gm) || []).join(' ; ');
  const answer = out.split('FINAL ANSWER:\n').pop().trim().replace(/\n/g, ' ⏎ ').slice(0, 400);
  return `${r.success ? 'PASS' : 'FAIL'} | ${r.testCase.description} | ${why.slice(0, 300)}\n` +
    (tools ? `   tools: ${tools}\n` : '') + `   answer: ${answer || '(stopped after 1 turn)'}`;
});

const passed = rows.filter((r) => r.success).length;
const text = [
  `Run: ${new Date().toISOString()} | spoon ${process.env.SPOON_VERSION || '?'} | ${passed}/${rows.length} passed`,
  `Total cost: $${costs.reduce((a, b) => a + b, 0).toFixed(3)} over ${costs.length} claude calls (runs + judge)`,
  `Init events (distinct): ${inits.length}`, ...inits.map((l) => `   ${l}`),
  '', ...lines, '',
].join('\n');
fs.writeFileSync(`${dir}/summary.txt`, text);
console.log(text);
