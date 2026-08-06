#!/usr/bin/env node
/**
 * dashboard-creator.js — aggregates every benchmark repository's findings into a
 * single self-contained `dashboard.html`.
 *
 *   node dashboard-creator.js            # writes ./dashboard.html
 *   node dashboard-creator.js --json     # also dumps the aggregate to stdout
 *
 * Output is deterministic: same inputs -> byte-identical HTML. No timestamps, no
 * unordered map iteration; every list is sorted by an explicit stable key.
 *
 * Findings and ideas come exclusively from each repo's `findings_history.json` —
 * the curated, append-only deliverable — in the current schema (`rule_name` +
 * `rule_reference`). Legacy `rule_id` data was ported into that schema by
 * migrate-legacy-findings.js; this script no longer reads the old format.
 *
 * That file is the only input this script needs: per-PR files under `runs/` and
 * `findings/` are working material and are not committed, so everything rendered
 * here must survive without them. They are still read opportunistically for PR
 * metadata when a run left them on disk locally, but only as a fallback — the
 * dashboard rebuilds byte-identically from the committed files alone.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dashboard.html');

// ---------------------------------------------------------------- area mapping

// Canonical areas — the artifact types from SKILL.md's routing table, in the
// order they should appear everywhere. The four types whose checklists are
// still stubs are listed last: they can only ever carry guideline findings.
const AREAS = [
  'Skill',
  'Guideline / Rule',
  'Pointer Rule',
  'Standards Doc',
  'Context File',
  'Hook',
  'Command',
  'Subagent',
  'Skill Script',
  'Settings / Other',
];

// checklist filename -> area
const AREA_BY_REFERENCE = {
  'skill-checklist': 'Skill',
  'guideline-rule-checklist': 'Guideline / Rule',
  'rule-checklist': 'Pointer Rule',
  'standards-checklist': 'Standards Doc',
  'context-file-checklist': 'Context File',
  'hook-checklist': 'Hook',
  'command-checklist': 'Command',
  'subagent-checklist': 'Subagent',
  'skill-script-checklist': 'Skill Script',
  'other-checklist': 'Settings / Other',
};

/**
 * A finding's area. `artifact_type` — the routing-table type the reviewer
 * actually graded the file as — wins when present, because a guideline finding
 * on a CLAUDE.md cites guideline-rule-checklist.md but belongs under the
 * container type it was found in. `rule_reference` is the fallback.
 */
function areaOf(finding) {
  if (finding.artifact_type && AREAS.includes(finding.artifact_type)) {
    return finding.artifact_type;
  }
  if (finding.rule_reference) {
    const base = path.basename(String(finding.rule_reference)).replace(/\.md$/, '');
    if (AREA_BY_REFERENCE[base]) return AREA_BY_REFERENCE[base];
  }
  return 'Uncategorized';
}

// Severity is a property of the cited check, not a judgment call — see the rule
// catalog in instructions.md.
const SEVERITIES = ['error', 'warning', 'informative'];

// ------------------------------------------------------------------ file utils

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw new Error(`${file}: ${err.message}`);
  }
}

function listDirs(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort();
}

/** Per-PR files for a repo: the newest `runs/<run-id>/` if present, else `findings/`. */
function perPrFiles(repoDir) {
  const runsDir = path.join(repoDir, 'runs');
  if (fs.existsSync(runsDir)) {
    const runIds = listDirs(runsDir);
    if (runIds.length) {
      const latest = runIds[runIds.length - 1]; // run ids sort chronologically
      return { runId: latest, dir: path.join(runsDir, latest) };
    }
  }
  const findingsDir = path.join(repoDir, 'findings');
  if (fs.existsSync(findingsDir)) return { runId: null, dir: findingsDir };
  return { runId: null, dir: null };
}

function loadPrRecords(dir) {
  if (!dir) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^pr-\d+\.json$/.test(f))
    .sort((a, b) => prNum(a) - prNum(b))
    .map((f) => readJson(path.join(dir, f)))
    .filter(Boolean);
}

const prNum = (f) => Number(f.match(/\d+/)[0]);

// ------------------------------------------------------------------ repo load

/**
 * Build one repo record. Findings come only from `findings_history.json` (the
 * curated deliverable — corrections are applied there and nowhere else). Per-PR
 * files contribute PR metadata only; their `findings` arrays are ignored, since
 * for ported repos they still hold the superseded legacy format.
 */
function loadRepo(name) {
  const repoDir = path.join(ROOT, name);
  const history = readJson(path.join(repoDir, 'findings_history.json'));
  const stats = readJson(path.join(repoDir, 'stats.json'));
  const { runId, dir } = perPrFiles(repoDir);

  // PR metadata, keyed by PR number. Per-PR files win over stats.json.
  const prs = new Map();
  const addPr = (p) => {
    if (!p || typeof p.pr !== 'number') return;
    prs.set(p.pr, {
      pr: p.pr,
      title: p.title || '',
      url: p.url || '',
      state: p.state || '',
      author: p.author || '',
      category: p.category || 'unknown',
      additions: p.additions || 0,
      deletions: p.deletions || 0,
      reviewed: p.reviewed !== false,
      notes: p.notes || '',
    });
  };
  (stats && Array.isArray(stats.prs) ? stats.prs : []).forEach(addPr);
  loadPrRecords(dir).forEach(addPr);

  // Findings come only from the curated history — never from the per-PR files.
  const runs = history && Array.isArray(history.runs) ? history.runs.slice() : [];
  runs.sort((a, b) => String(a.run_id).localeCompare(String(b.run_id)));
  const latestRun = runs.length ? runs[runs.length - 1] : null;
  const findings = latestRun && Array.isArray(latestRun.findings) ? latestRun.findings : [];
  const source = latestRun ? `findings_history.json (${latestRun.run_id})` : 'none';

  const reviewedPrs = [...prs.values()].filter((p) => p.reviewed);
  const prsReviewed = latestRun && latestRun.prs_reviewed ? latestRun.prs_reviewed : reviewedPrs.length;

  const norm = findings.map((f) => {
    const meta = prs.get(f.pr) || {};
    return {
      repo: name,
      pr: f.pr,
      pr_url: f.pr_url || meta.url || '',
      pr_title: meta.title || '',
      pr_category: meta.category || 'unknown',
      file: f.file || '',
      line: f.line || 0,
      code: f.code || '',
      description: f.description || '',
      confidence: f.confidence || 'unspecified',
      severity: SEVERITIES.includes(f.severity) ? f.severity : 'unspecified',
      // Which of the two review passes produced this — `container` or
      // `guideline`. A repo with zero guideline findings almost always means
      // the pass was skipped, not that its advice lines were clean.
      pass: f.pass === 'guideline' ? 'guideline' : 'container',
      rule: f.rule_name || 'unknown',
      legacyRuleId: f.legacy_rule_id || '',
      area: areaOf(f),
      // Did the repo's own PR reviewer (bot or human) flag this same problem?
      // null/absent means nobody did — which is the result we're hoping for.
      alsoFoundBy: f.also_found_by
        ? {
            reviewer: f.also_found_by.reviewer || 'unknown',
            type: f.also_found_by.reviewer_type || 'bot',
            url: f.also_found_by.comment_url || '',
            quote: f.also_found_by.quote || '',
          }
        : null,
    };
  });
  norm.sort((a, b) => b.pr - a.pr || a.file.localeCompare(b.file) || a.line - b.line);

  const prsWithFindings = new Set(norm.map((f) => f.pr)).size;

  // Incumbent-review dimension. A repo only participates if it actually has a PR
  // reviewer; where it doesn't, `also_found_by` is null everywhere for a reason
  // that has nothing to do with the skill, so the repo is excluded from the
  // unique-findings statistic entirely rather than scoring a free 100%.
  const hasPrReviewer = latestRun ? latestRun.repo_has_pr_reviewer === true : false;
  const alsoFoundCount = norm.filter((f) => f.alsoFoundBy).length;
  const uniqueCount = hasPrReviewer ? norm.length - alsoFoundCount : null;

  // Candidate rules a reviewer proposed while reading a diff — code the catalog
  // had no rule for. Same source of truth as findings: the curated history.
  const ideas = (latestRun && Array.isArray(latestRun.ideas) ? latestRun.ideas : []).map((idea) => {
    const meta = prs.get(idea.pr) || {};
    return {
      repo: name,
      pr: idea.pr || 0,
      pr_url: idea.pr_url || meta.url || '',
      area: idea.area || 'Uncategorized',
      rule: idea.rule || '',
      why: idea.why || '',
      groundedIn: idea.grounded_in || '',
      ported: idea.ported === true,
      // Synthesised from several single-PR ideas that independently proposed the
      // same rule; support_prs is how many PRs backed it.
      clustered: idea.clustered === true,
      support: Array.isArray(idea.support_prs) ? idea.support_prs.length : 0,
    };
  });
  ideas.sort((a, b) => a.area.localeCompare(b.area) || b.pr - a.pr || a.rule.localeCompare(b.rule));

  return {
    ideas,
    name,
    url: (history && history.url) || (stats && stats.repo) || '',
    source,
    runId: latestRun ? latestRun.run_id : runId,
    skillCommit: latestRun ? latestRun.skill_commit || '' : '',
    filteredToFunctional: latestRun ? latestRun.filtered_to_functional === true : null,
    ported: norm.some((f) => f.legacyRuleId),
    prsReviewed,
    prsWithFindings,
    findingsCount: norm.length,
    highCount: norm.filter((f) => f.confidence === 'high').length,
    findingsPerPr: prsReviewed ? norm.length / prsReviewed : 0,
    hitRate: prsReviewed ? prsWithFindings / prsReviewed : 0,
    hasPrReviewer,
    prReviewers: latestRun && Array.isArray(latestRun.pr_reviewers) ? latestRun.pr_reviewers : [],
    prsWithReviewerComments: latestRun && latestRun.prs_with_reviewer_comments != null ? latestRun.prs_with_reviewer_comments : null,
    alsoFoundCount,
    uniqueCount,
    uniqueRate: hasPrReviewer && norm.length ? uniqueCount / norm.length : null,
    // Head-to-head: findings on PRs the incumbent reviewer actually reviewed. A
    // finding on a PR it skipped is uncontested by default and proves nothing, so
    // this — not uniqueCount — is the defensible "we beat the incumbent" number.
    h2hCount: latestRun && latestRun.findings_head_to_head != null ? latestRun.findings_head_to_head : null,
    h2hAlsoFound: latestRun && latestRun.findings_head_to_head_also_found != null ? latestRun.findings_head_to_head_also_found : null,
    h2hUnique: latestRun && latestRun.findings_head_to_head_unique != null ? latestRun.findings_head_to_head_unique : null,
    exclusions: latestRun
      ? {
          scanned: latestRun.prs_scanned || 0,
          noArtifact: latestRun.prs_excluded_no_artifact || 0,
          maintenance: latestRun.prs_excluded_maintenance || 0,
          productPayload: latestRun.prs_excluded_product_payload || 0,
          damaged: latestRun.prs_excluded_damaged || 0,
          duplicate: latestRun.prs_excluded_duplicate || 0,
        }
      : null,
    // How many reviewed PRs routed to a stub checklist (command / subagent /
    // skill-script / other). Surfaces the coverage gap so a thin result isn't
    // mistaken for a clean one.
    missingContainerChecklist: latestRun ? latestRun.prs_with_missing_container_checklist || 0 : 0,
    // Per-PR files are working material and are not committed, so the run entry's
    // own breakdown is the primary source here; the files, when a run left them
    // on disk locally, are just a fallback.
    categories: latestRun && latestRun.category_breakdown
      ? Object.entries(latestRun.category_breakdown)
          .map(([key, count]) => ({ key, count }))
          .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
      : countBy(reviewedPrs, (p) => p.category),
    findings: norm,
    trend: runs.map((r) => ({
      runId: r.run_id,
      findings: r.findings_count != null ? r.findings_count : (r.findings || []).length,
      prsReviewed: r.prs_reviewed || 0,
      filtered: r.filtered_to_functional === true,
    })),
  };
}

// ------------------------------------------------------------------ aggregation

function countBy(items, keyFn) {
  const m = new Map();
  for (const it of items) {
    const k = keyFn(it);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([key, count]) => ({ key, count }));
}

/**
 * Rank rules. `triggerRate` = share of all reviewed PRs in which the rule fired
 * at least once. `repoReach` = repos hit / repos with findings.
 */
function rankRules(repos) {
  const eligible = repos.filter((r) => r.findingsCount);
  const prDenominator = eligible.reduce((n, r) => n + r.prsReviewed, 0);
  const byRule = new Map();

  for (const repo of eligible) {
    for (const f of repo.findings) {
      let e = byRule.get(f.rule);
      if (!e) {
        e = { rule: f.rule, area: f.area, count: 0, repos: new Map(), prs: new Set(), high: 0, medium: 0, files: new Set(), contested: 0, alsoFound: 0 };
        byRule.set(f.rule, e);
      }
      e.count += 1;
      if (repo.hasPrReviewer) {
        e.contested += 1;
        if (f.alsoFoundBy) e.alsoFound += 1;
      }
      e.repos.set(f.repo, (e.repos.get(f.repo) || 0) + 1);
      e.prs.add(`${f.repo}#${f.pr}`);
      e.files.add(`${f.repo}/${f.file}`);
      if (f.confidence === 'high') e.high += 1;
      else if (f.confidence === 'medium') e.medium += 1;
    }
  }

  return [...byRule.values()]
    .map((e) => {
      const perRepo = [...e.repos.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      return {
        rule: e.rule,
        area: e.area,
        count: e.count,
        repoCount: e.repos.size,
        repoTotal: eligible.length,
        repoReach: eligible.length ? e.repos.size / eligible.length : 0,
        prCount: e.prs.size,
        triggerRate: prDenominator ? e.prs.size / prDenominator : 0,
        fileCount: e.files.size,
        high: e.high,
        medium: e.medium,
        contested: e.contested,
        alsoFound: e.alsoFound,
        unique: e.contested - e.alsoFound,
        // Share of this rule's findings, on reviewer-bearing repos, that the
        // incumbent reviewer did NOT catch. null when the rule has never fired
        // on such a repo — there is nothing to compare against.
        uniqueRate: e.contested ? (e.contested - e.alsoFound) / e.contested : null,
        topRepo: perRepo.length ? perRepo[0][0] : '',
        perRepo: perRepo.map(([repo, count]) => ({ repo, count })),
      };
    })
    .sort((a, b) => b.count - a.count || b.repoCount - a.repoCount || a.rule.localeCompare(b.rule));
}

function rankAreas(repos) {
  const byArea = new Map();
  const total = repos.reduce((n, r) => n + r.findingsCount, 0);
  for (const repo of repos) {
    for (const f of repo.findings) {
      let e = byArea.get(f.area);
      if (!e) {
        e = { area: f.area, count: 0, repos: new Set(), rules: new Set(), prs: new Set() };
        byArea.set(f.area, e);
      }
      e.count += 1;
      e.repos.add(f.repo);
      e.rules.add(f.rule);
      e.prs.add(`${f.repo}#${f.pr}`);
    }
  }
  return [...byArea.values()]
    .map((e) => ({
      area: e.area,
      count: e.count,
      share: total ? e.count / total : 0,
      repoCount: e.repos.size,
      ruleCount: e.rules.size,
      prCount: e.prs.size,
    }))
    .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area));
}

function build() {
  const repos = listDirs(ROOT).map(loadRepo);
  const withData = repos.filter((r) => r.findingsCount > 0);
  withData.sort((a, b) => b.findingsCount - a.findingsCount || a.name.localeCompare(b.name));

  const allFindings = withData.flatMap((r) => r.findings);

  // "Contested" findings are those filed against a repo that has its own PR
  // reviewer — the only ones where "did anyone else catch this?" is a question
  // with a meaningful answer.
  const reviewerRepos = withData.filter((r) => r.hasPrReviewer);
  const contested = reviewerRepos.flatMap((r) => r.findings);

  // Ideas are collected from every repo, including any with no findings — a run
  // that produced only ideas still produced something worth keeping.
  const allIdeas = repos.flatMap((r) => r.ideas);
  allIdeas.sort(
    (a, b) => a.area.localeCompare(b.area) || a.repo.localeCompare(b.repo) || b.pr - a.pr || a.rule.localeCompare(b.rule)
  );

  return {
    ideas: allIdeas,
    ideaAreas: countBy(allIdeas, (i) => i.area),
    ideaRepos: countBy(allIdeas, (i) => i.repo),
    totals: {
      repos: withData.length,
      reposScanned: repos.length,
      prsReviewed: withData.reduce((n, r) => n + r.prsReviewed, 0),
      findings: allFindings.length,
      prsWithFindings: withData.reduce((n, r) => n + r.prsWithFindings, 0),
      rules: new Set(allFindings.map((f) => f.rule)).size,
      high: allFindings.filter((f) => f.confidence === 'high').length,
      medium: allFindings.filter((f) => f.confidence === 'medium').length,
      ideas: allIdeas.length,
      // Incumbent-review dimension, computed only over repos that actually have
      // a PR reviewer — see the per-repo comment above.
      reviewedRepos: reviewerRepos.length,
      contestedFindings: contested.length,
      alsoFound: contested.filter((f) => f.alsoFoundBy).length,
      unique: contested.filter((f) => !f.alsoFoundBy).length,
      h2h: reviewerRepos.reduce((n, r) => n + (r.h2hCount || 0), 0),
      h2hUnique: reviewerRepos.reduce((n, r) => n + (r.h2hUnique || 0), 0),
      h2hAlsoFound: reviewerRepos.reduce((n, r) => n + (r.h2hAlsoFound || 0), 0),
    },
    rules: rankRules(withData),
    areas: rankAreas(withData),
    repos: withData,
    emptyRepos: repos.filter((r) => r.findingsCount === 0).map((r) => r.name),
  };
}

// ----------------------------------------------------------------- html render

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const pct = (n) => `${(n * 100).toFixed(1)}%`;
const num = (n, d = 2) => (Number.isInteger(n) ? String(n) : n.toFixed(d));

function bar(value, max, klass) {
  const w = max ? Math.max(1.5, (value / max) * 100) : 0;
  return `<span class="bar"><span class="bar-fill ${klass}" style="width:${w.toFixed(2)}%"></span></span>`;
}

function renderRuleTable(rules, schemaLabel) {
  if (!rules.length) return `<p class="empty">No ${esc(schemaLabel)} findings.</p>`;
  const max = rules[0].count;
  const rows = rules
    .map(
      (r, i) => `<tr>
      <td class="rank">${i + 1}</td>
      <td class="mono strong">${esc(r.rule)}</td>
      <td><span class="chip area-${AREAS.indexOf(r.area) + 1}">${esc(r.area)}</span></td>
      <td class="numcell">${bar(r.count, max, 'fill-1')}<span class="barnum">${r.count}</span></td>
      <td class="num">${pct(r.triggerRate)}</td>
      <td class="num">${r.repoCount}<span class="muted">/${r.repoTotal}</span></td>
      <td class="num">${r.prCount}</td>
      <td class="num">${r.high}<span class="muted"> ${r.count ? pct(r.high / r.count) : '—'}</span></td>
      <td class="num">${r.uniqueRate == null ? '<span class="muted">n/a</span>' : `${r.unique}<span class="muted">/${r.contested} ${pct(r.uniqueRate)}</span>`}</td>
      <td class="small">${r.perRepo.map((p) => `${esc(p.repo)}&nbsp;${p.count}`).join(' · ')}</td>
    </tr>`
    )
    .join('\n');
  return `<div class="tablewrap"><table>
    <thead><tr>
      <th>#</th><th>Rule</th><th>Area</th><th>Findings</th>
      <th title="Share of all reviewed PRs in which this rule fired at least once">Trigger rate</th>
      <th title="Repositories where the rule fired, out of repositories with findings in this schema">Repos</th>
      <th title="Distinct PRs where the rule fired">PRs</th>
      <th title="Findings filed at high confidence, and their share of the rule's findings. The remainder are medium — low-confidence findings are never filed.">High conf</th>
      <th title="Of this rule's findings on repositories that run their own PR reviewer, how many that reviewer did NOT catch. 'n/a' means the rule has only fired on repositories with no reviewer, so there is nothing to compare against.">Missed by others</th>
      <th>Per repo</th>
    </tr></thead><tbody>${rows}</tbody></table></div>`;
}

/**
 * The incumbent-review panel. Several benchmark repos already run a PR reviewer —
 * CodeRabbit, cubic, Baz, or human maintainers — so for those we record, per
 * finding, whether that reviewer flagged the same defect first. The number that
 * matters is what the skill found and the incumbent missed.
 */
function renderIncumbent(data) {
  const rows = data.repos
    .filter((r) => r.hasPrReviewer)
    .sort((a, b) => (b.uniqueCount || 0) - (a.uniqueCount || 0) || a.name.localeCompare(b.name))
    .map(
      (r) => `<tr>
        <td><a href="#" class="repolink" data-repo="${esc(r.name)}">${esc(r.name)}</a></td>
        <td class="small">${r.prReviewers.length ? r.prReviewers.map((x) => `<span class="reviewer">${esc(x)}</span>`).join(' ') : '<span class="muted">—</span>'}</td>
        <td class="num">${r.prsWithReviewerComments == null ? '<span class="muted">—</span>' : `${r.prsWithReviewerComments}<span class="muted">/${r.prsReviewed}</span>`}</td>
        <td class="num">${r.findingsCount}</td>
        <td class="num">${r.alsoFoundCount}</td>
        <td class="num">${r.uniqueCount}<span class="muted"> ${r.uniqueRate == null ? '' : pct(r.uniqueRate)}</span></td>
        <td class="num strong">${
          r.h2hCount == null
            ? '<span class="muted">—</span>'
            : `${r.h2hUnique}<span class="muted">/${r.h2hCount}${r.h2hCount ? ` ${pct(r.h2hUnique / r.h2hCount)}` : ''}</span>`
        }</td>
      </tr>`
    )
    .join('\n');

  const noReviewer = data.repos.filter((r) => !r.hasPrReviewer).map((r) => r.name);

  if (!rows) {
    return `<section class="panel">
      <h2>Versus the incumbent reviewer</h2>
      <p class="empty">No repository with a PR reviewer has been benchmarked under this schema yet. Once one is, this panel shows how many findings its existing reviewer missed. The reviewer for each repo is recorded in its <span class="mono">repository.md</span>.</p>
    </section>`;
  }

  return `<section class="panel">
    <h2>Versus the incumbent reviewer</h2>
    <p class="note">Several of these repositories already run a PR reviewer of their own — a bot (CodeRabbit, cubic, Baz) or human maintainers. For every finding on such a repository we record whether that reviewer flagged the same defect first — matched on the <em>substance</em> of the problem, not on wording or severity. <strong>Missed</strong> is the number that matters: real artifact problems the project's existing review process let through.</p>
    <div class="tablewrap"><table>
      <thead><tr>
        <th>Repository</th><th>Reviewer</th>
        <th title="Reviewed PRs that actually received reviewer comments. Coverage is never 100%, and a finding on an unreviewed PR is not evidence the reviewer missed anything.">Reviewer coverage</th>
        <th>Findings</th>
        <th title="Findings the incumbent reviewer also flagged">Also caught</th>
        <th title="All findings the incumbent reviewer did not flag — including those on PRs it never reviewed at all. Read alongside the head-to-head column.">Missed by them</th>
        <th title="The defensible number: findings on PRs the reviewer ACTUALLY reviewed, and still missed. Excludes PRs it skipped, which are uncontested by default.">Head-to-head</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <p class="note warn"><strong>Prefer the head-to-head column over the missed column.</strong> Reviewers skip PRs — a finding on a PR the reviewer never touched is uncontested by default and proves nothing about beating the incumbent. Head-to-head counts only findings on PRs the reviewer actually reviewed and still missed. Note too that <span class="mono">coder</span>'s own <span class="mono">coder-agents-review[bot]</span>, where it reviewed a PR, is <strong>the very skill under review</strong> — a match there measures self-agreement, not an independent second opinion.</p>
    ${noReviewer.length ? `<p class="note">Excluded from this panel — no PR reviewer in-window, so every finding is trivially uncontested: ${noReviewer.map((n) => `<span class="mono">${esc(n)}</span>`).join(', ')}.</p>` : ''}
  </section>`;
}

function renderOverview(data) {
  const t = data.totals;
  const top = data.rules[0];
  const maxArea = data.areas.length ? data.areas[0].count : 0;

  const areaRows = data.areas
    .map(
      (a) => `<tr>
        <td><span class="chip area-${AREAS.indexOf(a.area) + 1}">${esc(a.area)}</span></td>
        <td class="numcell">${bar(a.count, maxArea, 'fill-2')}<span class="barnum">${a.count}</span></td>
        <td class="num">${pct(a.share)}</td>
        <td class="num">${a.ruleCount}</td>
        <td class="num">${a.repoCount}</td>
        <td class="num">${a.prCount}</td>
      </tr>`
    )
    .join('\n');

  return `
  <section class="tiles">
    <div class="tile"><div class="tile-label">Findings</div><div class="tile-value">${t.findings}</div><div class="tile-sub">${t.high} high · ${t.medium} medium</div></div>
    <div class="tile"><div class="tile-label">PRs reviewed</div><div class="tile-value">${t.prsReviewed}</div><div class="tile-sub">${t.prsWithFindings} produced a finding</div></div>
    <div class="tile"><div class="tile-label">Findings / PR</div><div class="tile-value">${num(t.prsReviewed ? t.findings / t.prsReviewed : 0)}</div><div class="tile-sub">across ${t.repos} repositories</div></div>
    <div class="tile"><div class="tile-label">Distinct rules fired</div><div class="tile-value">${t.rules}</div><div class="tile-sub">of the catalog's rule codes</div></div>
    <div class="tile accent"><div class="tile-label">Top rule</div><div class="tile-value mono small-value">${top ? esc(top.rule) : '—'}</div><div class="tile-sub">${top ? `${top.count} findings in ${top.repoCount} repo${top.repoCount === 1 ? '' : 's'}` : ''}</div></div>
    <div class="tile accent2" title="Findings the repositories' own PR reviewers did not flag, across every reviewer-bearing repo. Head-to-head refines this to PRs the reviewer actually reviewed once a run records it."><div class="tile-label">Missed by existing review</div><div class="tile-value">${t.reviewedRepos ? t.unique : '—'}<span class="tile-of">${t.reviewedRepos ? `/${t.contestedFindings}` : ''}</span></div><div class="tile-sub">${t.reviewedRepos ? `across ${t.reviewedRepos} reviewer-bearing repo${t.reviewedRepos === 1 ? '' : 's'} · ${t.alsoFound} also caught` : 'no reviewer-bearing repo measured yet'}</div></div>
  </section>

  ${renderIncumbent(data)}

  <section class="panel">
    <h2>Rules by findings</h2>
    <p class="note">Ranked by total findings, then by how many repositories the rule reached. <strong>Trigger rate</strong> is the share of all ${t.prsReviewed} reviewed PRs in which the rule fired at least once.</p>
    ${renderRuleTable(data.rules, 'rule')}
  </section>

  <section class="panel">
    <h2>Rule areas</h2>
    <p class="note">Findings grouped by the reference file their rule lives in.</p>
    <div class="tablewrap"><table>
      <thead><tr><th>Area</th><th>Findings</th><th>Share</th><th>Rules</th><th>Repos</th><th>PRs</th></tr></thead>
      <tbody>${areaRows}</tbody>
    </table></div>
  </section>`;
}

/**
 * Candidate rules, grouped by area. This is the counterpart to the rules table:
 * that one measures the catalog as it stands, this one shows where reviewers
 * found real problems it doesn't cover yet.
 */
function renderIdeas(data) {
  if (!data.ideas.length) return '<section class="panel"><h2>Rule ideas</h2><p class="empty">No ideas recorded yet.</p></section>';

  const maxArea = data.ideaAreas.length ? data.ideaAreas[0].count : 0;
  const maxRepo = data.ideaRepos.length ? data.ideaRepos[0].count : 0;
  const ported = data.ideas.filter((i) => i.ported).length;
  const grounded = data.ideas.filter((i) => i.groundedIn).length;

  const miniRows = (items, max, klass) =>
    `<table class="mini"><tbody>${items
      .map(
        (it) =>
          `<tr><td class="k">${esc(it.key)}</td><td class="numcell">${bar(it.count, max, klass)}<span class="barnum">${it.count}</span></td></tr>`
      )
      .join('')}</tbody></table>`;

  // One block per area, so ideas read as a shopping list for the catalog's gaps.
  const byArea = new Map();
  for (const idea of data.ideas) {
    if (!byArea.has(idea.area)) byArea.set(idea.area, []);
    byArea.get(idea.area).push(idea);
  }
  const areaOrder = [...byArea.keys()].sort((a, b) => {
    const ia = AREAS.indexOf(a);
    const ib = AREAS.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
  });

  // Only repos with findings get their own tab; don't link to one that isn't there.
  const tabbed = new Set(data.repos.map((r) => r.name));

  const blocks = areaOrder
    .map((area) => {
      const rows = byArea
        .get(area)
        .map(
          (i) => `<tr>
            <td class="idea-rule">${i.clustered ? `<span class="tag tag-cluster" title="Synthesised from ${i.support} separate PRs that independently suggested this rule">${i.support}\u00d7</span> ` : ''}${esc(i.rule)}${i.why ? `<span class="idea-why">${esc(i.why)}</span>` : ''}</td>
            <td>${tabbed.has(i.repo) ? `<a href="#" class="repolink" data-repo="${esc(i.repo)}">${esc(i.repo)}</a>` : esc(i.repo)}</td>
            <td>${i.pr_url ? `<a href="${esc(i.pr_url)}" target="_blank" rel="noopener">#${i.pr}</a>` : i.pr ? `#${i.pr}` : '—'}</td>
            <td class="mono small">${i.groundedIn ? esc(i.groundedIn) : '<span class="muted">—</span>'}</td>
          </tr>`
        )
        .join('\n');
      return `<section class="panel">
        <h3><span class="chip area-${AREAS.indexOf(area) + 1}">${esc(area)}</span> <span class="muted">${byArea.get(area).length}</span></h3>
        <div class="tablewrap"><table>
          <thead><tr><th>Proposed rule</th><th>Repo</th><th>PR</th><th>Grounded in</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </section>`;
    })
    .join('\n');

  const portedNote = ported
    ? `<p class="note warn"><strong>${ported}</strong> of these were ported from the free-text <span class="mono">stats.json</span> ideas that early runs produced before the schema existed. They carry the reviewer's original prose in the rule column, are not yet assigned to an area, and may lack a <span class="mono">file:line</span> — sharpening them is a human pass, not a mechanical one.</p>`
    : '';

  return `
  <section class="tiles">
    <div class="tile accent"><div class="tile-label">Rule ideas</div><div class="tile-value">${data.ideas.length}</div><div class="tile-sub">candidate rules the catalog lacks</div></div>
    <div class="tile"><div class="tile-label">Grounded in code</div><div class="tile-value">${grounded}</div><div class="tile-sub">${pct(data.ideas.length ? grounded / data.ideas.length : 0)} name a file:line</div></div>
    <div class="tile"><div class="tile-label">Repositories</div><div class="tile-value">${data.ideaRepos.length}</div><div class="tile-sub">contributed an idea</div></div>
    <div class="tile"><div class="tile-label">Ideas vs findings</div><div class="tile-value">${num(data.totals.findings ? data.ideas.length / data.totals.findings : 0)}</div><div class="tile-sub">ideas per finding filed</div></div>
  </section>

  <section class="panel">
    <h2>Rule ideas</h2>
    <p class="note">Generic, reusable rules that reviewers proposed <em>while reading a real diff</em> — code that was worth flagging but matched nothing in the catalog. Each one names the file and line that motivated it. This is the backlog the rule set grows from; a high count here against a low findings count means the catalog is missing more than it catches.</p>
    ${portedNote}
    <div class="grid">
      <section class="panel"><h3>Ideas by area</h3>${miniRows(data.ideaAreas, maxArea, 'fill-2')}</section>
      <section class="panel"><h3>Ideas by repository</h3>${miniRows(data.ideaRepos, maxRepo, 'fill-3')}</section>
    </div>
  </section>
  ${blocks}`;
}

function renderRepoRanking(data) {
  const maxF = data.repos.length ? data.repos[0].findingsCount : 0;
  const maxRate = Math.max(...data.repos.map((r) => r.findingsPerPr), 0);

  const rows = data.repos
    .map(
      (r, i) => `<tr>
      <td class="rank">${i + 1}</td>
      <td><a href="#" class="repolink" data-repo="${esc(r.name)}">${esc(r.name)}</a>${r.filteredToFunctional === false ? ' <span class="tag" title="PR set was not filtered to functional changes — maintenance PRs sit in the denominator">unfiltered</span>' : ''}</td>
      <td class="numcell">${bar(r.findingsCount, maxF, 'fill-1')}<span class="barnum">${r.findingsCount}</span></td>
      <td class="numcell">${bar(r.findingsPerPr, maxRate, 'fill-3')}<span class="barnum">${num(r.findingsPerPr)}</span></td>
      <td class="num">${r.prsReviewed}</td>
      <td class="num">${r.prsWithFindings} <span class="muted">(${pct(r.hitRate)})</span></td>
      <td class="num">${r.highCount}<span class="muted"> ${r.findingsCount ? pct(r.highCount / r.findingsCount) : '—'}</span></td>
      <td class="num">${r.hasPrReviewer ? `${r.uniqueCount}<span class="muted">/${r.findingsCount}</span>` : '<span class="muted" title="This repository has no PR reviewer of its own, so there is nothing to compare against">n/a</span>'}</td>
      <td class="small">${r.topAreas.map((a) => `${esc(a.key)}&nbsp;${a.count}`).join(' · ')}</td>
    </tr>`
    )
    .join('\n');

  return `<section class="panel">
    <h2>Repositories by findings</h2>
    <p class="note"><strong>Findings / PR</strong> is the headline number — it is only comparable between repositories whose PR set was filtered to functional changes. A repository tagged <span class="tag">unfiltered</span> counted maintenance PRs (dependency bumps, docs, releases) in its denominator, so its rate is deflated and not trendable against the others.</p>
    <div class="tablewrap"><table>
      <thead><tr><th>#</th><th>Repository</th><th>Findings</th><th>Findings / PR</th><th>PRs reviewed</th><th>PRs with findings</th><th title="Findings filed at high confidence, and their share of the repository's findings. The remainder are medium.">High conf</th><th title="Findings the repository's own PR reviewer did not flag, out of all findings. 'n/a' where the repository has no reviewer.">Missed by others</th><th>Top areas</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </section>`;
}

function renderRepoTab(repo) {
  const areaCounts = countBy(repo.findings, (f) => f.area);
  const ruleCounts = countBy(repo.findings, (f) => f.rule);
  const fileCounts = countBy(repo.findings, (f) => f.file).slice(0, 10);
  const prCounts = countBy(repo.findings, (f) => String(f.pr)).slice(0, 10);
  const maxArea = areaCounts.length ? areaCounts[0].count : 0;
  const maxRule = ruleCounts.length ? ruleCounts[0].count : 0;
  const maxFile = fileCounts.length ? fileCounts[0].count : 0;
  const high = repo.findings.filter((f) => f.confidence === 'high').length;

  const ex = repo.exclusions;
  const exclusionRow = ex
    ? `<div class="meta-row"><span>PRs scanned <strong>${ex.scanned}</strong></span><span>no artifact <strong>${ex.noArtifact}</strong></span><span>maintenance <strong>${ex.maintenance}</strong></span><span>product payload <strong>${ex.productPayload}</strong></span><span>damaged <strong>${ex.damaged}</strong></span><span>duplicate <strong>${ex.duplicate}</strong></span>${
        repo.missingContainerChecklist
          ? `<span title="Reviewed PRs whose artifact type routes to a stub checklist — container checks could not run.">stub checklist <strong>${repo.missingContainerChecklist}</strong></span>`
          : ''
      }</div>`
    : '';

  const list = (items, max, klass, keyLabel) =>
    items.length
      ? `<table class="mini"><tbody>${items
          .map(
            (it) =>
              `<tr><td class="${keyLabel === 'file' || keyLabel === 'rule' ? 'mono' : ''} k">${esc(it.key)}</td><td class="numcell">${bar(it.count, max, klass)}<span class="barnum">${it.count}</span></td></tr>`
          )
          .join('')}</tbody></table>`
      : '<p class="empty">—</p>';

  const findingRows = repo.findings
    .map(
      (f, i) => `<tr class="finding-row" data-idx="${i}">
        <td class="mono strong">${esc(f.rule)}</td>
        <td><span class="chip area-${AREAS.indexOf(f.area) + 1}">${esc(f.area)}</span></td>
        <td>${f.pr_url ? `<a href="${esc(f.pr_url)}" target="_blank" rel="noopener">#${f.pr}</a>` : `#${f.pr}`}</td>
        <td class="mono small">${esc(f.file)}:${f.line}</td>
        <td><span class="sev sev-${esc(f.severity)}">${esc(f.severity)}</span></td>
        <td><span class="conf conf-${esc(f.confidence)}">${esc(f.confidence)}</span></td>
        <td>${
          !repo.hasPrReviewer
            ? '<span class="muted">—</span>'
            : f.alsoFoundBy
              ? `<a class="reviewer caught" href="${esc(f.alsoFoundBy.url)}" target="_blank" rel="noopener" title="${esc(f.alsoFoundBy.quote || 'Also flagged by this reviewer')}">${esc(f.alsoFoundBy.reviewer)}</a>`
              : '<span class="uniq" title="No other reviewer flagged this defect">missed by them</span>'
        }</td>
        <td class="desc">${esc(f.description)}</td>
      </tr>
      <tr class="code-row" hidden><td colspan="8"><pre>${esc(f.code)}</pre></td></tr>`
    )
    .join('\n');

  const ideaRows = repo.ideas
    .map(
      (i) => `<tr>
        <td class="idea-rule">${i.clustered ? `<span class="tag tag-cluster" title="Synthesised from ${i.support} separate PRs that independently suggested this rule">${i.support}\u00d7</span> ` : ''}${esc(i.rule)}${i.why ? `<span class="idea-why">${esc(i.why)}</span>` : ''}</td>
        <td><span class="chip area-${AREAS.indexOf(i.area) + 1}">${esc(i.area)}</span></td>
        <td>${i.pr_url ? `<a href="${esc(i.pr_url)}" target="_blank" rel="noopener">#${i.pr}</a>` : i.pr ? `#${i.pr}` : '—'}</td>
        <td class="mono small">${i.groundedIn ? esc(i.groundedIn) : '<span class="muted">—</span>'}</td>
      </tr>`
    )
    .join('\n');

  const ideaPanel = repo.ideas.length
    ? `<section class="panel">
        <h3>Rule ideas <span class="muted">(${repo.ideas.length}) — candidate rules this repo's PRs suggested</span></h3>
        <div class="tablewrap"><table>
          <thead><tr><th>Proposed rule</th><th>Area</th><th>PR</th><th>Grounded in</th></tr></thead>
          <tbody>${ideaRows}</tbody>
        </table></div>
      </section>`
    : '';

  return `
  <div class="repo-head">
    <h2>${esc(repo.name)}${repo.url ? ` <a class="ext" href="${esc(repo.url)}" target="_blank" rel="noopener">↗</a>` : ''}</h2>
    <div class="meta-row">
      <span>run <strong class="mono">${esc(repo.runId || '—')}</strong></span>
      <span>skill commit <strong class="mono">${esc(repo.skillCommit || 'unknown')}</strong></span>
      <span>functional filter <strong>${repo.filteredToFunctional === null ? 'n/a' : repo.filteredToFunctional ? 'yes' : 'no'}</strong></span>
      <span>source <strong class="mono">${esc(repo.source)}</strong></span>
      ${repo.ported ? '<span class="tag" title="Findings were recorded under the legacy R&lt;n&gt;.&lt;n&gt; catalog and ported to current rule codes by verbatim rule-text match">ported</span>' : ''}
    </div>
    ${exclusionRow}
  </div>

  <section class="tiles">
    <div class="tile"><div class="tile-label">Findings</div><div class="tile-value">${repo.findingsCount}</div><div class="tile-sub">${high} high confidence</div></div>
    <div class="tile"><div class="tile-label">PRs reviewed</div><div class="tile-value">${repo.prsReviewed}</div><div class="tile-sub">${repo.prsWithFindings} with a finding</div></div>
    <div class="tile"><div class="tile-label">Findings / PR</div><div class="tile-value">${num(repo.findingsPerPr)}</div><div class="tile-sub">hit rate ${pct(repo.hitRate)}</div></div>
    <div class="tile"><div class="tile-label">Distinct rules</div><div class="tile-value">${ruleCounts.length}</div><div class="tile-sub">across ${areaCounts.length} areas</div></div>
    ${
      repo.hasPrReviewer
        ? `<div class="tile accent2"><div class="tile-label">Missed by existing review</div><div class="tile-value">${repo.uniqueCount}<span class="tile-of">/${repo.findingsCount}</span></div><div class="tile-sub">${repo.prReviewers.map(esc).join(', ') || 'reviewer'} caught ${repo.alsoFoundCount}${repo.prsWithReviewerComments != null ? ` · reviewed ${repo.prsWithReviewerComments}/${repo.prsReviewed} PRs` : ''}</div></div>`
        : '<div class="tile"><div class="tile-label">Missed by existing review</div><div class="tile-value muted">n/a</div><div class="tile-sub">no PR reviewer on this repo</div></div>'
    }
  </section>

  <div class="grid">
    <section class="panel"><h3>Findings by area</h3>${list(areaCounts, maxArea, 'fill-2', 'area')}</section>
    <section class="panel"><h3>Findings by rule</h3>${list(ruleCounts, maxRule, 'fill-1', 'rule')}</section>
    <section class="panel"><h3>Hottest files</h3>${list(fileCounts, maxFile, 'fill-3', 'file')}</section>
    <section class="panel"><h3>PRs reviewed by category</h3>${list(repo.categories, repo.categories.length ? repo.categories[0].count : 0, 'fill-4', 'category')}</section>
    <section class="panel"><h3>PRs with most findings</h3>${list(prCounts.map((p) => ({ key: `#${p.key}`, count: p.count })), prCounts.length ? prCounts[0].count : 0, 'fill-1', 'pr')}</section>
  </div>

  <section class="panel">
    <h3>All findings <span class="muted">(click a row for the offending code)</span></h3>
    <div class="tablewrap"><table class="findings">
      <thead><tr><th>Rule</th><th>Area</th><th>PR</th><th>Location</th><th>Severity</th><th>Conf.</th><th title="Whether this repository's own PR reviewer flagged the same defect. Click a reviewer to open their comment.">Also found by</th><th>What's wrong</th></tr></thead>
      <tbody>${findingRows}</tbody>
    </table></div>
  </section>
  ${ideaPanel}`;
}

function renderHtml(data) {
  // Precomputed for the ranking table.
  data.repos.forEach((r) => {
    r.topAreas = countBy(r.findings, (f) => f.area).slice(0, 3);
  });

  const tabs = [
    { id: 'rules', label: 'Rules' },
    { id: 'ideas', label: `Ideas (${data.ideas.length})` },
    { id: 'repos', label: 'Repositories' },
    ...data.repos.map((r) => ({ id: `repo-${r.name}`, label: r.name })),
  ];

  const nav = tabs
    .map((t, i) => `<button class="tab${i === 0 ? ' active' : ''}" data-tab="${esc(t.id)}">${esc(t.label)}</button>`)
    .join('');

  const panels = [
    `<div class="tabpanel active" id="tab-rules">${renderOverview(data)}</div>`,
    `<div class="tabpanel" id="tab-ideas">${renderIdeas(data)}</div>`,
    `<div class="tabpanel" id="tab-repos">${renderRepoRanking(data)}</div>`,
    ...data.repos.map((r) => `<div class="tabpanel" id="tab-repo-${esc(r.name)}">${renderRepoTab(r)}</div>`),
  ].join('\n');

  const skipped = data.emptyRepos.length
    ? `<p class="footnote">No findings data yet: ${data.emptyRepos.map((n) => `<span class="mono">${esc(n)}</span>`).join(', ')}.</p>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>sdlc-rules benchmark dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
/* Practica brand tokens. Light theme only — teal is the sole accent.
   Every bar in this dashboard encodes magnitude, not identity, so they all share
   one hue by design; length is the encoding. */
:root {
  color-scheme: light;
  --bg: #f8f9fa;
  --card: #ffffff;
  --surface-2: #f1f3f5;
  --border: #e2e4e8;
  --fg: #28282a;
  --muted: #6b7280;
  --subtle: #9aa1ab;
  --primary: #0d9488;
  --primary-soft: #5eccc2;
  --primary-wash: #e6f5f3;
  --warning: #b45309;
  --critical: #b91c1c;
  --radius: 12px;
  --radius-lg: 20px;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: 'Inter', system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
.mono { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; font-size: 0.9em; }
.wrap { max-width: 1500px; margin: 0 auto; padding: 3rem 1.5rem 5rem; }
header.page { margin-bottom: 1.75rem; }
header.page .label { font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .12em; color: var(--primary); }
header.page h1 { font-size: 2.25rem; font-weight: 800; letter-spacing: -0.02em; margin: .15rem 0 .35rem; }
header.page p { margin: 0; color: var(--muted); font-size: 15px; }
nav.tabs {
  display: flex; flex-wrap: wrap; gap: .35rem;
  border-bottom: 1px solid var(--border);
  margin: 2rem 0 1.5rem;
  position: sticky; top: 0; background: var(--bg); z-index: 5;
}
.tab {
  appearance: none; border: 0; background: none; cursor: pointer;
  font: inherit; font-weight: 600; font-size: .9rem;
  padding: .65rem 1rem; color: var(--muted);
  border-bottom: 2px solid transparent; margin-bottom: -1px; border-radius: 8px 8px 0 0;
}
.tab:hover { color: var(--fg); background: var(--surface-2); }
.tab.active { color: var(--primary); border-bottom-color: var(--primary); }
.tabpanel { display: none; }
.tabpanel.active { display: block; }
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.tile {
  background: var(--card); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 1.15rem 1.35rem; box-shadow: 0 1px 3px rgba(0,0,0,.04);
}
.tile.accent { border-color: var(--primary); background: var(--primary-wash); }
/* The incumbent-review dimension: how much the skill found that the repo's own
   PR reviewer did not. Deliberately a different hue from the teal primary so it
   reads as a separate axis rather than another slice of the same number. */
.tile.accent2 { border-color: #7c3aed; background: #f3eefe; }
.tile-of { font-size: 1.05rem; font-weight: 600; color: var(--muted); letter-spacing: 0; }
.reviewer {
  display: inline-block; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .72rem;
  background: var(--surface-2); color: var(--muted); border-radius: 4px; padding: .1rem .35rem;
  white-space: nowrap;
}
a.reviewer.caught { color: #6d28d9; background: #f3eefe; text-decoration: none; border-bottom: 1px dotted #a78bfa; }
a.reviewer.caught:hover { background: #e9dcfd; }
.uniq {
  display: inline-block; font-size: .72rem; font-weight: 600; white-space: nowrap;
  color: #0f766e; background: var(--primary-wash); border-radius: 4px; padding: .1rem .4rem;
}
.tile-label { color: var(--muted); font-size: .72rem; font-weight: 600; text-transform: uppercase; letter-spacing: .1em; }
.tile-value { font-size: 2rem; font-weight: 800; letter-spacing: -0.03em; line-height: 1.2; margin-top: .3rem; }
.tile-value.small-value { font-size: .95rem; font-weight: 700; word-break: break-all; line-height: 1.4; margin-top: .5rem; }
.tile-value-sub { font-size: 1rem; font-weight: 500; color: var(--muted); }
.tile-sub { color: var(--muted); font-size: .8rem; margin-top: .15rem; line-height: 1.45; }
.panel {
  background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: 1.5rem 1.75rem; margin-bottom: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,.04);
}
.panel h2 { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.01em; margin: 0 0 .4rem; }
.panel h3 { font-size: .95rem; font-weight: 600; margin: 0 0 .85rem; }
.note { color: var(--muted); font-size: .82rem; line-height: 1.6; margin: 0 0 1rem; max-width: 105ch; }
.note.warn { border-left: 2px solid var(--warning); padding-left: .75rem; }
.footnote { color: var(--subtle); font-size: .82rem; }
.tablewrap { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; font-size: .82rem; }
th {
  text-align: left; font-weight: 600; color: var(--muted); padding: .5rem .65rem;
  border-bottom: 1px solid var(--border); white-space: nowrap;
  font-size: .72rem; text-transform: uppercase; letter-spacing: .06em;
}
td { padding: .5rem .65rem; border-bottom: 1px solid var(--surface-2); vertical-align: top; }
tbody tr:last-child td { border-bottom: 0; }
td.num, td.numcell { white-space: nowrap; }
td.num { text-align: right; font-variant-numeric: tabular-nums; }
td.rank { color: var(--subtle); width: 28px; }
td.k { max-width: 340px; overflow-wrap: anywhere; }
td.desc { color: var(--muted); min-width: 340px; }
td.small, .small { font-size: .76rem; }
.strong { font-weight: 600; color: var(--fg); }
.muted { color: var(--subtle); }
.empty { color: var(--subtle); font-size: .82rem; }
.bar { display: inline-block; width: 110px; height: 8px; background: var(--surface-2); border-radius: 4px; vertical-align: middle; overflow: hidden; }
.bar-fill { display: block; height: 100%; border-radius: 4px; }
.fill-1, .fill-2 { background: var(--primary); }
.fill-3, .fill-4 { background: var(--primary-soft); }
.barnum { display: inline-block; min-width: 28px; margin-left: .55rem; text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
table.mini td { border-bottom: 1px solid var(--surface-2); padding: .35rem .5rem; }
.chip {
  display: inline-block; padding: .05rem .55rem; border-radius: 999px; font-size: .7rem; font-weight: 500;
  white-space: nowrap; border: 1px solid var(--border); background: var(--surface-2); color: var(--muted);
}
.conf { font-size: .7rem; font-weight: 600; padding: .05rem .5rem; border-radius: 999px; white-space: nowrap; }
.conf-high { background: #fdeaea; color: var(--critical); }
.sev { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.sev-error { background: #fdeaea; color: var(--critical); }
.sev-warning { background: #fff4e5; color: #9a5b00; }
.sev-informative { background: var(--surface-2); color: var(--muted); }
.sev-unspecified { background: var(--surface-2); color: var(--muted); }
.conf-medium { background: var(--surface-2); color: var(--muted); }
.tag {
  font-size: .62rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em;
  color: var(--warning); border: 1px solid currentColor; border-radius: 4px; padding: 0 .3rem; white-space: nowrap;
}
td.idea-rule { min-width: 460px; max-width: 820px; color: var(--fg); }
.tag-cluster { color: var(--primary); }
.idea-why { display: block; color: var(--muted); font-size: .95em; margin-top: .25rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); gap: 1.25rem; margin-bottom: 1.25rem; align-items: start; }
.grid .panel { margin-bottom: 0; }
.repo-head { margin-bottom: 1.25rem; }
.repo-head h2 { margin: 0 0 .4rem; font-size: 1.6rem; font-weight: 800; letter-spacing: -0.02em; }
.meta-row { display: flex; flex-wrap: wrap; gap: .9rem; color: var(--muted); font-size: .78rem; }
.meta-row strong { color: var(--fg); font-weight: 600; }
a { color: var(--primary); }
a.ext { text-decoration: none; font-size: 1rem; }
.finding-row { cursor: pointer; }
.finding-row:hover td { background: var(--primary-wash); }
.code-row pre {
  margin: 0; padding: .75rem .9rem; background: var(--surface-2); border-radius: 10px; overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .76rem; color: var(--muted); line-height: 1.55;
}
</style>
</head>
<body>
<div class="wrap">
<header class="page">
  <h1>sdlc-rules benchmark</h1>
  <p>${data.totals.findings} findings and ${data.totals.ideas} candidate rule ideas across ${data.totals.prsReviewed} reviewed pull requests in ${data.totals.repos} repositories.</p>
</header>
<nav class="tabs">${nav}</nav>
${panels}
${skipped}
</div>
<script>
(function () {
  var tabs = document.querySelectorAll('.tab');
  function show(id) {
    document.querySelectorAll('.tabpanel').forEach(function (p) { p.classList.toggle('active', p.id === 'tab-' + id); });
    tabs.forEach(function (t) { t.classList.toggle('active', t.dataset.tab === id); });
    window.scrollTo(0, 0);
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { show(t.dataset.tab); }); });
  document.querySelectorAll('.repolink').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); show('repo-' + a.dataset.repo); });
  });
  document.querySelectorAll('.finding-row').forEach(function (row) {
    row.addEventListener('click', function () {
      var next = row.nextElementSibling;
      if (next && next.classList.contains('code-row')) next.hidden = !next.hidden;
    });
  });
})();
</script>
</body>
</html>
`;
}

// ------------------------------------------------------------------------ main

const data = build();
fs.writeFileSync(OUT, renderHtml(data));
if (process.argv.includes('--json')) console.log(JSON.stringify(data, null, 2));
console.error(
  `dashboard.html written — ${data.totals.findings} findings, ${data.totals.repos} repos with data` +
    (data.emptyRepos.length ? `, skipped (no data): ${data.emptyRepos.join(', ')}` : '')
);
