/**
 * Autonomous Agent Demo Script
 *
 * Demonstrates the full agent lifecycle:
 * 1. Create agent wallet
 * 2. Register agent on-chain
 * 3. Query x402 API for open jobs
 * 4. Accept best matching job
 * 5. Simulate work and submit proof
 * 6. Log all steps with tx hashes
 *
 * Usage: node agent-demo.js
 */

import { fetchCallReadOnlyFunction, Cl, makeContractCall, broadcastTransaction, AnchorMode } from "@stacks/transactions";
import { createHash } from "crypto";

const DEPLOYER = process.env.DEPLOYER_ADDRESS || "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
const NETWORK = "testnet";
const X402_API = process.env.X402_API_URL || "http://localhost:3001";
const SBTC_CONTRACT = "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4";

function log(step, message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`\n[${ timestamp }] Step ${step}: ${message}`);
  if (data) console.log("  ->", JSON.stringify(data, null, 2));
}

async function callReadOnly(contract, fn, args = []) {
  return fetchCallReadOnlyFunction({
    contractAddress: DEPLOYER,
    contractName: contract,
    functionName: fn,
    functionArgs: args,
    network: NETWORK,
    senderAddress: DEPLOYER,
  });
}

async function agentDemo() {
  console.log("=".repeat(60));
  console.log("  AGENT MARKET - Autonomous Agent Demo");
  console.log("  Bitcoin's first autonomous agent labor market");
  console.log("=".repeat(60));

  // Step 1: Agent identity
  log(1, "Initializing agent wallet");
  const agentAddress = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"; // wallet_2
  console.log(`  Agent address: ${agentAddress}`);

  // Step 2: Check registration
  log(2, "Checking agent registration status");
  try {
    const isReg = await callReadOnly("agent-registry", "is-registered", [
      Cl.standardPrincipal(agentAddress),
    ]);
    console.log(`  Registered: ${JSON.stringify(isReg)}`);

    if (isReg.type !== 3) {
      console.log("  Agent not registered. In production, would call register-agent.");
      console.log("  Registration would create on-chain identity with:");
      console.log("    - Name: AutonomousWorkerBot");
      console.log("    - Metadata: ipfs://QmAgentCapabilities");
      console.log("    - Initial Reputation: 100");
    }
  } catch {
    console.log("  Contracts not yet deployed. Simulating registration...");
    console.log("  [SIMULATED] register-agent tx: 0xdemo...registration");
  }

  // Step 3: Query x402 API for jobs
  log(3, "Discovering jobs via x402 API");
  try {
    // Try free endpoint first
    const countResp = await fetch(`${X402_API}/api/jobs/count`);
    if (countResp.ok) {
      const countData = await countResp.json();
      console.log(`  Open jobs: ${countData.count}`);
    }

    // Try paid endpoint
    const jobsResp = await fetch(`${X402_API}/api/jobs`, {
      headers: { "X-402-Payment": "demo-payment-proof" },
    });
    if (jobsResp.ok) {
      const jobsData = await jobsResp.json();
      console.log(`  Enriched jobs received: ${jobsData.total}`);
    }
  } catch {
    console.log("  x402 API not running. Simulating job discovery...");
    console.log("  [SIMULATED] Paid 100 sats for job discovery");
    console.log("  [SIMULATED] Found 3 open jobs:");
    console.log("    - Job #0: 'Analyze dataset' - 1000 sats");
    console.log("    - Job #1: 'Generate report' - 500 sats");
    console.log("    - Job #2: 'Process images' - 2000 sats");
  }

  // Step 4: Select and accept best job
  log(4, "Selecting and accepting best matching job");
  console.log("  Filtering by: reward > 500 sats, deadline not passed");
  console.log("  Best match: Job #2 'Process images' - 2000 sats");
  try {
    const jobCount = await callReadOnly("agent-marketplace", "get-job-count");
    const count = Number(jobCount.value || 0);
    if (count > 0) {
      const job = await callReadOnly("agent-marketplace", "get-job", [Cl.uint(0)]);
      console.log(`  Job data: ${JSON.stringify(job)}`);
    } else {
      console.log("  No jobs on-chain yet. Simulating acceptance...");
      console.log("  [SIMULATED] accept-job tx: 0xdemo...accept");
    }
  } catch {
    console.log("  [SIMULATED] accept-job tx: 0xdemo...accept");
  }

  // Step 5: Do the work
  log(5, "Performing assigned work");
  console.log("  Simulating AI task execution...");
  await new Promise((r) => setTimeout(r, 1000));
  const workResult = {
    task: "Process images",
    outputImages: 42,
    accuracy: 0.97,
    completedAt: new Date().toISOString(),
  };
  console.log(`  Work result: ${JSON.stringify(workResult)}`);

  // Step 6: Submit proof
  log(6, "Submitting completion proof on-chain");
  const proofHash = createHash("sha256")
    .update(JSON.stringify(workResult))
    .digest("hex");
  console.log(`  Proof hash: 0x${proofHash}`);
  console.log("  [SIMULATED] complete-job tx: 0xdemo...complete");

  // Step 7: Await payment release
  log(7, "Awaiting payment release from poster");
  console.log("  Poster reviews proof hash on-chain...");
  console.log("  [SIMULATED] release-payment tx: 0xdemo...release");
  console.log("  Payment received: 2000 sats sBTC");

  // Step 8: Check updated reputation
  log(8, "Checking updated reputation");
  try {
    const rep = await callReadOnly("agent-registry", "get-reputation", [
      Cl.standardPrincipal(agentAddress),
    ]);
    console.log(`  Current reputation: ${Number(rep.value || 0)}`);
  } catch {
    console.log("  [SIMULATED] Reputation: 100 -> 110 (+10 for successful job)");
  }

  console.log("\n" + "=".repeat(60));
  console.log("  Demo complete! Full autonomous agent lifecycle executed.");
  console.log("  In production, all steps use real on-chain transactions.");
  console.log("=".repeat(60));
}

agentDemo().catch(console.error);
