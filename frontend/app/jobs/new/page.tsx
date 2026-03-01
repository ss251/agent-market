"use client";

import { useState } from "react";
import { useWallet } from "@/lib/wallet-context";
import { openContractCall } from "@stacks/connect";
import { Cl, PostConditionMode, Pc } from "@stacks/transactions";
import { DEPLOYER, SBTC_CONTRACT, SBTC_TOKEN, network } from "@/lib/stacks";
import { useRouter } from "next/navigation";

export default function PostJobPage() {
  const { address, connected, connect } = useWallet();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("7");
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");

  async function handlePostJob(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !reward || !address) return;

    const rewardSats = Math.floor(parseFloat(reward) * 1e8);
    // Simple hash of description for on-chain storage
    const descBytes = new TextEncoder().encode(description || "no description");
    const hashBuffer = await crypto.subtle.digest("SHA-256", descBytes);
    const descHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const deadlineBlocks = parseInt(deadlineDays) * 144; // ~144 blocks per day

    setTxStatus("pending");
    try {
      await openContractCall({
        contractAddress: DEPLOYER,
        contractName: "agent-marketplace",
        functionName: "post-job",
        functionArgs: [
          Cl.stringAscii(title),
          Cl.bufferFromHex(descHash),
          Cl.uint(rewardSats),
          Cl.contractPrincipal(SBTC_CONTRACT, SBTC_TOKEN),
          Cl.uint(deadlineBlocks),
        ],
        postConditionMode: PostConditionMode.Deny,
        postConditions: [
          Pc.principal(address)
            .willSendEq(rewardSats)
            .ft(`${SBTC_CONTRACT}.${SBTC_TOKEN}`, "sbtc-token"),
        ],
        network,
        onFinish: () => {
          setTxStatus("success");
          setTimeout(() => router.push("/jobs"), 2000);
        },
        onCancel: () => setTxStatus("idle"),
      });
    } catch {
      setTxStatus("error");
    }
  }

  if (!connected) {
    return (
      <div className="text-center py-16">
        <h1 className="text-3xl font-bold mb-4">Post a Job</h1>
        <p className="text-zinc-400 mb-6">Connect your wallet to post a job.</p>
        <button onClick={connect} className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-500 transition">
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-3xl font-bold mb-6">Post a Job</h1>
      <form onSubmit={handlePostJob} className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Job Title</label>
          <input
            type="text"
            maxLength={128}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Analyze Bitcoin block data"
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed job description..."
            rows={4}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
          />
          <p className="text-xs text-zinc-500 mt-1">Description hash stored on-chain</p>
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Reward (sBTC)</label>
          <input
            type="number"
            step="0.00000001"
            min="0.00000001"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            placeholder="0.001"
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Deadline (days)</label>
          <input
            type="number"
            min="1"
            max="30"
            value={deadlineDays}
            onChange={(e) => setDeadlineDays(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
            required
          />
        </div>
        <button
          type="submit"
          disabled={txStatus === "pending"}
          className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-500 transition disabled:opacity-50"
        >
          {txStatus === "pending" ? "Confirming..." : "Post Job with sBTC Escrow"}
        </button>
        {txStatus === "success" && (
          <p className="text-green-400 text-sm">Job posted! Redirecting...</p>
        )}
        {txStatus === "error" && (
          <p className="text-red-400 text-sm">Failed to post job. Please try again.</p>
        )}
      </form>
    </div>
  );
}
