import { fetchCallReadOnlyFunction, Cl } from "@stacks/transactions";
import { DEPLOYER } from "./stacks";

export async function getAgentCount(): Promise<number> {
  const result = await fetchCallReadOnlyFunction({
    contractAddress: DEPLOYER,
    contractName: "agent-registry",
    functionName: "get-agent-count",
    functionArgs: [],
    network: "testnet",
    senderAddress: DEPLOYER,
  });
  return Number((result as { value: bigint }).value || 0);
}

export async function getJobCount(): Promise<number> {
  const result = await fetchCallReadOnlyFunction({
    contractAddress: DEPLOYER,
    contractName: "agent-marketplace",
    functionName: "get-job-count",
    functionArgs: [],
    network: "testnet",
    senderAddress: DEPLOYER,
  });
  return Number((result as { value: bigint }).value || 0);
}

export async function getAgent(address: string) {
  const result = await fetchCallReadOnlyFunction({
    contractAddress: DEPLOYER,
    contractName: "agent-registry",
    functionName: "get-agent",
    functionArgs: [Cl.standardPrincipal(address)],
    network: "testnet",
    senderAddress: DEPLOYER,
  });
  return result;
}

export async function getReputation(address: string): Promise<number> {
  const result = await fetchCallReadOnlyFunction({
    contractAddress: DEPLOYER,
    contractName: "agent-registry",
    functionName: "get-reputation",
    functionArgs: [Cl.standardPrincipal(address)],
    network: "testnet",
    senderAddress: DEPLOYER,
  });
  return Number((result as { value: bigint }).value || 0);
}

export async function isRegistered(address: string): Promise<boolean> {
  const result = await fetchCallReadOnlyFunction({
    contractAddress: DEPLOYER,
    contractName: "agent-registry",
    functionName: "is-registered",
    functionArgs: [Cl.standardPrincipal(address)],
    network: "testnet",
    senderAddress: DEPLOYER,
  });
  return (result as unknown as { type: number }).type === 3;
}

export async function getJob(jobId: number) {
  const result = await fetchCallReadOnlyFunction({
    contractAddress: DEPLOYER,
    contractName: "agent-marketplace",
    functionName: "get-job",
    functionArgs: [Cl.uint(jobId)],
    network: "testnet",
    senderAddress: DEPLOYER,
  });
  return result;
}

export async function getEscrow(jobId: number) {
  const result = await fetchCallReadOnlyFunction({
    contractAddress: DEPLOYER,
    contractName: "agent-marketplace",
    functionName: "get-escrow",
    functionArgs: [Cl.uint(jobId)],
    network: "testnet",
    senderAddress: DEPLOYER,
  });
  return result;
}
