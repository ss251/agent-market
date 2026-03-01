import express from "express";
import { fetchCallReadOnlyFunction, Cl } from "@stacks/transactions";

const app = express();
app.use(express.json());

const DEPLOYER = process.env.DEPLOYER_ADDRESS || "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
const NETWORK = process.env.STACKS_NETWORK || "testnet";
const PORT = process.env.PORT || 3001;
const X402_PRICE_SATS = 100;

// x402 payment verification middleware
function requireX402Payment(req, res, next) {
  const paymentHeader = req.headers["x-402-payment"];
  if (!paymentHeader) {
    return res.status(402).json({
      error: "Payment Required",
      price: X402_PRICE_SATS,
      token: "sBTC",
      message: `This endpoint requires ${X402_PRICE_SATS} sats payment via x402 protocol`,
      accepts: {
        protocol: "x402",
        amount: X402_PRICE_SATS,
        token: "sBTC on Stacks",
      },
    });
  }
  // In production: verify the Stacks transaction referenced in the header
  // For demo: accept any non-empty payment header
  next();
}

// Helper to call read-only contract functions
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

// FREE: Get job count
app.get("/api/jobs/count", async (req, res) => {
  try {
    const result = await callReadOnly("agent-marketplace", "get-job-count");
    const count = Number(result.value || 0);
    res.json({ count, network: NETWORK });
  } catch (error) {
    res.json({ count: 0, network: NETWORK, note: "Contracts may not be deployed yet" });
  }
});

// PAID: Get enriched job listings
app.get("/api/jobs", requireX402Payment, async (req, res) => {
  try {
    const countResult = await callReadOnly("agent-marketplace", "get-job-count");
    const count = Number(countResult.value || 0);

    const jobs = [];
    for (let i = 0; i < count; i++) {
      try {
        const jobResult = await callReadOnly("agent-marketplace", "get-job", [Cl.uint(i)]);
        const escrowResult = await callReadOnly("agent-marketplace", "get-escrow", [Cl.uint(i)]);
        jobs.push({
          id: i,
          job: jobResult,
          escrow: escrowResult,
        });
      } catch {
        // Skip jobs that can't be read
      }
    }

    res.json({
      jobs,
      total: count,
      network: NETWORK,
      enriched: true,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

// PAID: Get detailed agent analytics
app.get("/api/agents/:address", requireX402Payment, async (req, res) => {
  try {
    const { address } = req.params;
    const agentResult = await callReadOnly("agent-registry", "get-agent", [
      Cl.standardPrincipal(address),
    ]);
    const repResult = await callReadOnly("agent-registry", "get-reputation", [
      Cl.standardPrincipal(address),
    ]);

    res.json({
      address,
      agent: agentResult,
      reputation: Number(repResult.value || 0),
      network: NETWORK,
      enriched: true,
    });
  } catch (error) {
    res.status(404).json({ error: "Agent not found" });
  }
});

// FREE: Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "agent-market-x402",
    network: NETWORK,
    x402_price: `${X402_PRICE_SATS} sats per request`,
  });
});

app.listen(PORT, () => {
  console.log(`Agent Market x402 API running on port ${PORT}`);
  console.log(`Network: ${NETWORK}`);
  console.log(`Free: GET /api/jobs/count, GET /api/health`);
  console.log(`Paid: GET /api/jobs, GET /api/agents/:address`);
});
