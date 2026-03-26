# PROJECT RUST FORGE: Viability Assessment (Rust + Zig Split Architecture)

## Context

RPBW has a spec for "Swarm-to-Solo Architecture" — a 3-phase pipeline to rewrite AI infrastructure bottlenecks using autonomous AI agents. The architecture now splits across **two languages by domain**:

- **Rust** — Network layer, async event loops, state machines (litellm router, Unstructured chunking)
- **Zig** — Raw math, GPU memory management, C-interop (llama.cpp ggml, vLLM PagedAttention)

**RPBW's position:** Direct relationship with Autonomy.computer founder (demos watched, project spawning understood). Intent is a **mix of commercial product AND technical R&D** — prove the AI-assisted rewrite pipeline works as a capability, AND potentially ship modules as a sellable product/service.

---

## TL;DR Verdict

**The pipeline concept is sound AND the decomposition strategy handles scale. The Rust+Zig split is architecturally correct. The tooling is 60% ready.**

The Swarm-to-Solo pipeline is designed for exactly this problem: Breadcrumbs decompose massive codebases into file-level units with narrow, explicit contracts. Ralph works one `todo!()` / `unreachable` at a time on a tight remit. The escalation matrix (Haiku → Sonnet → Opus → human engineer) handles complexity gracefully.

**The Rust+Zig split eliminates a class of problems.** Using Rust for raw C-interop ML math means fighting the borrow checker over hardware pointers, wrapping everything in `unsafe {}`. Zig solves this cleanly: drop-in C interop (zig cc IS a C compiler), arena allocators purpose-built for ML inference loops, and no hidden control flow. Rust stays where it excels — safe async networking and state machines.

**Remaining risks are integration, not scope:** individually-correct files may have cross-cutting type dependencies that only surface at workspace-level compilation. Phase 2 skeleton generation mitigates this for Rust; for Zig, the C ABI compatibility means individual functions can be swapped incrementally without breaking the existing codebase.

**The tooling gap** is real: Ralph needs both `cargo check` AND `zig build test` gates, Breadcrumb compression is untested, and Claude's Zig training data is thinner than Rust. Autonomy integration is just onboarding (point at repo, pull breadcrumb branch). None of these are architectural blockers.

---

## Pipeline Feasibility (Phase by Phase)

### Phase 1: Cloud Sweep — ACHIEVABLE (needs onboarding)

| Component | Status | Reality |
|-----------|--------|---------|
| Autonomy.computer | Live product, 0% integrated, **founder relationship** | Autonomy is a **live PaaS** (founded Sept 2025) for distributed agent workloads. RPBW has direct founder access, has watched demos, and understands project spawning. Integration gap is purely technical (SDK setup, agent code for @crumb injection), not access or relationship. |
| Breadcrumb @crumb spec | 95% designed | Well-specified but **never empirically validated**. The A/B test framework exists with 564 lines of rigorous design — but produced zero results. |
| "40k lines → 100k tokens" claim | Untested | No benchmark data supports this. Could be accurate or wildly wrong. |

**Autonomy Integration (simplified):**

Autonomy handles the sweep end-to-end. We don't build custom infrastructure — we just consume the output:

1. Point Autonomy at the target repo (e.g., `BerriAI/litellm`, `ggerganov/llama.cpp`)
2. Autonomy swarm sweeps files, injects `@crumb` blocks (`@intent`, `@contracts`, `@hazards`)
3. Autonomy commits annotated files to a branch on GitHub (e.g., `autonomy/breadcrumbs`)
4. We `git pull` that branch — the Breadcrumb reports are now local

**That's it.** No custom zones, no worker orchestration, no API endpoints on our side. Autonomy is the cloud sweep tool; we're the consumer. Founder relationship means onboarding is a conversation, not a build project.

**Cost estimate:** ~$0.003/file (Sonnet) × 500 files = ~$1.50-$7.50 depending on file complexity.

**Fallback for small targets (<50 files):** Claude Code local — read source files directly and inject @crumb blocks via scripted passes. No Autonomy dependency needed.

### Phase 2: Skeleton Generation — VIABLE (Dual-Language)

**Rust skeletons:**
- The `todo!()` skeleton approach works because Breadcrumbs provide narrowed scope: each file's `@contracts` defines exact API surface, types, and error cases
- Skeleton generation can be module-by-module, with top-level `Cargo.toml` + trait definitions as shared context
- `cargo check` gate catches type signature issues. Compiler tells you exactly what's wrong

**Zig skeletons:**
- `unreachable` replaces `todo!()`. Every function accepts `std.mem.Allocator` as first param.
- `export` keyword on functions callable from legacy C — skeleton defines the C ABI surface
- `zig build-obj` gate validates compilation. Zig errors are more readable than Rust's — faster iteration.
- **Key advantage:** Zig skeleton can be validated against the EXISTING C codebase it's replacing. Compile the `.o`, link it, run existing C tests.

### Phase 3: Ralph Escalation Loop — PROVEN CONCEPT, UNTESTED FOR RUST/ZIG

| Aspect | Status |
|--------|--------|
| Ralph bash loop | Proven across 4+ repos |
| Multi-worktree scaling | Documented, 4 agents proven |
| Model escalation (Haiku→Sonnet→Opus) | **Described but NOT implemented** in ralph.sh |
| `cargo check` integration | **Not built** |
| `zig build test` integration | **Not built** |
| Haiku writing correct Rust | **Questionable** — lifetimes/traits are its weak spot |
| Haiku/Sonnet writing correct Zig | **Unknown** — less training data, but Zig is simpler than Rust |

**Key risks:**
- Rust: Haiku will likely escalate to Opus on non-trivial functions (lifetimes, traits)
- Zig: Less AI training data, but Zig's simplicity and readable errors may compensate. Expect Sonnet minimum, not Haiku.
- Both: Ralph needs dual compiler backends — straightforward but doubles the gate configuration work

---

## The Rust+Zig Split Architecture

### Why Two Languages

The split follows the hardware boundary:

| Domain | Language | Why |
|--------|----------|-----|
| **Network / async / state machines** | Rust | Borrow checker + `tokio` = safe concurrent networking. Axum, hyper, tower ecosystem. No data races by construction. |
| **Raw math / GPU memory / C-interop** | Zig | `zig cc` IS a C compiler — drop-in function replacement. Arena allocators for ML inference. No hidden control flow. No FFI boilerplate. |

**The anti-pattern this avoids:** Using Rust for llama.cpp's tensor math means 90% of time fighting the borrow checker over raw hardware pointers, wrapping everything in `unsafe {}` blocks. At that point you've lost Rust's safety guarantees AND paid its complexity tax.

### Zig-Specific Pipeline Adjustments

The 3-phase pipeline works for both languages with targeted modifications:

**Phase 1 (Cloud Sweep):** Identical. Autonomy sweeps `.c`/`.h` files same as `.py`. Breadcrumb `@contracts` and `@hazards` capture the memory patterns and C ABI surface.

**Phase 2 (Skeleton — Zig Mode):** Opus generates `.zig` files with:
- `export` on functions callable from legacy C code
- Every function accepts `std.mem.Allocator` as first parameter (no global allocators)
- `unreachable` instead of `todo!()` for function bodies
- Zig error unions (`!void`) for memory failure paths

**Phase 3 (Ralph Loop — Zig):**
- Compiler gate: `zig build test` (or `zig build-obj` for C-linkable objects)
- Prompt: "Replace `unreachable` with Zig logic. Manage memory via provided Allocator. Return error unions for OOM."
- Exit criteria: `<promise>ZIG_COMPILED</promise>`
- Zig compiler errors are highly readable — expect 1-3 Ralph iterations vs Rust's 3-7

### Zig Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Claude's Zig training data is thinner than Rust | High | Start with Sonnet/Opus (not Haiku). Zig's simplicity helps — fewer gotchas than Rust lifetimes. |
| Zig ecosystem is smaller (fewer libs) | Medium | For llama.cpp/vLLM targets, you're replacing C, not building greenfield. No library dependency needed. |
| Zig is pre-1.0 (0.13.x) | Medium | Target stable subset. ML math functions don't need cutting-edge language features. |
| Two toolchains = two sets of CI/gates | Low | Ralph already supports multiple compiler backends conceptually. Adding `zig build` alongside `cargo check` is straightforward. |

---

## Target Project Rankings

### Rust Targets (Network / Async / State Machines)

#### 1. Unstructured PDF Chunking — BEST RUST TARGET

- **Why:** Python GIL is a real, measurable bottleneck for CPU-bound PDF processing
- **Scope:** Target ONLY the chunking pipeline, not the 25+ document format integrations
- **Distribution:** Ship as PyO3 module — drops into existing Python workflows
- **Competition:** Weakest Rust alternatives in this space (pdf_oxide, Extractous exist but don't do RAG-level chunking)
- **Market:** Real demand — Pinecone, Weaviate, Qdrant customers need faster ingestion

#### 2. litellm HTTP Router — VIABLE BUT CROWDED

- **Why:** Request routing at 5,000+ RPS genuinely bottlenecks in Python
- **Scope:** Only the dispatcher/load balancer (~2-5k LOC), NOT the 100+ provider adapters
- **Problem:** Bifrost (Rust, 11μs latency, 2,273x faster than OpenRouter) and TensorZero already exist and have production deployments
- **Path:** Only viable as upstream contribution to BerriAI, not standalone product

### Zig Targets (Raw Math / GPU Memory / C-Interop)

#### 3. llama.cpp ggml Tensor Math — BEST ZIG TARGET

- **Why:** `ggml.c` and `ggml-alloc.c` are pure C with manual `malloc()`/`free()` managing tensor memory. This is exactly what Zig arena allocators replace.
- **Scope:** Core tensor math library only — NOT the model loading, tokenization, or sampling layers
- **Approach:** Replace one function at a time. `export` the Zig function, legacy C calls it without knowing it's Zig. Incremental, non-breaking.
- **Distribution:** Compile as `.o` object file, link into existing llama.cpp build. Users get faster inference with zero migration effort.
- **Risk:** llama.cpp moves fast (Georgi Gerganov actively maintains). Must track upstream or contribute upstream.

#### 4. vLLM PagedAttention CPU-Side Memory — VIABLE ZIG TARGET

- **Why:** The C++ custom ops in `csrc/` manage GPU memory blocks from CPU side. PagedAttention's paging logic is exactly arena-allocator territory.
- **Scope:** CPU-side memory block management only — NOT the CUDA kernels (those stay in CUDA)
- **Approach:** Rewrite the paging/allocation logic in Zig, export C-compatible functions
- **Risk:** CUDA kernel boundaries are hard to test without GPU hardware. CPU-side logic can be validated independently.

### Skip

#### LangGraph Execution Engine — SKIP

- Users choose LangGraph for ecosystem, not performance
- Anyone needing high-performance agent state machines builds custom

---

## Critical Gaps (Must Fix Before ANY Execution)

| # | Gap | Severity | Fix |
|---|-----|----------|-----|
| 1 | **No Rust toolchain installed** | Blocking | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| 2 | **No Zig toolchain installed** | Blocking | `brew install zig` or download from ziglang.org. Verify: `zig version` (expect 0.13.x) |
| 3 | **Breadcrumb A/B test never ran** | Blocking | Execute existing benchmark in codesignal-20 — infrastructure is ready |
| 4 | **Autonomy.computer not integrated** | Low | Founder relationship exists. Onboarding conversation — point Autonomy at target repo, pull the breadcrumb branch. No custom build needed. |
| 5 | **Ralph has no model escalation** | High | Modify ralph.sh to support tier-based model switching on failure |
| 6 | **Ralph needs dual compiler gates** | High | Add `cargo check` AND `zig build test` as backpressure gates alongside existing lint/test gates |
| 7 | **No Rust or Zig code has ever been written here** | High | Prove both: trivial Axum server (Rust) + trivial C-interop function (Zig) |
| 8 | **Claude's Zig proficiency untested** | High | Test: can Sonnet/Opus write correct Zig from @crumb contracts? Haiku likely cannot. |
| 9 | **No cost model** | Medium | What's the current AWS spend? What's the break-even vs. dev time? |

---

## Recommended First Milestone (~3 days, <$75 API credits)

A validation sequence that answers every critical unknown for BOTH language tracks:

### Track A: Rust Validation (Days 1-2)

1. **Install Rust** — rustup, cargo, clippy, rustfmt. Build trivial Axum HTTP server. Prove environment works.

2. **Run Breadcrumb A/B test** — Execute existing benchmark against codesignal-20. Get real token reduction numbers. If Breadcrumb doesn't measurably reduce context usage, Phase 1 premise collapses.

3. **Build Ralph-Rust integration** — Modify ralph.sh to run `cargo check`. Test on trivial 3-5 function Rust project with `todo!()` bodies. Measure: How many iterations does Haiku need? Does it always escalate to Opus?

4. **One real Rust module** — Pick a specific Python function from Unstructured's PDF chunking. Write the @crumb block. Generate skeleton. Run Ralph loop. Benchmark Rust vs Python.

### Track B: Zig Validation (Days 2-3)

5. **Install Zig** — `brew install zig`. Build trivial C-interop proof: write one math function in Zig, `export` it, compile as `.o`, link and call from a C program. Prove the drop-in replacement story works.

6. **Test Claude's Zig proficiency** — Give Opus a @crumb block from a real `ggml.c` function. Can it generate correct Zig with arena allocators and error unions? Measure: how many `zig build` iterations to compile? This answers the "can AI write Zig?" question.

7. **Build Ralph-Zig integration** — Add `zig build test` gate to ralph.sh alongside `cargo check`. Test on trivial 3-function Zig project with `unreachable` bodies.

### Track C: Platform (Day 3)

8. **Autonomy onboarding** — Point Autonomy at a small test repo (or a single folder from litellm/llama.cpp). Pull the breadcrumb branch. Verify @crumb blocks are well-formed and match the Breadcrumb spec. This is a conversation with the founder + a `git pull`, not a build project.

This proves or disproves the entire dual-language pipeline before committing to larger scope.

---

## Commercial + R&D Dual Track

Given RPBW's mixed intent (prove the capability AND ship product):

**R&D Track (prove pipeline):** Track A (Rust, Steps 1-4) + Track B (Zig, Steps 5-7). Validates whether Breadcrumb compression works, whether Ralph can drive BOTH Rust and Zig compilation loops, and whether Claude can write correct Zig. This is prerequisite for everything.

**Commercial Track — Two Products:**

1. **Rust PDF Chunker** (Step 4 → product): PyO3 module that benchmarks 5-10x faster than Python for RAG ingestion. Open-source, target Pinecone/Weaviate/Qdrant ecosystem. Enterprise support as revenue model.

2. **Zig-accelerated llama.cpp** (Step 6 → product): Arena-allocator-optimized tensor math that drops into existing llama.cpp builds. Contribute upstream to ggerganov/llama.cpp, or ship as performance fork. The local AI inference market is massive and growing.

**The Autonomy angle:** Autonomy is the scaling lever — point it at a repo, pull the breadcrumb branch. Once pipeline is proven locally, Autonomy processes entire repos (C AND Python) via cloud swarms. Integration is onboarding, not engineering.

**The meta-product:** The pipeline ITSELF (Breadcrumb + Autonomy sweep + Ralph dual-compiler loop) is a sellable capability — "AI-assisted systems language migration as a service."

---

## What's Genuinely Strong

- **Ralph is real.** Not a concept — a working autonomous loop with shipped features across production codebases
- **Breadcrumb is well-designed.** Structured metadata for context compression is a good idea regardless of Rust Forge
- **Module-by-module skeleton + compiler-driven iteration is plausible.** The methodology works for both Rust and Zig targets
- **The Rust+Zig split is architecturally sound.** Right tool for right domain. Rust for safe networking, Zig for hardware-level C-interop. Avoids the `unsafe {}` anti-pattern.
- **Zig's incremental replacement story is compelling.** Rewrite one C function, export it, legacy codebase doesn't know. Zero migration friction.
- **PDF/RAG chunking has real market demand.** Enterprises DO hit Python GIL bottlenecks at scale
- **llama.cpp ggml has real performance headroom.** Arena allocators replacing manual malloc/free is a measurable improvement path

## What's Unproven (Needs Validation)

- Autonomy @crumb output quality (live product, founder relationship, simple git-branch handoff — but never tested with Breadcrumb spec)
- "Haiku writes Rust cheaply" (will likely escalate to Opus on many non-trivial functions — cost model TBD)
- **Claude writing correct Zig at all** — less training data than Rust. Zig's simplicity may help, but this is the #1 unknown for the Zig track
- "70%+ cost savings" without any cost model or baseline AWS spend measurement
- "40,000 lines compressed to 100,000 tokens" — Breadcrumb compression ratio is untested
- Cross-file integration at scale — mitigated by Phase 2 skeleton for Rust; mitigated by C ABI compatibility for Zig

**Note on scope:** Full rewrites ARE tractable via this pipeline. Breadcrumbs decompose to file-level units with narrow contracts. Ralph works one `todo!()` / `unreachable` at a time on a tight remit. The escalation matrix (Haiku → Sonnet → Opus → human engineer) handles complexity gracefully. For Zig targets, the incremental function-by-function replacement strategy means you never break the existing C codebase.

---

## Status

**Plan: APPROVED** (2026-03-06)
**Execution: NOT STARTED**
**Next step:** Track A Step 1 — Install Rust toolchain
