// Runs a prompt through the real `claude -p` CLI and returns the answer or the trajectory.
// Mode "judge" (config.judge) runs a plain, tool-less Claude to grade llm-rubric asserts.
const { spawn } = require('child_process');
const fs = require('fs');

const MODEL = 'claude-sonnet-5-5';
const cut = (s, n = 1500) => (s.length > n ? s.slice(0, n) + ' …[cut]' : s);
const log = (file, line) => file && fs.appendFileSync(file, line + '\n');

function runClaude(args, cwd, timeoutMs) {
  return new Promise((resolve) => {
    const p = spawn('claude', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let raw = '';
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; p.kill(); }, timeoutMs);
    p.stdout.on('data', (d) => { raw += d; });
    p.on('close', () => {
      clearTimeout(timer);
      const events = raw.split('\n').flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
      // With background subagents, -p can emit several results; the last one is the real answer.
      const result = events.filter((e) => e.type === 'result').pop();
      const cost = events.filter((e) => e.type === 'result').reduce((m, e) => Math.max(m, e.total_cost_usd || 0), 0);
      log(process.env.SPOON_COST_LOG, String(cost));
      resolve({ events, result, cost, timedOut });
    });
  });
}

function trajectory(events) {
  const out = [];
  for (const e of events) {
    const content = e.message && Array.isArray(e.message.content) ? e.message.content : [];
    const sub = e.parent_tool_use_id ? 'SUB ' : '';
    for (const c of content) {
      if (c.type === 'tool_use') out.push(`${sub}TOOL ${c.name} ${JSON.stringify(c.input)}`);
      else if (c.type === 'tool_result') {
        const t = typeof c.content === 'string' ? c.content : (c.content || []).map((x) => x.text || '').join('\n');
        out.push(`${sub}RESULT ${cut(t)}`);
      } else if (c.type === 'text') out.push(`${sub}${e.type === 'user' ? 'LOADED' : 'TEXT'} ${cut(c.text)}`);
    }
  }
  return out.join('\n');
}

// Where spoon was loaded from: 'repo', 'none', or the wrong path.
function spoonSource(events, ws) {
  const want = fs.realpathSync(ws) + '/.claude/skills/spoon';
  const dirs = JSON.stringify(events).match(/Base directory for this skill: [^\s\\]*\/spoon(?=[\s\\])/g) || [];
  const bad = dirs.map((d) => d.split(': ')[1]).filter((d) => d !== want);
  return bad.length ? bad[0] : dirs.length ? 'repo' : 'none';
}

class ClaudeCli {
  constructor(options = {}) { this.config = options.config || {}; }
  id() { return this.config.judge ? 'claude-cli-judge' : 'claude-cli'; }

  async callApi(prompt, context) {
    const base = ['-p', prompt, '--model', MODEL, '--effort', 'medium', '--setting-sources', 'project',
      '--output-format', 'stream-json', '--verbose'];
    if (this.config.judge) {
      const { result, cost } = await runClaude([...base, '--disable-slash-commands', '--tools', ''],
        process.env.SPOON_JUDGE_WS, 180000);
      return { output: result ? result.result : '', cost };
    }

    const v = (context && context.vars) || {};
    const ws = process.env.SPOON_WS;
    const extra = v.max_turns ? ['--max-turns', String(v.max_turns)] : [];
    const t0 = Date.now();
    const { events, result, cost, timedOut } = await runClaude(
      [...base, '--allowedTools', 'Read,Write,Agent,SendMessage,WebSearch,WebFetch', ...extra],
      ws, (v.timeout_s || 300) * 1000);

    const init = events.find((e) => e.type === 'system' && e.subtype === 'init') || {};
    log(process.env.SPOON_INIT_LOG, `skills=${(init.skills || []).join(',')} | plugins=${(init.plugins || []).map((p) => p.name).join(',')}`);

    const spoon = spoonSource(events, ws);
    if (!['repo', 'none'].includes(spoon)) return { error: `spoon loaded from the wrong place: ${spoon}` };

    const answer = result ? result.result || '' : '';
    const secs = Math.round((Date.now() - t0) / 1000);
    const header = `[spoon: ${spoon} | ${result ? result.subtype : 'no result'}${timedOut ? ', timeout' : ''} | ${secs}s | $${cost.toFixed(3)}]`;
    return {
      output: v.view === 'trajectory' ? `${header}\n${trajectory(events)}\n\nFINAL ANSWER:\n${answer}` : answer,
      cost,
      metadata: { spoon, spoonVersion: process.env.SPOON_VERSION, secs },
    };
  }
}

module.exports = ClaudeCli;
