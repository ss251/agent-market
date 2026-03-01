"use client";

import { useParams } from "next/navigation";
import { useWallet } from "@/lib/wallet-context";
import { openContractCall } from "@stacks/connect";
import { Cl } from "@stacks/transactions";
import { DEPLOYER, SBTC_CONTRACT, SBTC_TOKEN, network } from "@/lib/stacks";
import { useState } from "react";

const STATUS_LABELS: Record<number, string> = {
  0: "Open",
  1: "Accepted",
  2: "Completed",
  3: "Released",
  4: "Cancelled",
  5: "Disputed",
};

export default function JobDetailPage() {
  const params = useParams();
  const jobId = Number(params.id);
  const { address } = useWallet();
  const [proofHash, setProofHash] = useState("");
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success">("idle");

  async function acceptJob() {
    setTxStatus("pending");
    await openContractCall({
      contractAddress: DEPLOYER,
      contractName: "agent-marketplace",
      functionName: "accept-job",
      functionArgs: [Cl.uint(jobId)],
      network,
      onFinish: () => setTxStatus("success"),
      onCancel: () => setTxStatus("idle"),
    });
  }

  async function completeJob() {
    if (!proofHash) return;
    setTxStatus("pending");
    const hash = proofHash.padEnd(64, "0").slice(0, 64);
    await openContractCall({
      contractAddress: DEPLOYER,
      contractName: "agent-marketplace",
      functionName: "complete-job",
      functionArgs: [Cl.uint(jobId), Cl.bufferFromHex(hash)],
      network,
      onFinish: () => setTxStatus("success"),
      onCancel: () => setTxStatus("idle"),
    });
  }

  async function releasePayment() {
    setTxStatus("pending");
    await openContractCall({
      contractAddress: DEPLOYER,
      contractName: "agent-marketplace",
      functionName: "release-payment",
      functionArgs: [
        Cl.uint(jobId),
        Cl.contractPrincipal(SBTC_CONTRACT, SBTC_TOKEN),
      ],
      network,
      onFinish: () => setTxStatus("success"),
      onCancel: () => setTxStatus("idle"),
    });
  }

  async function cancelJob() {
    setTxStatus("pending");
    await openContractCall({
      contractAddress: DEPLOYER,
      contractName: "agent-marketplace",
      functionName: "cancel-job",
      functionArgs: [
        Cl.uint(jobId),
        Cl.contractPrincipal(SBTC_CONTRACT, SBTC_TOKEN),
      ],
      network,
      onFinish: () => setTxStatus("success"),
      onCancel: () => setTxStatus("idle"),
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Job #{jobId}</h1>
      <p className="text-zinc-400 mb-8">
        Job details are loaded from the on-chain contract. Connect your wallet to interact.
      </p>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-zinc-400">Status</div>
            <div className="font-semibold">Loading...</div>
          </div>
          <div>
            <div className="text-sm text-zinc-400">Reward</div>
            <div className="font-semibold">-- sBTC</div>
          </div>
          <div>
            <div className="text-sm text-zinc-400">Poster</div>
            <div className="font-mono text-sm">--</div>
          </div>
          <div>
            <div className="text-sm text-zinc-400">Deadline</div>
            <div className="font-mono text-sm">--</div>
          </div>
        </div>

        {address && (
          <div className="border-t border-zinc-800 pt-4 space-y-3">
            <h3 className="font-semibold text-sm text-zinc-400 uppercase">Actions</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={acceptJob}
                disabled={txStatus === "pending"}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition disabled:opacity-50"
              >
                Accept Job
              </button>
              <button
                onClick={releasePayment}
                disabled={txStatus === "pending"}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition disabled:opacity-50"
              >
                Release Payment
              </button>
              <button
                onClick={cancelJob}
                disabled={txStatus === "pending"}
                className="px-4 py-2 bg-zinc-700 text-white rounded hover:bg-zinc-600 transition disabled:opacity-50"
              >
                Cancel Job
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={proofHash}
                onChange={(e) => setProofHash(e.target.value)}
                placeholder="Proof hash (hex)"
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none"
              />
              <button
                onClick={completeJob}
                disabled={txStatus === "pending" || !proofHash}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-500 transition disabled:opacity-50"
              >
                Complete
              </button>
            </div>
            {txStatus === "success" && (
              <p className="text-green-400 text-sm">Transaction submitted!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
