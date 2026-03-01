import { describe, it, expect } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const agent1 = accounts.get("wallet_1")!;
const agent2 = accounts.get("wallet_2")!;
const agent3 = accounts.get("wallet_3")!;

describe("Agent Registry", () => {
  // Registration
  it("registers a new agent", () => {
    const result = simnet.callPublicFn(
      "agent-registry",
      "register-agent",
      [Cl.stringAscii("TestBot"), Cl.stringUtf8("ipfs://QmAgent1")],
      agent1
    );
    expect(result.result).toBeOk(Cl.bool(true));
  });

  it("returns correct agent data after registration", () => {
    simnet.callPublicFn(
      "agent-registry",
      "register-agent",
      [Cl.stringAscii("ReadBot"), Cl.stringUtf8("ipfs://QmRead")],
      agent1
    );
    const result = simnet.callReadOnlyFn(
      "agent-registry",
      "get-agent",
      [Cl.standardPrincipal(agent1)],
      deployer
    );
    // Verify it's a Some value
    expect(result.result).toBeSome(expect.anything());
    // Verify reputation via dedicated read-only
    const rep = simnet.callReadOnlyFn(
      "agent-registry",
      "get-reputation",
      [Cl.standardPrincipal(agent1)],
      deployer
    );
    expect(rep.result).toBeUint(100);
  });

  it("prevents duplicate registration", () => {
    simnet.callPublicFn(
      "agent-registry",
      "register-agent",
      [Cl.stringAscii("Bot1"), Cl.stringUtf8("ipfs://Qm1")],
      agent1
    );
    const result = simnet.callPublicFn(
      "agent-registry",
      "register-agent",
      [Cl.stringAscii("Bot2"), Cl.stringUtf8("ipfs://Qm2")],
      agent1
    );
    expect(result.result).toBeErr(Cl.uint(409));
  });

  it("tracks agent count correctly after multiple registrations", () => {
    simnet.callPublicFn(
      "agent-registry",
      "register-agent",
      [Cl.stringAscii("A"), Cl.stringUtf8("ipfs://1")],
      agent1
    );
    simnet.callPublicFn(
      "agent-registry",
      "register-agent",
      [Cl.stringAscii("B"), Cl.stringUtf8("ipfs://2")],
      agent2
    );
    const count = simnet.callReadOnlyFn(
      "agent-registry",
      "get-agent-count",
      [],
      deployer
    );
    expect(count.result).toBeUint(2);
  });

  it("is-registered returns true for registered, false otherwise", () => {
    simnet.callPublicFn(
      "agent-registry",
      "register-agent",
      [Cl.stringAscii("RegBot"), Cl.stringUtf8("ipfs://reg")],
      agent1
    );
    const registered = simnet.callReadOnlyFn(
      "agent-registry",
      "is-registered",
      [Cl.standardPrincipal(agent1)],
      deployer
    );
    expect(registered.result).toBeBool(true);

    const notRegistered = simnet.callReadOnlyFn(
      "agent-registry",
      "is-registered",
      [Cl.standardPrincipal(agent2)],
      deployer
    );
    expect(notRegistered.result).toBeBool(false);
  });

  // Reputation
  it("initial reputation is u100", () => {
    simnet.callPublicFn(
      "agent-registry",
      "register-agent",
      [Cl.stringAscii("RepBot"), Cl.stringUtf8("ipfs://rep")],
      agent1
    );
    const rep = simnet.callReadOnlyFn(
      "agent-registry",
      "get-reputation",
      [Cl.standardPrincipal(agent1)],
      deployer
    );
    expect(rep.result).toBeUint(100);
  });

  it("get-reputation returns u0 for unregistered agents", () => {
    const rep = simnet.callReadOnlyFn(
      "agent-registry",
      "get-reputation",
      [Cl.standardPrincipal(agent3)],
      deployer
    );
    expect(rep.result).toBeUint(0);
  });

  it("only marketplace contract can call update-reputation", () => {
    simnet.callPublicFn(
      "agent-registry",
      "register-agent",
      [Cl.stringAscii("AuthBot"), Cl.stringUtf8("ipfs://auth")],
      agent1
    );
    const result = simnet.callPublicFn(
      "agent-registry",
      "update-reputation",
      [Cl.standardPrincipal(agent1), Cl.bool(true)],
      agent2
    );
    expect(result.result).toBeErr(Cl.uint(403));
  });

  // Staking
  it("agent can stake sBTC", () => {
    simnet.callPublicFn(
      "agent-registry",
      "register-agent",
      [Cl.stringAscii("StakeBot"), Cl.stringUtf8("ipfs://stake")],
      agent1
    );
    const result = simnet.callPublicFn(
      "agent-registry",
      "stake-sbtc",
      [Cl.uint(1000)],
      agent1
    );
    expect(result.result).toBeOk(Cl.bool(true));
  });

  it("non-registered agents cannot stake", () => {
    const result = simnet.callPublicFn(
      "agent-registry",
      "stake-sbtc",
      [Cl.uint(1000)],
      agent3
    );
    expect(result.result).toBeErr(Cl.uint(404));
  });
});
