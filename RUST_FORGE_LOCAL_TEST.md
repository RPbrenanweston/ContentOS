# RUST FORGE: Local Validation Prompt

> **Context for Claude Code:** This is a self-contained testing prompt for validating two critical unknowns in the Rust Forge pipeline: (1) Do Breadcrumb annotations measurably reduce AI agent token consumption? (2) Can the Rust toolchain + Ralph compiler-gate loop work for autonomous code generation? Execute each track sequentially. Report binary PASS/FAIL per step.

---

## Project Context

**Rust Forge** is a 3-phase pipeline to rewrite AI infrastructure bottlenecks from Python into Rust using autonomous AI agents:

1. **Cloud Sweep** — Annotate legacy code with structured `@crumb` metadata (Breadcrumbs)
2. **Skeleton Generation** — Generate Rust files with `todo!()` bodies and correct type signatures
3. **Ralph Escalation Loop** — Autonomous compiler-driven iteration: fill `todo!()` bodies, run `cargo check`, escalate model tier on failure (Haiku → Sonnet → Opus → human)

**This prompt validates Phases 1 and 3 locally.** Phase 2 depends on Phase 1 results.

**Working directory:** `/Users/robertpeacock/Desktop/Claude code/`

This is the `shared-ai-layer` root repo. The Breadcrumb infrastructure lives in `codesignal-20/` (a nested project).

---

## TRACK A: Breadcrumb Validation

### What We're Testing

Do inline code breadcrumbs (structured JSDoc comments describing module architecture, relationships, and gotchas) reduce agent token consumption when solving coding problems?

**Target:** >=10% token reduction with p < 0.05 statistical significance.

### Existing Infrastructure

All Breadcrumb testing infrastructure already exists but has **never been executed**:

| File | Path | Status |
|------|------|--------|
| A/B Test Framework Design | `codesignal-20/scripts/breadcrumb-ab-test.md` | Complete (564 lines) |
| A/B Test Runner | `codesignal-20/scripts/ab-test-runner.ts` | Scaffold only — sample-mode, NOT calling real API |
| Breadcrumb Implementation PRD | `codesignal-20/tasks/prd-breadcrumb-implementation.md` | Complete |
| A/B Test PRD | `codesignal-20/tasks/prd-breadcrumb-ab-test.md` | Complete (6 user stories) |
| Benchmark Tool | `codesignal-20/scripts/breadcrumb-benchmark.ts` | Exists (7.7KB) |
| Benchmark Analysis | `codesignal-20/scripts/breadcrumb-benchmark-analysis.ts` | Exists (9.6KB) |
| Results JSON | `codesignal-20/results/breadcrumb-benchmark-results.json` | Empty |
| Results Analysis | `codesignal-20/results/breadcrumb-analysis.json` | Empty |

### Step A1: Read Existing Infrastructure

Read these files to understand the full test design before making changes:

```
codesignal-20/scripts/breadcrumb-ab-test.md
codesignal-20/scripts/ab-test-runner.ts
codesignal-20/tasks/prd-breadcrumb-ab-test.md
```

The A/B test design document (`breadcrumb-ab-test.md`) contains:
- Section 1: Test design (within-subject crossover, counterbalancing)
- Section 2: Three test problems (P1=debug, P2=implement, P3=optimize)
- Section 3: Measurement harness (TrialResult interface)
- Section 4: Ralph loop integration
- Section 5: Decision framework (Ship/Validate/Extend/Don't Invest)
- Section 6: Breadcrumb injection templates (full JSDoc examples)
- Section 7: Quick-start checklist

### Step A2: Create Treatment Branch

Create git branch `ab-treatment` from `main` in the `codesignal-20/` directory. Inject breadcrumb JSDoc comment blocks at the top of these 4 files:

1. `src/agents/codesignal/quality.ts` — Document: 4-pass architecture, known `.filter()` bug, pass sequence, dependencies
2. `src/agents/codesignal/hybrid-discovery.ts` — Document: architecture steps, key interfaces, dependencies, gotchas
3. `src/agents/codesignal/hybrid-discovery.test.ts` — Document: test helper patterns, describe block structure
4. `src/shared/types.ts` — Document: GatingConfig shape, ValidatedProfile shape, SignalName enum

**Use the exact breadcrumb templates from Section 6 of `breadcrumb-ab-test.md`.** Breadcrumbs are JSDoc comments ONLY — no functional code changes.

Commit with message: `chore: inject breadcrumbs for A/B treatment arm`

Switch back to `main` after commit. Verify typecheck passes on both branches.

### Step A3: Add npm Script Entry Point

Add to `codesignal-20/package.json` scripts:
```json
"test:breadcrumbs": "bun scripts/ab-test-runner.ts"
```

Verify `bun scripts/ab-test-runner.ts` runs without import errors. Create `results/` directory if it doesn't exist.

### Step A4: Activate Real Execution Loop

Replace the sample-data generation block in `ab-test-runner.ts` `main()` with a real execution loop:

For each problem (P1, P2, P3), for each arm (control, treatment), for N=5 trials:
1. Checkout `main` for control or `ab-treatment` for treatment
2. Read relevant source files into prompt context
3. Call Anthropic API: model `claude-3-5-haiku-20241022`, temperature 0, max_tokens 8192
4. Capture `usage.input_tokens`, `usage.output_tokens` from response
5. Measure wall-clock time
6. Run keyword verification on output

**Counterbalancing:** P1=Control-first, P2=Treatment-first, P3=Control-first

**Early stopping:** After N=3 trials per arm per problem:
- If p < 0.01 → skip remaining trials for that problem
- If effect size < 5% → skip remaining trials for that problem

**Safety:** 120-second timeout per API call. $1.00 total cost cap. Check `ANTHROPIC_API_KEY` at startup.

Write results incrementally to `results/breadcrumb-ab-test-results.json` (crash resilience).

### Step A5: Execute the A/B Test

Run: `cd codesignal-20 && bun scripts/ab-test-runner.ts`

**Expected output:** `results/breadcrumb-ab-test-results.json` with 30 TrialResult objects (or fewer if early-stopped).

### Step A6: Generate Statistical Report

Generate `results/breadcrumb-ab-test-report.md` containing:
- Overall Summary table: Metric | Control | Treatment | Delta
- Per-problem breakdown: Problem | N | Control Tokens | Treatment Tokens | Reduction % | p-value
- Effect Size: Cohen's d per problem with interpretation
- 95% confidence interval for token reduction
- Statistical Conclusion: Significant/Not Significant at alpha=0.05
- Decision Recommendation: Ship / Validate / Extend / Don't Invest

**Decision framework (from breadcrumb-ab-test.md Section 5.1):**

| | p < 0.05 | p >= 0.05 |
|---|---|---|
| **Effect >= 10%** | SHIP | VALIDATE (extend N) |
| **Effect 5-10%** | VALIDATE | EXTEND (more problems) |
| **Effect < 5%** | DON'T INVEST | DON'T INVEST |

### Track A Success Criteria

- [ ] `ab-treatment` branch exists with breadcrumbs in 4 files
- [ ] Typecheck passes on both branches
- [ ] `test:breadcrumbs` script works
- [ ] Runner calls real Anthropic API (not sample data)
- [ ] `results/breadcrumb-ab-test-results.json` has valid trial data
- [ ] `results/breadcrumb-ab-test-report.md` generated with all required tables
- [ ] Decision recommendation produced (Ship/Validate/Extend/Don't Invest)
- [ ] Total cost <= $1.00

---

## TRACK B: Rust Toolchain + Ralph Integration

### What We're Testing

Can the Rust compilation loop work as an autonomous code generation pipeline? Specifically:
1. Does the Rust toolchain install and work on this machine?
2. Can `cargo check` serve as a compiler gate for Ralph?
3. Can Haiku/Sonnet fill `todo!()` bodies that pass `cargo check`?

### Step B1: Install Rust Toolchain

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
rustup component add clippy rustfmt
```

Verify:
```bash
rustc --version    # expect 1.x.x
cargo --version    # expect 1.x.x
clippy-driver --version
rustfmt --version
```

### Step B2: Build Trivial Axum HTTP Server

Create a new Rust project at `/Users/robertpeacock/Desktop/Claude code/rust-forge-test/`:

```bash
cargo new rust-forge-test
cd rust-forge-test
```

Add dependencies to `Cargo.toml`:
```toml
[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
```

Write a minimal Axum server in `src/main.rs`:
```rust
use axum::{routing::get, Router};

async fn health() -> &'static str {
    "ok"
}

#[tokio::main]
async fn main() {
    let app = Router::new().route("/health", get(health));
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3333").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

Verify:
```bash
cargo check    # must pass
cargo clippy   # must pass
cargo build    # must compile
```

### Step B3: Create todo!() Skeleton Project

Create a second Rust project to test the Ralph skeleton → implementation loop:

```bash
cargo new rust-forge-skeleton
cd rust-forge-skeleton
```

Write `src/lib.rs` with 5 functions that have `todo!()` bodies but correct type signatures:

```rust
/// Parse a CSV line into fields, handling quoted fields with commas.
pub fn parse_csv_line(line: &str) -> Vec<String> {
    todo!()
}

/// Calculate the moving average of a slice with the given window size.
/// Returns empty vec if window_size > data.len() or window_size == 0.
pub fn moving_average(data: &[f64], window_size: usize) -> Vec<f64> {
    todo!()
}

/// Find the longest common subsequence of two strings.
pub fn longest_common_subsequence(a: &str, b: &str) -> String {
    todo!()
}

/// Flatten a nested JSON-like structure into dot-notation keys.
/// Example: {"a": {"b": 1}} -> {"a.b": 1}
pub fn flatten_json(input: &std::collections::HashMap<String, serde_json::Value>) -> std::collections::HashMap<String, serde_json::Value> {
    todo!()
}

/// Rate-limit check: given a list of timestamps and a max count per window,
/// return whether a new request at `now` should be allowed.
pub fn rate_limit_check(timestamps: &[u64], max_per_window: usize, window_secs: u64, now: u64) -> bool {
    todo!()
}
```

Add `serde_json` to `Cargo.toml`:
```toml
[dependencies]
serde_json = "1"
```

Write `tests/integration.rs` with basic test cases for each function. Tests should call the functions with known inputs and assert expected outputs.

Verify: `cargo check` passes (todo!() compiles but panics at runtime).

### Step B4: Test AI-Driven todo!() Implementation

For each of the 5 functions in `src/lib.rs`:

1. **Haiku attempt:** Send the function signature + doc comment to `claude-3-5-haiku-20241022`. Ask it to replace `todo!()` with a working implementation. Paste result into the file. Run `cargo check`.

2. **If Haiku fails `cargo check`:** Send the compiler error back to Haiku for a second attempt. Max 3 attempts.

3. **If Haiku fails after 3 attempts:** Escalate to `claude-3-5-sonnet-20241022`. Same process: implementation + up to 3 `cargo check` iterations.

4. **If Sonnet fails after 3 attempts:** Escalate to `claude-sonnet-4-20250514` (Opus-tier). Max 3 attempts.

**Record for each function:**
- Which model succeeded
- How many `cargo check` iterations needed
- The compiler errors encountered (if any)
- Total tokens consumed per function

After all 5 functions are implemented, run `cargo test` to verify correctness.

### Step B5: Validate cargo check as Ralph Gate

Prove `cargo check` works as a backpressure gate by simulating the Ralph loop:

```bash
# Pseudocode for Ralph-Rust integration test
for each function in lib.rs:
    replace todo!() with AI-generated implementation
    run: cargo check 2>&1
    if exit_code == 0:
        log "PASS on attempt N with model M"
        continue to next function
    else:
        capture stderr
        feed error back to AI
        retry (max 3 per model tier)
        escalate model if needed
```

Document: What percentage of functions compile on first attempt per model tier?

### Track B Success Criteria

- [ ] `rustc --version` returns valid version
- [ ] `cargo check` passes on Axum server project
- [ ] `cargo build` succeeds — binary runs and responds on /health
- [ ] `cargo check` passes on skeleton project (with todo!() bodies)
- [ ] At least 3/5 functions implemented by Haiku or Sonnet that pass `cargo check`
- [ ] All 5 functions pass `cargo test` (any model tier acceptable)
- [ ] Compilation iteration counts recorded per function per model
- [ ] Token costs recorded per function

---

## Overall Success Criteria

| # | Criterion | Track |
|---|-----------|-------|
| 1 | Breadcrumb A/B test executed with real API calls | A |
| 2 | Statistical report generated with decision recommendation | A |
| 3 | Rust toolchain installed and verified | B |
| 4 | Axum server compiles and runs | B |
| 5 | todo!() skeleton compiles | B |
| 6 | AI-driven implementation fills todo!() bodies that pass cargo check | B |
| 7 | Model escalation data collected (which tier succeeds, how many iterations) | B |
| 8 | Total cost (A/B test + Rust attempts) documented | Both |

---

## Execution Order

1. **Track A first** (Breadcrumb validation) — cheaper, faster, validates the foundational premise
2. **Track B second** (Rust toolchain) — requires toolchain install, more exploratory
3. **Report** — Combine findings into a single summary at the end

**Estimated cost:** Track A ~$0.50-$1.00 (Haiku). Track B ~$2.00-$5.00 (mixed models). Total < $10.

**Estimated time:** Track A ~1-2 hours. Track B ~2-3 hours. Total ~3-5 hours.

---

## Key File Paths Reference

```
/Users/robertpeacock/Desktop/Claude code/                    # shared-ai-layer root
/Users/robertpeacock/Desktop/Claude code/codesignal-20/      # Breadcrumb test project
  scripts/
    breadcrumb-ab-test.md          # Full A/B test framework (564 lines)
    ab-test-runner.ts              # Test runner (sample-mode, needs activation)
    breadcrumb-benchmark.ts        # Benchmark tool
    breadcrumb-benchmark-analysis.ts  # Analysis tool
  tasks/
    prd-breadcrumb-implementation.md  # Breadcrumb PRD
    prd-breadcrumb-ab-test.md         # A/B test PRD (6 user stories)
  results/
    breadcrumb-ab-test-results.json   # Empty — will contain trial data
    breadcrumb-ab-test-report.md      # Will be generated
  src/agents/codesignal/
    quality.ts                        # Target file for breadcrumbs + P1 test
    hybrid-discovery.ts               # Target file for breadcrumbs + P2 test
    hybrid-discovery.test.ts          # Target file for breadcrumbs
  src/shared/
    types.ts                          # Target file for breadcrumbs
```
