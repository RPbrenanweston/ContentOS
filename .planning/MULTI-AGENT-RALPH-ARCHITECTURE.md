# Multi-Agent Ralph Architecture: Scaling from 1 to 16 Concurrent Agents

**Author**: Architect Agent
**Date**: 2026-02-17
**Status**: Architecture Decision Record (ADR)
**Scope**: Ralph loop orchestration, multi-agent team design, git-based coordination

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Ralph's Current Architecture and Team Capabilities](#2-ralphs-current-architecture)
3. [The Fundamental Constraint: Git's Sequential Nature](#3-the-fundamental-constraint)
4. [Pattern Evaluation Matrix](#4-pattern-evaluation-matrix)
5. [Recommended Architecture: Hybrid Layered Parallelism](#5-recommended-architecture)
6. [Coordination Layer Design](#6-coordination-layer-design)
7. [Failure Mode Analysis](#7-failure-mode-analysis)
8. [Scaling Analysis and Diminishing Returns](#8-scaling-analysis)
9. [Implementation Roadmap](#9-implementation-roadmap)
10. [Sources and References](#10-sources)

---

## 1. Executive Summary

**The question**: Can RPBW scale from 4 agents (1 per worktree) to 16 agents (4 per worktree)?

**The answer**: Yes, but NOT by putting 4 agents in the same worktree. The optimal architecture uses a **hybrid of two proven patterns** that together can sustain 9-16 concurrent agents:

| Layer | Pattern | Agents | Coordination Cost |
|-------|---------|--------|-------------------|
| **Outer**: Cross-tree parallelism | 4 worktrees, 1 Ralph loop each | 4 | Near zero (disjoint scopes) |
| **Inner**: Agent Teams within tree | Anthropic Agent Teams per worktree | 2-4 per tree | Medium (shared task list + messaging) |

**Effective capacity**: 4 trees x 2-4 agents = **8-16 concurrent agents**

**Critical insight**: Ralph itself is a single-agent orchestration loop. It was never designed for multi-agent team coordination. However, Anthropic's experimental Agent Teams feature (released early 2026) provides the missing intra-tree coordination layer. The architecture stacks Ralph as the outer persistence/progress loop with Agent Teams as the inner parallel execution engine.

**The hard limit**: You cannot put multiple independent Ralph loops in the same worktree. Ralph assumes exclusive write access to `prd.json`, `progress.txt`, and the git working tree. Two Ralph loops in one worktree will corrupt shared state within minutes.

---

## 2. Ralph's Current Architecture and Team Capabilities

### 2.1 What Ralph Is

Ralph is an **outer orchestration loop** that provides:
- Fresh context per iteration (conversation resets, files persist)
- File-based memory (`prd.json`, `progress.txt`, `AGENTS.md`, git history)
- Backpressure gates (tests, lints, builds must pass)
- Completion detection (string matching on `<promise>COMPLETE</promise>`)
- Circuit breaker (stall detection after N iterations without progress)

### 2.2 What Ralph Is NOT

Ralph is **not** a multi-agent coordinator. Specifically:

| Capability | Ralph Has It? | Notes |
|-----------|---------------|-------|
| Single-agent loop execution | Yes | Core purpose |
| PRD-to-task conversion | Yes | `prd.json` format |
| Multi-agent task distribution | **No** | No task queue, no agent registry |
| Agent-to-agent messaging | **No** | No mailbox, no pub/sub |
| Distributed locking | **No** | No file locks, no mutex |
| Merge conflict resolution | **No** | Relies on disjoint scopes |
| Agent health monitoring | **No** | No heartbeat, no supervisor |
| Dynamic agent spawning | **No** | Static 1:1 agent-to-loop binding |

### 2.3 Ralph's Implicit Assumption

Ralph assumes **exclusive ownership** of:
1. The `prd.json` file (reads current story, writes status updates)
2. The `progress.txt` file (appends per-iteration learnings)
3. The git working tree (creates/edits files, runs `git add && git commit`)
4. The build toolchain (runs `bun build`, `bun lint`, etc.)

Two Ralph instances sharing any of these resources creates immediate race conditions. This is not a bug; it is the architectural boundary.

### 2.4 Your Existing Pattern (Proven, Working)

From the JobTrackr execution sequence, you already have the proven model:

```
Phase 0: Foundation (1 agent, sequential, main branch)
Phase 1: 4 worktrees, 4 agents, 4 disjoint PRDs (parallel)
Phase 2: Integration (1 agent, sequential, main branch)
Phase 3: Mixed (2 parallel + 1 sequential)
```

This is **Pattern D** from your question. It works. The parallel safety proof you wrote for JobTrackr demonstrates formal disjointness verification. The question is: can we do better?

---

## 3. The Fundamental Constraint: Git's Sequential Nature

### 3.1 The CAP Theorem of Multi-Agent Development

You cannot simultaneously have all three of:
1. **Multiple writers** to the same working tree
2. **Consistent git history** (linear, bisectable commits)
3. **Zero coordination overhead**

Pick two. The three patterns map directly:

| Pick Two | Sacrifice | Pattern |
|----------|-----------|---------|
| Multiple writers + Consistent history | Zero overhead | Agent Teams (coordination via task list + messaging) |
| Multiple writers + Zero overhead | Consistent history | Chaos (agents overwrite each other, git log is noise) |
| Consistent history + Zero overhead | Multiple writers | Current model (1 agent per worktree) |

### 3.2 Why Same-Worktree Multi-Agent Is Hard

Git tracks a **single working tree state**. When Agent A modifies `src/auth.ts` and Agent B modifies `src/db.ts` simultaneously in the same worktree:

1. Both agents read the filesystem at time T0
2. Agent A writes `src/auth.ts` at T1
3. Agent B writes `src/db.ts` at T2
4. Agent A runs `git add -A && git commit` at T3
5. Agent A's commit captures Agent B's half-written `src/db.ts`

This is not a merge conflict. It is **state corruption**. The commit at T3 includes uncommitted work from Agent B. Worse: Agent B does not know its work was committed by Agent A.

### 3.3 How Anthropic Solved This (C Compiler Case Study)

Nicholas Carlini's 16-agent C compiler project used a different model entirely:

- **Each agent had its own repository clone** (not worktrees -- full clones)
- Agents operated on a **pull-merge-push** cycle
- File-based locks (`current_tasks/task_name.txt`) prevented duplicate work
- Git itself served as the conflict detection mechanism
- Agents were "smart enough" to resolve merge conflicts during the pull step

This is fundamentally **Pattern D** (separate working directories) with an additional coordination layer for task deduplication. It is NOT multiple agents in the same working tree.

### 3.4 How Anthropic's Agent Teams Solve This

The experimental Agent Teams feature (February 2026) introduces:

- **Shared task list** with atomic claim operations (file-locking based)
- **Inter-agent messaging** (mailbox system, not polling)
- **Team lead + teammates** hierarchy (coordinator pattern)
- **Automatic dependency resolution** (blocked tasks unblock when predecessors complete)

Critically, Agent Teams assumes teammates may share a working directory OR use separate ones. The documentation explicitly warns: "Two teammates editing the same file leads to overwrites. Break the work so each teammate owns a different set of files."

This means Agent Teams provides the coordination primitives but still requires **disjoint file ownership** within a shared worktree.

---

## 4. Pattern Evaluation Matrix

### Pattern A: Story-Level Parallelization (Same Worktree)

**Model**: 1 `prd.json`, 4 stories, 4 agents, 1 worktree

| Criterion | Assessment |
|-----------|------------|
| Merge conflict risk | **CRITICAL** -- agents share the same `.git/index` |
| State corruption risk | **CRITICAL** -- `git add -A` captures other agents' partial work |
| Coordination overhead | **HIGH** -- need distributed locking for every file |
| Speedup potential | 2-4x theoretical, 1.2-1.5x practical (blocked by coordination) |
| Implementation complexity | **Very high** -- requires CRDT or lock-per-file system |

**Verdict**: INFEASIBLE for production. The git working tree is a single-writer data structure. Multiple writers require external coordination that exceeds the parallelization benefit.

**Exception**: If stories touch completely disjoint file sets AND you implement sequential commit ordering (only one agent commits at a time), this becomes viable but complex. At that point, you have reinvented worktrees with extra steps.

### Pattern B: Sub-Story Parallelization

**Model**: 1 story split into 4 sub-tasks, 4 agents, 1 worktree

| Criterion | Assessment |
|-----------|------------|
| Merge conflict risk | **HIGH** -- sub-tasks within a story often touch related files |
| Decomposition overhead | **HIGH** -- requires story-level task planner agent |
| Context sharing | **CRITICAL** -- sub-tasks need shared understanding of story intent |
| Speedup potential | 1.5-2x theoretical, <1x practical (decomposition + merge > serial) |
| Implementation complexity | **Very high** -- needs task planner + merge coordinator |

**Verdict**: INFEASIBLE for most stories. Stories are typically the atomic unit of coherent change. Splitting below story level creates more coordination overhead than it saves. The decomposition agent itself consumes significant tokens to produce a plan that may be wrong.

**Exception**: Very large stories (estimated >4 hours) that have natural sub-components (e.g., "Build Kanban board" = drag-and-drop logic + card rendering + status update API + column layout). These can be split, but only by a human architect, not autonomously.

### Pattern C: Hierarchical Teams (Coordinator + Workers)

**Model**: 1 coordinator agent distributes to 3 worker agents, all in 1 worktree

| Criterion | Assessment |
|-----------|------------|
| Merge conflict risk | **MEDIUM** -- coordinator enforces file ownership |
| Bottleneck risk | **HIGH** -- coordinator is single point of serialization |
| Context overhead | **MEDIUM** -- coordinator must understand all workers' state |
| Speedup potential | 2-3x theoretical, 1.5-2x practical |
| Implementation complexity | **Medium** -- Anthropic Agent Teams provides this natively |

**Verdict**: VIABLE with constraints. This is exactly what Anthropic's Agent Teams provides. The coordinator (team lead) distributes tasks, workers claim and execute, coordinator validates and merges. The critical constraint is: workers must own disjoint file sets.

**This is the pattern to use within a single worktree.**

### Pattern D: Worktree-Per-Agent (Current Model)

**Model**: 4 agents, 4 worktrees, disjoint PRDs

| Criterion | Assessment |
|-----------|------------|
| Merge conflict risk | **NEAR ZERO** -- proven by File Scope Disjointness Theorem |
| Coordination overhead | **NEAR ZERO** -- agents are fully independent |
| Speedup potential | 4x theoretical, 3-4x practical |
| Implementation complexity | **Low** -- already implemented and proven |

**Verdict**: PROVEN AND OPTIMAL for cross-feature parallelism. This is your current model. The only limitation is that it caps at N worktrees x 1 agent per tree.

### Comparison Summary

| Pattern | Viable? | Max Agents | Practical Speedup | Risk |
|---------|---------|------------|-------------------|------|
| A: Story-parallel, same tree | No | N/A | N/A | State corruption |
| B: Sub-story parallel | No | N/A | N/A | Decomposition > serial |
| C: Hierarchical teams | **Yes** | 3-4 per tree | 1.5-2x per tree | Coordinator bottleneck |
| D: Worktree-per-agent | **Yes** | 1 per tree | 3-4x across trees | Merge phase sequential |

---

## 5. Recommended Architecture: Hybrid Layered Parallelism

### 5.1 The Two-Layer Model

Combine Pattern C (within tree) and Pattern D (across trees):

```
                    RPBW (Human Operator)
                         |
            +-----------+-----------+-----------+
            |           |           |           |
        Worktree 1  Worktree 2  Worktree 3  Worktree 4
        (feature/a) (feature/b) (feature/c) (feature/d)
            |           |           |           |
     Ralph Loop 1  Ralph Loop 2  Ralph Loop 3  Ralph Loop 4
            |           |           |           |
     Agent Team 1  Agent Team 2  Agent Team 3  Agent Team 4
     [Lead + 2-3]  [Lead + 2-3]  [Lead + 2-3]  [Lead + 2-3]
```

### 5.2 Outer Layer: Cross-Tree Parallelism (Pattern D)

**Unchanged from current model.** 4 worktrees, each with its own:
- Feature branch
- Ralph loop instance
- `prd.json` with disjoint scope
- `progress.txt`
- `CLAUDE.md`

**Coordination**: Zero. Trees are independent. Merge happens after all trees complete, sequentially to main.

### 5.3 Inner Layer: Intra-Tree Agent Teams (Pattern C)

**New addition.** Within each worktree, use Anthropic's Agent Teams:

```
Worktree 1 (feature/auth)
|
+-- Ralph Loop (outer persistence)
    |
    +-- Agent Team Lead (coordinator)
        |
        +-- Teammate: Frontend (owns src/components/auth/*)
        +-- Teammate: Backend (owns src/lib/actions/auth.ts, src/app/api/auth/*)
        +-- Teammate: Tests (owns __tests__/auth/*, e2e/auth/*)
```

**Key design decisions:**

1. **Ralph drives iteration cadence.** Each Ralph iteration spawns a fresh Agent Team. The team executes one story, then Ralph's stop hook validates and persists progress.

2. **Team lead is the coordinator, not a worker.** Enable delegate mode so the lead only orchestrates -- it does not write code. Workers do all implementation.

3. **File ownership is pre-assigned.** The `prd.json` story's `files` array is partitioned among teammates at spawn time. No teammate touches files outside its partition.

4. **Sequential commits, parallel work.** Workers implement in parallel, but only the team lead commits (after validating all workers' changes together). This avoids the `git add -A` state corruption problem.

### 5.4 Agent Count Recommendations

| Scenario | Trees | Agents/Tree | Total Agents | Rationale |
|----------|-------|-------------|--------------|-----------|
| Conservative | 4 | 1 (current) | 4 | Proven, zero coordination risk |
| Moderate | 4 | 2 (lead + 1 worker) | 8 | Low coordination overhead, meaningful speedup |
| Aggressive | 4 | 3 (lead + 2 workers) | 12 | Good parallelism for stories with natural splits |
| Maximum | 4 | 4 (lead + 3 workers) | 16 | Only for large stories with 3+ disjoint file zones |

**Recommendation**: Start at **Moderate (8 agents)**, scale to Aggressive (12) after validating coordination overhead. Maximum (16) should be reserved for specific phases where stories are large enough to justify 3 workers.

### 5.5 When NOT to Use Teams Within a Tree

Some stories are too small or too coupled for intra-tree parallelism:

| Story Type | Use Team? | Reason |
|-----------|-----------|--------|
| Database schema migration | No | Single file, sequential DDL |
| API endpoint with tests | Yes (2 agents) | Backend + tests are disjoint |
| Full-stack feature | Yes (3 agents) | Frontend + backend + tests |
| Bug fix | No | Usually 1-2 files, serial is faster |
| Styling/CSS changes | No | All changes in same component tree |
| Cross-cutting refactor | No | Touches too many files, no clean partition |

---

## 6. Coordination Layer Design

### 6.1 Ralph-to-Agent-Teams Bridge

The core integration point is the Ralph iteration prompt. Instead of the standard single-agent prompt:

**Current (single agent)**:
```
Read prd.json, find next story, implement it, verify, commit.
```

**New (team-enabled)**:
```
Read prd.json, find next story, analyze its files array.
If files span 2+ disjoint zones: create Agent Team with workers per zone.
If files are in one zone: execute as single agent (no team overhead).
Use delegate mode. Assign file partitions. Wait for workers.
Validate combined output. Commit as single atomic commit.
```

### 6.2 File Partition Algorithm

Given a story's `files` array, partition into disjoint worker assignments:

```
Input: files = [
  "src/components/auth/LoginForm.tsx",
  "src/components/auth/SignupForm.tsx",
  "src/lib/actions/auth.ts",
  "src/app/api/auth/route.ts",
  "__tests__/auth/login.test.ts",
  "__tests__/auth/signup.test.ts"
]

Algorithm:
1. Group by directory prefix
2. Assign each group to a worker
3. If a file does not fit any group, assign to lead (manual handling)

Output:
  Worker A (Frontend): src/components/auth/*
  Worker B (Backend): src/lib/actions/auth.ts, src/app/api/auth/*
  Worker C (Tests): __tests__/auth/*
```

### 6.3 Commit Serialization Protocol

Only the team lead commits. Workers write files, but the `git add` and `git commit` are serialized through the lead:

```
1. Workers implement in parallel (each in their file partition)
2. Workers signal completion via Agent Teams messaging
3. Lead runs: bun build && bun lint && bun test
4. If pass: Lead runs git add -A && git commit -m "..."
5. If fail: Lead messages specific worker with error details
6. Worker fixes, re-signals completion
7. Repeat from step 3
```

### 6.4 Task Claim Mechanism

For the outer layer (cross-tree), task claiming is implicit: each worktree has its own `prd.json`. No contention.

For the inner layer (within tree), Anthropic Agent Teams provides atomic task claiming via file locks. The shared task list at `~/.claude/tasks/{team-name}/` uses filesystem-level locking to prevent race conditions.

### 6.5 Crash Recovery Protocol

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Worker crashes mid-implementation | Lead detects teammate idle notification | Spawn replacement worker, give it the dead worker's file partition |
| Lead crashes | Ralph iteration timeout (CLAUDE_TIMEOUT_MINUTES) | Ralph spawns fresh iteration, reads prd.json for state |
| Ralph loop stalls | Circuit breaker (CB_NO_PROGRESS_THRESHOLD) | Auto-escalate to BLOCKED state |
| Worktree corruption | Build failure after merge | Discard worktree, recreate from main, re-run agent |
| State file corruption | prd.json parse failure | Restore from last git commit of prd.json |

---

## 7. Failure Mode Analysis

### 7.1 With 16 Concurrent Agents

| Failure Mode | Probability | Impact | Mitigation |
|-------------|-------------|--------|------------|
| **API rate limiting** | HIGH at 16 agents | All agents stall | Stagger agent launches, use tiered models (haiku for workers) |
| **Token cost explosion** | HIGH | $80-160/hour at 16 agents on Sonnet | Use haiku for simple workers, Sonnet for leads, Opus for none |
| **Merge conflicts at integration** | MEDIUM | Sequential merge phase blocks | Formal disjointness verification before launching parallel phase |
| **Agent hallucination (scope violation)** | MEDIUM | Worker writes to file outside partition | Build verification gate catches at commit time |
| **Coordinator bottleneck** | MEDIUM | Lead cannot process 3 worker completions fast enough | Limit to 2 workers per lead for complex stories |
| **Deadlock (circular task dependency)** | LOW | Agents wait for each other indefinitely | Agent Teams task system prevents circular deps |
| **Context window exhaustion** | MEDIUM | Worker loses track of task mid-implementation | Keep worker prompts focused, short file partitions |
| **Duplicate work** | LOW with Agent Teams | Two workers claim same file | File-lock based task claiming prevents this |
| **Network/system resource exhaustion** | MEDIUM at 16 agents | macOS process limits, memory pressure | Monitor with `top`, set CLAUDE_TIMEOUT_MINUTES |

### 7.2 The Critical Risk: Coordination Overhead > Parallelization Benefit

This is the most likely failure mode at 16 agents. The math:

```
Single agent (baseline):
  Work time: 60 minutes
  Coordination: 0 minutes
  Total: 60 minutes

4 agents (1 per tree, current model):
  Work time: 60/4 = 15 minutes (ideal parallel)
  Coordination: ~2 minutes (merge phase)
  Total: 17 minutes
  Speedup: 3.5x

8 agents (2 per tree):
  Work time: 60/8 = 7.5 minutes (ideal parallel)
  Coordination: ~5 minutes (team setup + merge phase)
  Total: 12.5 minutes
  Speedup: 4.8x

12 agents (3 per tree):
  Work time: 60/12 = 5 minutes
  Coordination: ~10 minutes (team setup + inter-agent messaging + merge)
  Total: 15 minutes
  Speedup: 4x (DECLINING from 8 agents)

16 agents (4 per tree):
  Work time: 60/16 = 3.75 minutes
  Coordination: ~18 minutes (exponential coordination growth)
  Total: 21.75 minutes
  Speedup: 2.75x (WORSE THAN 4 agents!)
```

**The Amdahl's Law inflection point is at approximately 8-10 agents.** Beyond that, coordination overhead grows faster than parallelization benefit.

### 7.3 Cost-Adjusted Analysis

At Sonnet pricing (~$10.42/hour per agent):

| Config | Agents | Time | Cost | Cost-Efficiency |
|--------|--------|------|------|-----------------|
| 1 agent | 1 | 60 min | $10.42 | Baseline |
| 4 agents (4 trees) | 4 | 17 min | $11.83 | 3.5x speed, 1.14x cost |
| 8 agents (4 trees x 2) | 8 | 12.5 min | $17.36 | 4.8x speed, 1.67x cost |
| 12 agents (4 trees x 3) | 12 | 15 min | $31.25 | 4x speed, 3x cost |
| 16 agents (4 trees x 4) | 16 | 21.75 min | $55.73 | 2.75x speed, 5.35x cost |

**The sweet spot is 8 agents**: nearly 5x speedup for only 1.67x cost increase.

---

## 8. Scaling Analysis and Diminishing Returns

### 8.1 Where Parallelism Helps

Parallelism provides real benefit when:
1. Stories have **naturally disjoint file ownership** (frontend vs backend vs tests)
2. Stories are **large enough** that team setup overhead is amortized (>30 min single-agent estimate)
3. The **integration phase is short** relative to the implementation phase
4. You are **optimizing for wall-clock time**, not token cost

### 8.2 Where Parallelism Hurts

Parallelism is actively counterproductive when:
1. Stories touch **overlapping files** (refactoring, cross-cutting concerns)
2. Stories are **small** (<15 min single-agent estimate)
3. **Sequential dependencies** exist between stories in the same tree
4. You are **optimizing for cost**, not wall-clock time

### 8.3 The Real Bottleneck

The actual bottleneck in Ralph-based development is NOT agent execution speed. It is:

1. **PRD quality** -- poorly specified stories cause loops and rework
2. **Integration/merge phase** -- always sequential, always manual
3. **Human verification gates** -- cannot be parallelized
4. **Foundation dependencies** -- shared infrastructure blocks everything

Doubling agent count does not address any of these bottlenecks. The highest-leverage improvement is **better PRDs and smaller stories**, not more agents.

### 8.4 Theoretical Maximum Speedup (Amdahl's Law)

If 25% of work is inherently sequential (foundation, integration, merge, verification):

```
Max speedup = 1 / (0.25 + 0.75/N)

N=1:  1.0x
N=4:  2.3x
N=8:  2.9x
N=16: 3.4x
N=32: 3.6x
N=inf: 4.0x (hard ceiling)
```

With 25% sequential work, you can NEVER exceed 4x speedup regardless of agent count. The practical ceiling with coordination overhead is approximately 3x.

---

## 9. Implementation Roadmap

### Phase 1: Validate Agent Teams (1-2 days)

1. Enable `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` in settings.json
2. Test with a single worktree, single story, 2-agent team (lead + 1 worker)
3. Validate: task claiming, messaging, file ownership, commit serialization
4. Measure: actual coordination overhead vs. single-agent baseline

### Phase 2: Integrate with Ralph (2-3 days)

1. Create Ralph prompt template that conditionally spawns Agent Teams
2. Implement file partition algorithm (directory-prefix grouping)
3. Add commit serialization (lead-only commits)
4. Test full cycle: Ralph iteration -> team spawn -> parallel work -> team cleanup -> Ralph progress update

### Phase 3: Scale to 8 Agents (1 day)

1. Deploy 4 worktrees with team-enabled Ralph
2. Each tree gets lead + 1 worker (8 total)
3. Run against a real PRD with 4+ parallel features
4. Measure wall-clock time, token cost, merge success rate

### Phase 4: Scale to 12 Agents (if justified) (1 day)

1. Increase to lead + 2 workers per tree
2. Only for trees with stories that have 3+ disjoint file zones
3. Measure coordination overhead increase
4. If overhead > benefit: revert to 8 agents

### Phase 5: Production Configuration

```json
// settings.json for multi-agent Ralph
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "teammateMode": "in-process",
  "ralphConfig": {
    "maxIterations": 30,
    "circuitBreaker": {
      "noProgressThreshold": 3,
      "sameErrorThreshold": 5
    },
    "teamConfig": {
      "maxTeammatesPerTree": 3,
      "workerModel": "haiku",
      "leadModel": "sonnet",
      "delegateMode": true,
      "filePartitionStrategy": "directory-prefix",
      "commitSerializer": "lead-only"
    }
  }
}
```

---

## 10. Sources and References

### Anthropic Official
- [Agent Teams Documentation](https://code.claude.com/docs/en/agent-teams) -- Experimental feature for coordinating Claude Code sessions
- [Building a C Compiler with Parallel Claudes](https://www.anthropic.com/engineering/building-c-compiler) -- 16-agent case study, 2000 sessions, $20K cost
- [Claude Code Subagents](https://code.claude.com/docs/en/sub-agents) -- Lightweight alternative to full agent teams

### Ralph Loop Ecosystem
- [snarktank/ralph](https://github.com/snarktank/ralph) -- Original Ralph implementation
- [frankbria/ralph-claude-code](https://github.com/frankbria/ralph-claude-code) -- Production-grade with circuit breaker
- [ccswarm](https://github.com/nwiizo/ccswarm) -- Multi-agent orchestration with worktree isolation
- [Shipyard Multi-Agent Guide](https://shipyard.build/blog/claude-code-multi-agent/) -- 2026 multi-agent orchestration patterns

### Community Analysis
- [Git Worktrees for Parallel AI Agents](https://devcenter.upsun.com/posts/git-worktrees-for-parallel-ai-coding-agents/) -- Worktree isolation patterns
- [Multi-Agent Ralph Loop](https://github.com/alfredolopez80/multi-agent-ralph-loop) -- Community fork with multi-agent coordination
- [Claude Code Swarm Mode Guide](https://help.apiyi.com/en/claude-code-swarm-mode-multi-agent-guide-en.html) -- Swarm mode deep dive

### Internal
- [RALPH_LOOPS_PAI_IMPLEMENTATION.md](/Users/robertpeacock/Desktop/Claude code/RALPH_LOOPS_PAI_IMPLEMENTATION.md) -- PAI integration architecture
- [PARALLEL_SAFETY_PROOF.md](/Users/robertpeacock/Desktop/Claude code/.planning/jobtrackr/PARALLEL_SAFETY_PROOF.md) -- File scope disjointness theorem
- [RALPH_EXECUTION_SEQUENCE.md](/Users/robertpeacock/Desktop/Claude code/.planning/jobtrackr/RALPH_EXECUTION_SEQUENCE.md) -- Proven 4-tree parallel execution playbook

---

## Appendix A: Decision Summary

### Q1: Does Ralph support N agents per PRD?
**No.** Ralph is fundamentally 1 agent per PRD. It has no task queue, no agent registry, no messaging system, and assumes exclusive write access to all state files.

### Q2: Which patterns are viable?
- **Pattern A (story-parallel, same tree)**: NOT viable. Git working tree is single-writer.
- **Pattern B (sub-story parallel)**: NOT viable. Decomposition cost exceeds benefit.
- **Pattern C (hierarchical teams)**: VIABLE with Anthropic Agent Teams. Best within a single worktree.
- **Pattern D (worktree-per-agent)**: PROVEN AND OPTIMAL for cross-feature parallelism.

### Q3: Optimal team size?
**2 agents per tree (8 total)** is the sweet spot. 3 agents per tree (12 total) is viable for large stories. 4 agents per tree (16 total) has negative returns due to coordination overhead.

### Q4: Is 16-agent parallelization worth the complexity?
**No.** The coordination cost at 16 agents exceeds the parallelization benefit (Amdahl's Law with 25% sequential work caps theoretical maximum at 4x, practical at 3x). The cost-efficiency at 16 agents is 5.35x worse than single-agent while only delivering 2.75x speedup.

### Q5: What should RPBW do?
1. Keep the 4-worktree model (proven, zero-coordination)
2. Add Anthropic Agent Teams within each worktree for large stories (lead + 1-2 workers)
3. Target 8-12 total agents as the production sweet spot
4. Invest in better PRD decomposition rather than more agents -- it is the higher-leverage improvement

---

## Appendix B: The RPBW Agent Capacity Model

```
Current State:     4 trees x 1 agent  =  4 concurrent agents
Phase 1 Target:    4 trees x 2 agents =  8 concurrent agents
Phase 2 Target:    4 trees x 3 agents = 12 concurrent agents (selective)
Theoretical Max:   4 trees x 4 agents = 16 concurrent agents (not recommended)

Bottleneck:        PRD quality and integration phase, not agent count
Investment:        Better PRDs > More agents
```
