# BUIDL BATTLE #2 — Complete Build Guide

> **Project**: Bitcoin Agent Economy Platform — "Bitcoin's first autonomous agent labor market with sBTC settlement"
> **Hackathon**: BUIDL BATTLE #2 (DoraHacks) | Mar 2–20, 2026 | $20K prizes
> **Stack**: Clarity smart contracts, sBTC, stacks.js, Clarinet, x402, AIBTC tools
> **Target**: Top 3 + "Best x402 Integration" + "Most Innovative Use of sBTC" bounties

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Environment Setup](#3-environment-setup)
4. [Clarity Crash Course (for Solidity devs)](#4-clarity-crash-course)
5. [Smart Contracts](#5-smart-contracts)
6. [Unit Testing](#6-unit-testing)
7. [Frontend (stacks.js + React)](#7-frontend)
8. [x402 + AIBTC Agent Integration](#8-x402--aibtc-agent-integration)
9. [Deployment](#9-deployment)
10. [Demo & Submission](#10-demo--submission)
11. [Reference Links](#11-reference-links)

---

## 1. Project Overview

### What We're Building

A decentralized labor market for autonomous AI agents on Bitcoin L2 (Stacks). Agents register on-chain, post/accept discrete jobs, escrow payments in sBTC/USDCx, prove completion, and build verifiable reputation — all settled with Bitcoin finality.

### Why It Wins

- **Fills the biggest gap**: AIBTCDEV built the agent "OS" (wallets, identity, micropayments). The x402 marketplace handles per-API-call payments. Nobody has built the **job marketplace** — discrete, high-value tasks with escrow, completion proofs, and reputation.
- **Hits all 3 bounties**: sBTC escrow (Most Innovative Use of sBTC), USDCx stable payments (Best Use of USDCx), x402 for agent discovery/comms (Best x402 Integration)
- **Matches judge patterns**: BUIDL BATTLE #1 winners used heavy sBTC, AI for core logic, Bitcoin DeFi innovation

### Differentiation from Existing Projects

| Project | What It Does | What We Do Differently |
|---------|-------------|----------------------|
| AIBTCDEV | Agent OS: wallets, identity, MCP server, messaging | We BUILD ON their identity as a dependency. We're the marketplace layer. |
| x402 Marketplace | Per-API-call micropayments (HTTP 402 paywalls) | We handle discrete **jobs** with escrow, deadlines, and completion proofs |
| BigMarket (#1 BB winner) | AI prediction markets with sBTC | We enable the full agent economy, not just predictions |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  Next.js + stacks.js + @stacks/connect (Leather wallet)     │
│  - Agent dashboard (register, browse jobs, reputation)       │
│  - Job board (post, accept, complete, release)               │
│  - Wallet connect + sBTC/USDCx balance display               │
└──────────────┬──────────────────────────────────┬───────────┘
               │ contract-call                     │ x402 API
               ▼                                   ▼
┌──────────────────────────┐    ┌──────────────────────────────┐
│   CLARITY CONTRACTS       │    │   OFF-CHAIN AGENT LAYER      │
│   (Stacks L2)             │    │   (Node.js/Bun + AIBTC SDK)  │
│                           │    │                              │
│  agent-registry.clar      │    │  - x402 paid job discovery   │
│  - register/deregister    │    │  - Agent-to-agent comms      │
│  - reputation scoring     │    │  - Job matching logic        │
│  - sBTC staking           │    │  - Proof generation          │
│                           │    │                              │
│  agent-marketplace.clar   │    │  Uses: @aibtc/agent-tools    │
│  - post-job (sBTC escrow) │    │  Uses: stacks.js signing     │
│  - accept-job             │    │                              │
│  - complete-job (proof)   │    └──────────────────────────────┘
│  - release-payment        │
│  - cancel/refund          │
│                           │
│  Uses: SIP-010 trait      │
│  Uses: sBTC token         │
│  Uses: USDCx token        │
└──────────────────────────┘
```

### Contract Dependencies

```
SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token  (sBTC — SIP-010)
SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-deposit (sBTC deposit/withdraw)
<USDCx-contract-address>.usdcx-token                     (USDCx — SIP-010)
SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard  (SIP-010 trait)
```

---

## 3. Environment Setup

### Install Clarinet

```bash
brew install clarinet
clarinet --version  # Needs >= 2.15.0 for sBTC auto-integration
```

> **Docs**: https://docs.stacks.co/clarinet/overview#installation

### Create Project

```bash
clarinet new agent-market
cd agent-market
```

This creates:
```
agent-market/
├── contracts/          # Clarity smart contracts
├── settings/
│   ├── Devnet.toml     # Local devnet config
│   ├── Testnet.toml    # Testnet deployment config
│   └── Mainnet.toml
├── tests/              # Vitest unit tests
├── Clarinet.toml       # Project manifest
├── package.json
└── vitest.config.js
```

> **Docs**: https://docs.stacks.co/clarinet/quickstart

### Add sBTC Dependency

```bash
clarinet requirements add SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-deposit
```

This pulls in `sbtc-token`, `sbtc-registry`, and `sbtc-deposit`. Clarinet **auto-funds devnet wallets with sBTC** when these are present.

> **Docs**: https://docs.stacks.co/clarinet/integrations/sbtc

### Generate Contracts

```bash
clarinet contract new agent-registry
clarinet contract new agent-marketplace
```

Creates `contracts/agent-registry.clar`, `contracts/agent-marketplace.clar`, and corresponding test files.

### Install Test Dependencies

```bash
npm install
```

### Install Frontend Dependencies (separate project)

```bash
mkdir frontend && cd frontend
npx create-next-app@latest . --typescript --tailwind --app
npm install @stacks/connect @stacks/transactions @stacks/network
```

> **Docs**: https://docs.stacks.co/clarinet/integrations/stacks.js

---

## 4. Clarity Crash Course

### Clarity vs Solidity — Key Differences

| Concept | Solidity | Clarity |
|---------|----------|---------|
| Language type | Imperative, C-like | Functional, LISP-like |
| Syntax | `function foo() public {}` | `(define-public (foo) ...)` |
| Loops | `for`, `while` | **None** — use `map`, `fold`, recursion |
| Reentrancy | Possible (guard needed) | **Impossible by design** |
| State mutation | Direct assignment | `map-set`, `var-set` |
| Integers | `uint256` | `uint` (128-bit) |
| Address type | `address` | `principal` |
| Caller | `msg.sender` | `tx-sender` |
| Contract ref | `address(this)` | `(as-contract tx-sender)` |
| Return values | Implicit | Must wrap in `(ok ...)` or `(err ...)` |
| Storage | `mapping(k => v)` | `(define-map name {key-type} {val-type})` |
| Events | `emit Event()` | `(print {data})` |
| Token standard | ERC-20 | SIP-010 |

### Essential Syntax

```clarity
;; State variables
(define-data-var counter uint u0)

;; Maps (like Solidity mappings)
(define-map balances principal uint)

;; Public function (can modify state, returns response)
(define-public (increment)
  (begin
    (var-set counter (+ (var-get counter) u1))
    (ok (var-get counter))
  )
)

;; Read-only function (cannot modify state)
(define-read-only (get-counter)
  (var-get counter)
)

;; Private function (only callable within contract)
(define-private (internal-helper (x uint))
  (* x u2)
)

;; Map operations
(map-set balances tx-sender u100)
(map-get? balances tx-sender)          ;; Returns (optional ...)
(default-to u0 (map-get? balances tx-sender))  ;; Unwrap with default

;; Error handling
(unwrap! (map-get? balances tx-sender) (err u404))  ;; Unwrap or return error
(asserts! (> amount u0) (err u400))                  ;; Assert or return error

;; Token transfers (SIP-010)
(contract-call? .sbtc-token transfer amount sender recipient none)

;; Sending tokens to the contract itself (escrow pattern)
(contract-call? token transfer amount tx-sender (as-contract tx-sender) none)

;; Sending tokens FROM the contract (release pattern)
(as-contract (contract-call? token transfer amount (as-contract tx-sender) recipient none))
```

### Clarity Type Reference

```clarity
uint         ;; Unsigned 128-bit integer (literals: u0, u100, u1000000)
int          ;; Signed 128-bit integer
bool         ;; true/false
principal    ;; Address (standard or contract)
(buff N)     ;; Fixed-length byte buffer
(string-ascii N)   ;; ASCII string, max N chars
(string-utf8 N)    ;; UTF-8 string, max N chars
(optional T)       ;; Optional value (some/none)
(response T E)     ;; Result type (ok/err)
(list N T)         ;; Fixed-max-length list
{key: type, ...}   ;; Tuple (like struct)
```

> **Full function reference**: https://docs.stacks.co/clarity/functions
> **Clarity language guide**: https://docs.stacks.co/clarity

---

## 5. Smart Contracts

### Contract 1: `agent-registry.clar`

```clarity
;; Agent Registry — On-chain identity and reputation for AI agents
;; Extends AIBTC ERC-8004 pattern for the agent marketplace

;; Constants
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-UNAUTHORIZED (err u403))
(define-constant ERR-ALREADY-REGISTERED (err u409))
(define-constant INITIAL-REPUTATION u100)

;; Data maps
(define-map agents
  principal
  {
    name: (string-ascii 64),
    metadata-uri: (string-utf8 256),   ;; IPFS URI for agent model hash, capabilities, etc.
    reputation: uint,
    registered-at: uint,
    jobs-completed: uint,
    jobs-failed: uint,
    staked: uint                        ;; sBTC staked for bonding
  }
)

(define-data-var agent-count uint u0)

;; Register a new agent
(define-public (register-agent (name (string-ascii 64)) (metadata-uri (string-utf8 256)))
  (begin
    (asserts! (is-none (map-get? agents tx-sender)) ERR-ALREADY-REGISTERED)
    (map-set agents tx-sender {
      name: name,
      metadata-uri: metadata-uri,
      reputation: INITIAL-REPUTATION,
      registered-at: block-height,
      jobs-completed: u0,
      jobs-failed: u0,
      staked: u0
    })
    (var-set agent-count (+ (var-get agent-count) u1))
    (print {event: "agent-registered", agent: tx-sender, name: name})
    (ok true)
  )
)

;; Stake sBTC for higher-value job eligibility
(define-public (stake-sbtc (amount uint))
  (let ((agent (unwrap! (map-get? agents tx-sender) ERR-NOT-FOUND)))
    (try! (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token
      transfer amount tx-sender (as-contract tx-sender) none))
    (map-set agents tx-sender (merge agent {staked: (+ (get staked agent) amount)}))
    (print {event: "agent-staked", agent: tx-sender, amount: amount})
    (ok true)
  )
)

;; Update reputation (called by marketplace contract via trait)
(define-public (update-reputation (agent principal) (completed bool))
  (let ((data (unwrap! (map-get? agents agent) ERR-NOT-FOUND)))
    ;; Only the marketplace contract can call this
    (asserts! (is-eq contract-caller .agent-marketplace) ERR-UNAUTHORIZED)
    (if completed
      (map-set agents agent (merge data {
        reputation: (+ (get reputation data) u10),
        jobs-completed: (+ (get jobs-completed data) u1)
      }))
      (map-set agents agent (merge data {
        reputation: (if (> (get reputation data) u10) (- (get reputation data) u10) u0),
        jobs-failed: (+ (get jobs-failed data) u1)
      }))
    )
    (ok true)
  )
)

;; Read-only functions
(define-read-only (get-agent (agent principal))
  (map-get? agents agent)
)

(define-read-only (get-reputation (agent principal))
  (default-to u0 (get reputation (map-get? agents agent)))
)

(define-read-only (get-agent-count)
  (var-get agent-count)
)

(define-read-only (is-registered (agent principal))
  (is-some (map-get? agents agent))
)
```

### Contract 2: `agent-marketplace.clar`

```clarity
;; Agent Marketplace — Job posting, escrow, and settlement in sBTC
;; Bitcoin's first autonomous agent labor market

;; Traits
(use-trait ft-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

;; Constants
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-UNAUTHORIZED (err u403))
(define-constant ERR-INVALID-STATUS (err u400))
(define-constant ERR-DEADLINE-PASSED (err u410))
(define-constant ERR-TRANSFER-FAILED (err u500))

;; Job statuses (stored as uint for efficiency)
(define-constant STATUS-OPEN u0)
(define-constant STATUS-ACCEPTED u1)
(define-constant STATUS-COMPLETED u2)
(define-constant STATUS-RELEASED u3)
(define-constant STATUS-CANCELLED u4)
(define-constant STATUS-DISPUTED u5)

;; Data
(define-data-var job-counter uint u0)

(define-map jobs
  uint  ;; job-id
  {
    poster: principal,
    assignee: (optional principal),
    title: (string-ascii 128),
    desc-hash: (buff 32),         ;; IPFS hash of full job description
    reward: uint,
    token-contract: principal,     ;; sBTC or USDCx contract address
    status: uint,
    deadline: uint,                ;; Block height deadline
    proof-hash: (optional (buff 32)),
    created-at: uint
  }
)

(define-map escrows
  uint  ;; job-id
  {
    amount: uint,
    token: principal
  }
)

;; Post a new job — locks reward in escrow
(define-public (post-job
    (title (string-ascii 128))
    (desc-hash (buff 32))
    (reward uint)
    (token <ft-trait>)
    (deadline uint))
  (let ((job-id (var-get job-counter)))
    ;; Transfer reward to contract (escrow)
    (try! (contract-call? token transfer reward tx-sender (as-contract tx-sender) none))
    ;; Store job
    (map-set jobs job-id {
      poster: tx-sender,
      assignee: none,
      title: title,
      desc-hash: desc-hash,
      reward: reward,
      token-contract: (contract-of token),
      status: STATUS-OPEN,
      deadline: deadline,
      proof-hash: none,
      created-at: block-height
    })
    ;; Store escrow record
    (map-set escrows job-id {amount: reward, token: (contract-of token)})
    ;; Increment counter
    (var-set job-counter (+ job-id u1))
    (print {event: "job-posted", job-id: job-id, poster: tx-sender, reward: reward})
    (ok job-id)
  )
)

;; Accept a job (must be registered agent)
(define-public (accept-job (job-id uint))
  (let ((job (unwrap! (map-get? jobs job-id) ERR-NOT-FOUND)))
    (asserts! (is-eq (get status job) STATUS-OPEN) ERR-INVALID-STATUS)
    (asserts! (< block-height (get deadline job)) ERR-DEADLINE-PASSED)
    ;; Verify agent is registered
    (asserts! (contract-call? .agent-registry is-registered tx-sender) ERR-UNAUTHORIZED)
    (map-set jobs job-id (merge job {
      assignee: (some tx-sender),
      status: STATUS-ACCEPTED
    }))
    (print {event: "job-accepted", job-id: job-id, assignee: tx-sender})
    (ok true)
  )
)

;; Mark job as completed with proof
(define-public (complete-job (job-id uint) (proof-hash (buff 32)))
  (let ((job (unwrap! (map-get? jobs job-id) ERR-NOT-FOUND)))
    (asserts! (is-eq (get status job) STATUS-ACCEPTED) ERR-INVALID-STATUS)
    (asserts! (is-eq (some tx-sender) (get assignee job)) ERR-UNAUTHORIZED)
    (map-set jobs job-id (merge job {
      status: STATUS-COMPLETED,
      proof-hash: (some proof-hash)
    }))
    (print {event: "job-completed", job-id: job-id, proof-hash: proof-hash})
    (ok true)
  )
)

;; Release payment — poster confirms completion
(define-public (release-payment (job-id uint) (token <ft-trait>))
  (let (
    (job (unwrap! (map-get? jobs job-id) ERR-NOT-FOUND))
    (escrow (unwrap! (map-get? escrows job-id) ERR-NOT-FOUND))
    (assignee (unwrap! (get assignee job) ERR-NOT-FOUND))
  )
    (asserts! (is-eq (get status job) STATUS-COMPLETED) ERR-INVALID-STATUS)
    (asserts! (is-eq tx-sender (get poster job)) ERR-UNAUTHORIZED)
    ;; Transfer from contract to assignee
    (try! (as-contract (contract-call? token transfer (get amount escrow) tx-sender assignee none)))
    ;; Update status
    (map-set jobs job-id (merge job {status: STATUS-RELEASED}))
    ;; Update assignee reputation (+)
    (try! (contract-call? .agent-registry update-reputation assignee true))
    (print {event: "payment-released", job-id: job-id, amount: (get amount escrow), to: assignee})
    (ok true)
  )
)

;; Cancel job — only poster, only if still open
(define-public (cancel-job (job-id uint) (token <ft-trait>))
  (let (
    (job (unwrap! (map-get? jobs job-id) ERR-NOT-FOUND))
    (escrow (unwrap! (map-get? escrows job-id) ERR-NOT-FOUND))
  )
    (asserts! (is-eq (get status job) STATUS-OPEN) ERR-INVALID-STATUS)
    (asserts! (is-eq tx-sender (get poster job)) ERR-UNAUTHORIZED)
    ;; Refund escrow to poster
    (try! (as-contract (contract-call? token transfer (get amount escrow) tx-sender (get poster job) none)))
    (map-set jobs job-id (merge job {status: STATUS-CANCELLED}))
    (print {event: "job-cancelled", job-id: job-id})
    (ok true)
  )
)

;; Read-only functions
(define-read-only (get-job (job-id uint))
  (map-get? jobs job-id)
)

(define-read-only (get-escrow (job-id uint))
  (map-get? escrows job-id)
)

(define-read-only (get-job-count)
  (var-get job-counter)
)
```

---

## 6. Unit Testing

Tests use **Vitest** + **@stacks/clarinet-sdk**. Clarinet auto-creates a simulated blockchain (simnet).

> **Docs**: https://docs.stacks.co/clarinet/testing-with-clarinet-sdk

### `tests/agent-registry.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const agent1 = accounts.get("wallet_1")!;
const agent2 = accounts.get("wallet_2")!;

describe("Agent Registry", () => {
  it("registers a new agent", () => {
    const result = simnet.callPublicFn(
      "agent-registry",
      "register-agent",
      [Cl.stringAscii("TestBot"), Cl.stringUtf8("ipfs://QmAgent1")],
      agent1
    );
    expect(result.result).toBeOk(Cl.bool(true));
  });

  it("prevents double registration", () => {
    simnet.callPublicFn("agent-registry", "register-agent",
      [Cl.stringAscii("Bot1"), Cl.stringUtf8("ipfs://Qm1")], agent1);
    const result = simnet.callPublicFn("agent-registry", "register-agent",
      [Cl.stringAscii("Bot2"), Cl.stringUtf8("ipfs://Qm2")], agent1);
    expect(result.result).toBeErr(Cl.uint(409));
  });

  it("reads agent data", () => {
    simnet.callPublicFn("agent-registry", "register-agent",
      [Cl.stringAscii("ReadBot"), Cl.stringUtf8("ipfs://QmRead")], agent1);
    const result = simnet.callReadOnlyFn(
      "agent-registry", "get-agent", [Cl.standardPrincipal(agent1)], deployer
    );
    expect(result.result).toBeSome();
  });

  it("tracks agent count", () => {
    simnet.callPublicFn("agent-registry", "register-agent",
      [Cl.stringAscii("A"), Cl.stringUtf8("ipfs://1")], agent1);
    simnet.callPublicFn("agent-registry", "register-agent",
      [Cl.stringAscii("B"), Cl.stringUtf8("ipfs://2")], agent2);
    const count = simnet.callReadOnlyFn("agent-registry", "get-agent-count", [], deployer);
    expect(count.result).toBeUint(2);
  });
});
```

### `tests/agent-marketplace.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const poster = accounts.get("wallet_1")!;
const agent = accounts.get("wallet_2")!;

const SBTC_CONTRACT = "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token";

describe("Agent Marketplace", () => {
  // Setup: register the agent
  it("full job lifecycle: post → accept → complete → release", () => {
    // Register agent
    simnet.callPublicFn("agent-registry", "register-agent",
      [Cl.stringAscii("WorkerBot"), Cl.stringUtf8("ipfs://worker")], agent);

    // Post job with sBTC escrow
    const deadline = simnet.blockHeight + 100;
    const postResult = simnet.callPublicFn(
      "agent-marketplace", "post-job",
      [
        Cl.stringAscii("Analyze dataset"),
        Cl.bufferFromHex("ab".repeat(32)),  // desc-hash
        Cl.uint(1000),                       // reward: 1000 sats
        Cl.contractPrincipal("SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4", "sbtc-token"),
        Cl.uint(deadline),
      ],
      poster
    );
    expect(postResult.result).toBeOk(Cl.uint(0)); // job-id 0

    // Accept job
    const acceptResult = simnet.callPublicFn(
      "agent-marketplace", "accept-job", [Cl.uint(0)], agent
    );
    expect(acceptResult.result).toBeOk(Cl.bool(true));

    // Complete job with proof
    const completeResult = simnet.callPublicFn(
      "agent-marketplace", "complete-job",
      [Cl.uint(0), Cl.bufferFromHex("cd".repeat(32))],
      agent
    );
    expect(completeResult.result).toBeOk(Cl.bool(true));

    // Release payment
    const releaseResult = simnet.callPublicFn(
      "agent-marketplace", "release-payment",
      [
        Cl.uint(0),
        Cl.contractPrincipal("SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4", "sbtc-token"),
      ],
      poster
    );
    expect(releaseResult.result).toBeOk(Cl.bool(true));

    // Verify job status is RELEASED (3)
    const job = simnet.callReadOnlyFn("agent-marketplace", "get-job", [Cl.uint(0)], deployer);
    // Check reputation was updated
    const rep = simnet.callReadOnlyFn(
      "agent-registry", "get-reputation",
      [Cl.standardPrincipal(agent)], deployer
    );
    expect(rep.result).toBeUint(110); // 100 initial + 10 from completion
  });

  it("prevents unregistered agents from accepting jobs", () => {
    const unregistered = accounts.get("wallet_3")!;
    // Post a job first
    simnet.callPublicFn("agent-marketplace", "post-job",
      [
        Cl.stringAscii("Test job"),
        Cl.bufferFromHex("aa".repeat(32)),
        Cl.uint(500),
        Cl.contractPrincipal("SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4", "sbtc-token"),
        Cl.uint(simnet.blockHeight + 100),
      ],
      poster
    );
    const result = simnet.callPublicFn("agent-marketplace", "accept-job", [Cl.uint(0)], unregistered);
    expect(result.result).toBeErr(Cl.uint(403));
  });

  it("allows poster to cancel open jobs and get refund", () => {
    simnet.callPublicFn("agent-marketplace", "post-job",
      [
        Cl.stringAscii("Cancel me"),
        Cl.bufferFromHex("bb".repeat(32)),
        Cl.uint(200),
        Cl.contractPrincipal("SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4", "sbtc-token"),
        Cl.uint(simnet.blockHeight + 50),
      ],
      poster
    );
    const result = simnet.callPublicFn("agent-marketplace", "cancel-job",
      [
        Cl.uint(0),
        Cl.contractPrincipal("SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4", "sbtc-token"),
      ],
      poster
    );
    expect(result.result).toBeOk(Cl.bool(true));
  });
});
```

### Running Tests

```bash
# Validate contracts compile
clarinet check

# Run all tests
npm test

# Run with verbose output
npm test -- --reporter=verbose

# Interactive REPL for manual testing
clarinet console
```

---

## 7. Frontend

### Tech Stack

- **Next.js 14+** (App Router)
- **@stacks/connect** — Leather/Xverse wallet connection
- **@stacks/transactions** — Building and signing txs
- **@stacks/network** — Network configuration
- **Tailwind CSS** — Styling

> **Docs**: https://docs.stacks.co/clarinet/integrations/stacks.js

### Wallet Connection

```typescript
// lib/stacks.ts
import { StacksTestnet, StacksMainnet } from "@stacks/network";
import { showConnect, openContractCall } from "@stacks/connect";
import { Cl, PostConditionMode } from "@stacks/transactions";

export const network = new StacksTestnet(); // Switch to StacksMainnet for prod

export function connectWallet() {
  showConnect({
    appDetails: {
      name: "Agent Market",
      icon: "/logo.png",
    },
    onFinish: () => window.location.reload(),
    userSession,
  });
}
```

### Posting a Job (sBTC Escrow)

```typescript
// app/actions/post-job.ts
import { openContractCall } from "@stacks/connect";
import { Cl, PostConditionMode } from "@stacks/transactions";
import { network } from "@/lib/stacks";

export async function postJob(title: string, descHash: string, reward: number) {
  const deadline = (await getCurrentBlockHeight()) + 1000; // ~7 days

  await openContractCall({
    contractAddress: "YOUR_DEPLOYER_ADDRESS",
    contractName: "agent-marketplace",
    functionName: "post-job",
    functionArgs: [
      Cl.stringAscii(title),
      Cl.bufferFromHex(descHash),
      Cl.uint(reward),
      Cl.contractPrincipal("SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4", "sbtc-token"),
      Cl.uint(deadline),
    ],
    postConditionMode: PostConditionMode.Deny,
    postConditions: [
      // Enforce exact sBTC transfer amount
      makeStandardFungiblePostCondition(
        userAddress,
        FungibleConditionCode.Equal,
        reward,
        createAssetInfo("SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4", "sbtc-token", "sbtc")
      ),
    ],
    network,
    onFinish: (data) => console.log("TX:", data.txId),
  });
}
```

### Reading Job Data

```typescript
// lib/read-contract.ts
import { callReadOnlyFunction, Cl } from "@stacks/transactions";
import { network } from "@/lib/stacks";

export async function getJob(jobId: number) {
  const result = await callReadOnlyFunction({
    contractAddress: "YOUR_DEPLOYER_ADDRESS",
    contractName: "agent-marketplace",
    functionName: "get-job",
    functionArgs: [Cl.uint(jobId)],
    network,
    senderAddress: "YOUR_DEPLOYER_ADDRESS",
  });
  return result;
}

export async function getAgentCount() {
  const result = await callReadOnlyFunction({
    contractAddress: "YOUR_DEPLOYER_ADDRESS",
    contractName: "agent-registry",
    functionName: "get-agent-count",
    functionArgs: [],
    network,
    senderAddress: "YOUR_DEPLOYER_ADDRESS",
  });
  return result;
}
```

### Key Frontend Pages

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/` | Overview: agent stats, open jobs, your jobs |
| Register | `/register` | Register as an agent (name, metadata URI) |
| Job Board | `/jobs` | Browse open jobs, filter by reward/deadline |
| Post Job | `/jobs/new` | Post a new job with sBTC escrow |
| Job Detail | `/jobs/[id]` | Accept, complete, release, or cancel |
| Agent Profile | `/agents/[address]` | Reputation, completed jobs, stake |

---

## 8. x402 + AIBTC Agent Integration

### x402 for Paid Job Discovery

x402 enables HTTP 402 micropayments. Agents pay a small fee in sBTC/STX to discover and filter jobs.

```typescript
// agent-service/x402-server.ts
import express from "express";

const app = express();

// Paid endpoint — agents pay via x402 to get detailed job listings
app.get("/api/jobs", requireX402Payment({ amount: 100, token: "sBTC" }), (req, res) => {
  // Return enriched job data (full descriptions, poster reputation, etc.)
  const jobs = await getOpenJobs();
  res.json(jobs);
});

// Free endpoint — basic job count/overview
app.get("/api/jobs/count", (req, res) => {
  res.json({ count: await getJobCount() });
});
```

### AIBTC Agent Tools Integration

```typescript
// agent-service/agent.ts
import { createWallet } from "@aibtc/agent-tools";

// Create agent wallet from mnemonic
const wallet = createWallet(process.env.MNEMONIC!, 0);

// Agent autonomously browses jobs, accepts, completes, submits proof
async function agentLoop() {
  // 1. Pay x402 to discover jobs
  const jobs = await fetch402("/api/jobs");

  // 2. Filter jobs matching agent capabilities
  const bestJob = jobs.filter((j) => j.reward > 500).sort((a, b) => b.reward - a.reward)[0];

  // 3. Accept job on-chain
  await callContract("agent-marketplace", "accept-job", [Cl.uint(bestJob.id)], wallet);

  // 4. Do the work (call AI model, generate report, etc.)
  const result = await doWork(bestJob);

  // 5. Submit completion proof
  const proofHash = sha256(JSON.stringify(result));
  await callContract("agent-marketplace", "complete-job",
    [Cl.uint(bestJob.id), Cl.bufferFromHex(proofHash)], wallet);
}
```

> **AIBTC Agent Tools**: https://github.com/aibtcdev/agent-tools-ts
> **AIBTC Smart Contracts**: https://github.com/aibtcdev/aibtcdev-contracts
> **AIBTC Docs**: https://docs.aibtc.dev/

---

## 9. Deployment

### Testnet Deployment

```bash
# Generate deployment plan
clarinet deployments generate --testnet --medium-cost

# Review the plan
cat deployments/default.testnet-plan.yaml

# Deploy
clarinet deployments apply --testnet
```

Ensure `settings/Testnet.toml` has a valid mnemonic and sufficient STX for gas.

> **Docs**: https://docs.stacks.co/clarinet/contract-deployment

### sBTC Address Mapping

Clarinet auto-remaps sBTC addresses per network:

| Network | sBTC Contract |
|---------|--------------|
| Simnet/Devnet | `SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token` |
| Testnet | `ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token` |
| Mainnet | Same as simnet address |

Your contract code always uses the simnet address — Clarinet handles remapping.

### Frontend Deployment

```bash
cd frontend
vercel deploy --prod
```

---

## 10. Demo & Submission

### Demo Video Script (< 5 min)

1. **Intro** (30s): "Agent Market — Bitcoin's first autonomous agent labor market"
2. **Register Agent** (45s): Connect Leather wallet → register agent with name + metadata
3. **Post Job** (60s): Post "Analyze Bitcoin block data" job → show sBTC escrow locking
4. **Accept Job** (30s): Switch to agent wallet → browse jobs → accept
5. **Complete & Release** (60s): Agent submits proof hash → poster releases payment → show sBTC transfer
6. **Reputation** (30s): Show agent reputation increased after successful job
7. **x402 Discovery** (30s): Show agent paying to discover jobs via API
8. **Outro** (15s): Architecture slide, GitHub link, "Built on Stacks with sBTC"

### Submission Checklist

- [ ] GitHub repo (public, clean README with architecture diagram)
- [ ] Deployed testnet contracts (both registry + marketplace)
- [ ] Working frontend on Vercel
- [ ] Demo video uploaded (< 5 min)
- [ ] Listed on DoraHacks BUIDL Gallery
- [ ] Bounty applications: Best x402 Integration + Most Innovative Use of sBTC + Best Use of USDCx

---

## 11. Reference Links

### Core Docs
| Resource | URL |
|----------|-----|
| Stacks Docs (root) | https://docs.stacks.co |
| Clarinet Overview | https://docs.stacks.co/clarinet |
| Clarinet Quickstart | https://docs.stacks.co/clarinet/quickstart |
| Clarinet Project Structure | https://docs.stacks.co/clarinet/project-structure |
| Clarinet Testing (Vitest + SDK) | https://docs.stacks.co/clarinet/testing-with-clarinet-sdk |
| Clarinet sBTC Integration | https://docs.stacks.co/clarinet/integrations/sbtc |
| Clarinet + stacks.js | https://docs.stacks.co/clarinet/integrations/stacks.js |
| Contract Deployment | https://docs.stacks.co/clarinet/contract-deployment |
| Clarity Language Reference | https://docs.stacks.co/clarity |
| Clarity Functions | https://docs.stacks.co/clarity/functions |

### Ecosystem
| Resource | URL |
|----------|-----|
| AIBTC Agent Tools (TS) | https://github.com/aibtcdev/agent-tools-ts |
| AIBTC Smart Contracts | https://github.com/aibtcdev/aibtcdev-contracts |
| AIBTC Docs | https://docs.aibtc.dev/ |
| Clarinet GitHub | https://github.com/stx-labs/clarinet |
| @stacks/clarinet-sdk (npm) | https://www.npmjs.com/package/@stacks/clarinet-sdk |
| @stacks/connect (npm) | https://www.npmjs.com/package/@stacks/connect |
| @stacks/transactions (npm) | https://www.npmjs.com/package/@stacks/transactions |
| @stacks/network (npm) | https://www.npmjs.com/package/@stacks/network |
| SIP-010 Token Standard | https://github.com/stacksgov/sips/blob/main/sips/sip-010/sip-010-fungible-token-standard.md |
| Stacks Explorer | https://explorer.hiro.so |
| Stacks Testnet Faucet | https://explorer.hiro.so/sandbox/faucet?chain=testnet |

### Community
| Resource | URL |
|----------|-----|
| Stackers Community (Skool) | https://www.skool.com/stackers |
| @StacksDevs (X/Twitter) | https://x.com/StacksDevs |
| BUIDL BATTLE #2 | https://dorahacks.io/hackathon/buidlbattle2/detail |
| Clarity Working Group | https://www.addevent.com/event/yc0x95fky8y4 |
| AI BTC Working Group | https://www.addevent.com/event/c3qjy462xr82 |

### Example Contracts to Study
| Contract | Why |
|----------|-----|
| AIBTC `agent-account.clar` | Agent wallet pattern on Stacks |
| AIBTC `identity-registry-v2.clar` | On-chain agent identity (our base) |
| Clarinet examples `counter.clar` | Basic Clarity patterns |
| sBTC example marketplace | sBTC escrow + NFT minting pattern |
| friedger/clarity-smart-contracts | Community escrow/marketplace examples |

---

## Build Timeline

| Days | Milestone | Deliverable |
|------|-----------|-------------|
| 1-2 | Setup + Clarity basics | Clarinet project, counter tutorial, sBTC wired |
| 3-5 | Registry contract | `agent-registry.clar` + tests passing |
| 6-9 | Marketplace contract | `agent-marketplace.clar` + full lifecycle tests |
| 10-12 | Frontend scaffold | Next.js + wallet connect + read contracts |
| 13-15 | Frontend complete | Post/accept/complete/release job UI |
| 16-17 | x402 + agent demo | Autonomous agent script + paid discovery |
| 18 | Testnet deploy | Both contracts deployed, frontend on Vercel |
| 19 | Demo video | Record walkthrough |
| 20 | Submit | DoraHacks listing + bounty applications |
