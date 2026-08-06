# Output JSON Schema

One object per reviewed skill:

```json
{
  "skill": "", "author": "", "rank": 0, "installs": "", "repo": "",
  "overall": 0, "grade": "A|B|C|D|F", "band": "", "verdict": "SAFE|REVIEW|UNSAFE",
  "pillars": {
    "activation": {"score": 0, "checks": [{"id": "ACT-01", "name": "", "result": "pass|warn|fail", "score": 0, "evidence": "", "fix": ""}]},
    "instruction": {"score": 0, "checks": []},
    "structure": {"score": 0, "checks": []},
    "security": {"score": 0, "findings_by_severity": {"critical": 0, "high": 0, "medium": 0, "low": 0}, "checks": []},
    "ops": {"score": 0, "checks": []},
    "evaluations": {"score": 0, "checks": []},
    "workflow": {"score": 0, "applicable": true, "checks": []},
    "maintenance": {"score": 0, "checks": []}
  },
  "token_analysis": {
    "max_tokens": 0,
    "min_tokens": 0,
    "progressive_disclosure_ratio": 0.0,
    "progressive_disclosure_pass": true,
    "scenarios": [
      {"name": "", "description": "", "files_loaded": [], "estimated_tokens": 0}
    ]
  },
  "headline_strengths": ["", ""],
  "headline_fixes": [{"title": "", "impact": "high|medium|low", "before": "", "after": ""}],
  "stats": {"body_lines": 0, "body_words": 0, "desc_words": 0, "desc_chars": 0, "supporting_files": 0, "est_skillmd_tokens": 0},
  "narrative": "2–3 sentence editorial summary in plain language"
}
```

Every failing check must carry `evidence` (quoted line or concrete observation) and `fix` (actionable, ideally before→after).
