# PROJECT RUST FORGE: Swarm-to-Solo Architecture Spec

## 1. Objective
To execute a highly optimized, context-compressed rewrite of critical AI infrastructure bottlenecks from Python/C++ into memory-safe, concurrent Rust. This targets massive AWS cost reductions for enterprise SaaS commercialization.

We are utilizing a **"Swarm-to-Solo"** pipeline. We will use cloud-based agent swarms to map legacy code into strict architectural metadata, and local LLM execution to generate the Rust implementation via compiler-driven iteration.

## 2. The Core Tooling
* **Autonomy:** [https://autonomy.computer/](https://autonomy.computer/) 
    * *Role:* The Cloud Swarm. Used to cheaply parallel-process legacy repositories, extracting architectural intent and injecting metadata without doing any actual code translation.
* **Breadcrumb:** [https://github.com/RPbrenanweston/Breadcrumb](https://github.com/RPbrenanweston/Breadcrumb)
    * *Role:* The Metadata Standard. Provides the `@crumb` block specification (`@intent`, `@contracts`, `@hazards`, `@responsibilities`) to compress millions of tokens of legacy code into pure architectural blueprints.
* **Claude Code (Max Plan) + Ralph Loops:**
    * *Role:* The Local Brain & Executor. Reads the Breadcrumbs to design the Rust skeleton, then relentlessly loops `cargo check` to fill in the logic safely.

## 3. The Architecture (The 3-Phase Pipeline)



### Phase 1: The Cloud Sweep (Context Compression)
Instead of feeding legacy Python/C++ logic into an LLM (which causes hallucination and token bloat), we use an Autonomy swarm to map the code. 
1.  Autonomy agents sweep the target legacy files.
2.  They inject a `Breadcrumb` block at the top of each file, detailing the exact API surface (`@contracts`) and race conditions/memory risks (`@hazards`).
3.  **Result:** 40,000 lines of chaotic code are compressed into ~100,000 tokens of pure architectural specification. The legacy logic is now ignored.

### Phase 2: Spec-Driven Skeleton Generation (The Architect)
1.  Claude (using the Opus model) reads *only* the compiled Breadcrumb blocks.
2.  Claude generates the overarching Rust workspace (`Cargo.toml`, modules, `Structs`, `Traits`, and custom `thiserror::Error` types) that strictly satisfy the `@contracts` and mitigate the `@hazards` using Rust's type system.
3.  **Crucial Constraint:** Claude writes **zero implementation logic** in this phase. Every function body must contain `todo!()` or `unimplemented!()`. The code must pass `cargo check` strictly on its type definitions.

### Phase 3: The Ralph Escalation Loop (The Implementation)
With the skeleton defined and type-checked, we execute a stateless Bash script (the Ralph Loop) to implement the logic.
1.  The loop points a cheaper, faster model (like Claude 3.5 Haiku or Sonnet) at a single file containing `todo!()`.
2.  Prompt: *"Replace `todo!()` with safe Rust logic satisfying the Breadcrumb `@contracts`. Output the code."*
3.  The script runs `cargo check`. 
4.  **The Escalation Matrix:** If it fails, the script wipes the context window, feeds the compiler error back into the prompt, and tries again. If Haiku fails 3 times, it escalates to Sonnet. If Sonnet fails 7 times, it escalates to Opus. 
5.  It loops until it hits the exit criteria: `<promise>COMPILED_AND_SAFE</promise>`.

## 4. The Target Hitlist (The Money Makers)

We are targeting high-concurrency, I/O-bound, or RAM-heavy bottlenecks where a Rust rewrite yields 70%+ infrastructure cost savings.

1.  **Primary Target: `BerriAI/litellm` (The Universal AI Proxy)**
    * *Bottleneck:* Python API routing and Redis caching choke under heavy concurrent request loads (5,000+ RPS).
    * *Rust Target:* Rewrite the HTTP router and load balancer using `Axum` and `hyper`.
2.  **Secondary Target: `Unstructured-IO/unstructured` (RAG Data Ingestion)**
    * *Bottleneck:* Single-threaded Python (GIL) causes massive CPU/RAM spikes when parsing 10,000-page enterprise PDFs.
    * *Rust Target:* Rewrite the document chunking pipelines using `Rayon` for multi-threaded data parallelism.
3.  **Tertiary Target: `langchain-ai/langgraph` (Agent State Machine)**
    * *Bottleneck:* Managing distributed state for thousands of autonomous agents via Python dictionaries consumes massive RAM.
    * *Rust Target:* A bare-metal, garbage-collector-free execution graph engine.

## 5. Execution Directive for Claude
**Claude:** Acknowledge this architectural specification. Confirm you understand the token-compression strategy of reading *only* the Breadcrumb `@contracts` to generate the `todo!()` skeleton in Phase 2. 

To begin, state your readiness to receive the first batch of Breadcrumbs from the `BerriAI/litellm` proxy router.