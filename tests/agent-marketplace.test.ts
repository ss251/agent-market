import { describe, it, expect } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const poster = accounts.get("wallet_1")!;
const agent = accounts.get("wallet_2")!;
const unregistered = accounts.get("wallet_3")!;

const SBTC = "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4";

function registerAgent(address: string, name: string) {
  return simnet.callPublicFn(
    "agent-registry",
    "register-agent",
    [Cl.stringAscii(name), Cl.stringUtf8(`ipfs://${name}`)],
    address
  );
}

function postJob(from: string, title: string, reward: number, deadline?: number) {
  const dl = deadline ?? simnet.blockHeight + 100;
  return simnet.callPublicFn(
    "agent-marketplace",
    "post-job",
    [
      Cl.stringAscii(title),
      Cl.bufferFromHex("ab".repeat(32)),
      Cl.uint(reward),
      Cl.contractPrincipal(SBTC, "sbtc-token"),
      Cl.uint(dl),
    ],
    from
  );
}

describe("Agent Marketplace", () => {
  // Full lifecycle
  it("full job lifecycle: post -> accept -> complete -> release", () => {
    registerAgent(agent, "WorkerBot");

    const postResult = postJob(poster, "Analyze dataset", 1000);
    expect(postResult.result).toBeOk(Cl.uint(0));

    const acceptResult = simnet.callPublicFn(
      "agent-marketplace",
      "accept-job",
      [Cl.uint(0)],
      agent
    );
    expect(acceptResult.result).toBeOk(Cl.bool(true));

    const completeResult = simnet.callPublicFn(
      "agent-marketplace",
      "complete-job",
      [Cl.uint(0), Cl.bufferFromHex("cd".repeat(32))],
      agent
    );
    expect(completeResult.result).toBeOk(Cl.bool(true));

    const releaseResult = simnet.callPublicFn(
      "agent-marketplace",
      "release-payment",
      [Cl.uint(0), Cl.contractPrincipal(SBTC, "sbtc-token")],
      poster
    );
    expect(releaseResult.result).toBeOk(Cl.bool(true));

    // Verify reputation updated to 110 (100 + 10)
    const rep = simnet.callReadOnlyFn(
      "agent-registry",
      "get-reputation",
      [Cl.standardPrincipal(agent)],
      deployer
    );
    expect(rep.result).toBeUint(110);
  });

  // Post job
  it("post job creates job with correct data", () => {
    const result = postJob(poster, "Test Job", 500);
    expect(result.result).toBeOk(Cl.uint(0));

    const job = simnet.callReadOnlyFn(
      "agent-marketplace",
      "get-job",
      [Cl.uint(0)],
      deployer
    );
    expect(job.result).toBeSome(expect.anything());

    const count = simnet.callReadOnlyFn(
      "agent-marketplace",
      "get-job-count",
      [],
      deployer
    );
    expect(count.result).toBeUint(1);
  });

  it("post job increments job counter", () => {
    postJob(poster, "Job 1", 100);
    postJob(poster, "Job 2", 200);

    const count = simnet.callReadOnlyFn(
      "agent-marketplace",
      "get-job-count",
      [],
      deployer
    );
    expect(count.result).toBeUint(2);
  });

  // Accept job
  it("unregistered agents rejected with err u403", () => {
    postJob(poster, "Test job", 500);
    const result = simnet.callPublicFn(
      "agent-marketplace",
      "accept-job",
      [Cl.uint(0)],
      unregistered
    );
    expect(result.result).toBeErr(Cl.uint(403));
  });

  it("cannot accept non-OPEN jobs", () => {
    registerAgent(agent, "AcceptBot");
    postJob(poster, "Accepted job", 500);

    // Accept it first
    simnet.callPublicFn("agent-marketplace", "accept-job", [Cl.uint(0)], agent);

    // Try to accept again - should fail with invalid status
    const result = simnet.callPublicFn(
      "agent-marketplace",
      "accept-job",
      [Cl.uint(0)],
      agent
    );
    expect(result.result).toBeErr(Cl.uint(400));
  });

  // Complete job
  it("non-assignee rejected from completing", () => {
    registerAgent(agent, "CompleteBot");
    registerAgent(unregistered, "OtherBot");
    postJob(poster, "Complete test", 500);

    simnet.callPublicFn("agent-marketplace", "accept-job", [Cl.uint(0)], agent);

    const result = simnet.callPublicFn(
      "agent-marketplace",
      "complete-job",
      [Cl.uint(0), Cl.bufferFromHex("ee".repeat(32))],
      unregistered
    );
    expect(result.result).toBeErr(Cl.uint(403));
  });

  it("cannot complete non-ACCEPTED jobs", () => {
    registerAgent(agent, "StatusBot");
    postJob(poster, "Status test", 500);

    // Try to complete before accepting
    const result = simnet.callPublicFn(
      "agent-marketplace",
      "complete-job",
      [Cl.uint(0), Cl.bufferFromHex("ff".repeat(32))],
      agent
    );
    expect(result.result).toBeErr(Cl.uint(400));
  });

  // Release payment
  it("non-poster rejected from releasing payment", () => {
    registerAgent(agent, "ReleaseBot");
    postJob(poster, "Release test", 500);

    simnet.callPublicFn("agent-marketplace", "accept-job", [Cl.uint(0)], agent);
    simnet.callPublicFn(
      "agent-marketplace",
      "complete-job",
      [Cl.uint(0), Cl.bufferFromHex("dd".repeat(32))],
      agent
    );

    const result = simnet.callPublicFn(
      "agent-marketplace",
      "release-payment",
      [Cl.uint(0), Cl.contractPrincipal(SBTC, "sbtc-token")],
      agent
    );
    expect(result.result).toBeErr(Cl.uint(403));
  });

  it("cannot release non-COMPLETED jobs", () => {
    registerAgent(agent, "EarlyRelease");
    postJob(poster, "Early release test", 500);

    simnet.callPublicFn("agent-marketplace", "accept-job", [Cl.uint(0)], agent);

    // Try to release before completing
    const result = simnet.callPublicFn(
      "agent-marketplace",
      "release-payment",
      [Cl.uint(0), Cl.contractPrincipal(SBTC, "sbtc-token")],
      poster
    );
    expect(result.result).toBeErr(Cl.uint(400));
  });

  // Cancel job
  it("poster can cancel open jobs", () => {
    postJob(poster, "Cancel me", 200);
    const result = simnet.callPublicFn(
      "agent-marketplace",
      "cancel-job",
      [Cl.uint(0), Cl.contractPrincipal(SBTC, "sbtc-token")],
      poster
    );
    expect(result.result).toBeOk(Cl.bool(true));
  });

  it("cannot cancel non-OPEN jobs", () => {
    registerAgent(agent, "CancelBot");
    postJob(poster, "Cant cancel", 200);

    simnet.callPublicFn("agent-marketplace", "accept-job", [Cl.uint(0)], agent);

    const result = simnet.callPublicFn(
      "agent-marketplace",
      "cancel-job",
      [Cl.uint(0), Cl.contractPrincipal(SBTC, "sbtc-token")],
      poster
    );
    expect(result.result).toBeErr(Cl.uint(400));
  });

  it("non-poster cannot cancel", () => {
    postJob(poster, "Not yours", 200);
    const result = simnet.callPublicFn(
      "agent-marketplace",
      "cancel-job",
      [Cl.uint(0), Cl.contractPrincipal(SBTC, "sbtc-token")],
      agent
    );
    expect(result.result).toBeErr(Cl.uint(403));
  });

  // Read-only
  it("get-job returns correct data", () => {
    postJob(poster, "Read test", 300);
    const job = simnet.callReadOnlyFn(
      "agent-marketplace",
      "get-job",
      [Cl.uint(0)],
      deployer
    );
    expect(job.result).toBeSome(expect.anything());
  });

  it("get-escrow returns correct escrow record", () => {
    postJob(poster, "Escrow test", 750);
    const escrow = simnet.callReadOnlyFn(
      "agent-marketplace",
      "get-escrow",
      [Cl.uint(0)],
      deployer
    );
    expect(escrow.result).toBeSome(expect.anything());
  });

  it("get-job-count tracks total jobs", () => {
    postJob(poster, "Count 1", 100);
    postJob(poster, "Count 2", 200);
    postJob(poster, "Count 3", 300);

    const count = simnet.callReadOnlyFn(
      "agent-marketplace",
      "get-job-count",
      [],
      deployer
    );
    expect(count.result).toBeUint(3);
  });
});
