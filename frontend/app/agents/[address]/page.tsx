"use client";

import { useParams } from "next/navigation";
import { useWallet } from "@/lib/wallet-context";
import { AgentBadge } from "@/components/agent-badge";
import { openContractCall } from "@stacks/connect";
import { Cl } from "@stacks/transactions";
import { DEPLOYER, SBTC_CONTRACT, SBTC_TOKEN, network } from "@/lib/stacks";
import { useState } from "react";

export default function AgentProfilePage() {
  const params = useParams();
  const agentAddress = params.address as string;
  const { address } = useWallet();
  const isOwn = address === agentAddress;
  const [stakeAmount, setStakeAmount] = useState("");
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success">("idle");

  async function handleStake() {
    if (!stakeAmount) return;
    const amount = Math.floor(parseFloat(stakeAmount) * 1e8);
    setTxStatus("pending");
    await openContractCall({
      contractAddress: DEPLOYER,
      contractName: "agent-registry",
      functionName: "stake-sbtc",
      functionArgs: [Cl.uint(amount)],
      network,
      onFinish: () => setTxStatus("success"),
      onCancel: () => setTxStatus("idle"),
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Agent Profile</h1>
      <p className="font-mono text-zinc-400 text-sm mb-6">{agentAddress}</p>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-zinc-400">Agent Name</div>
            <div className="text-xl font-semibold">Loading...</div>
          </div>
          <AgentBadge reputation={100} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-zinc-400">Reputation</div>
            <div className="text-2xl font-bold text-orange-500">--</div>
          </div>
          <div>
            <div className="text-sm text-zinc-400">Jobs Completed</div>
            <div className="text-2xl font-bold">--</div>
          </div>
          <div>
            <div className="text-sm text-zinc-400">Jobs Failed</div>
            <div className="text-2xl font-bold">--</div>
          </div>
        </div>

        <div>
          <div className="text-sm text-zinc-400">sBTC Staked</div>
          <div className="text-lg font-semibold">-- sBTC</div>
        </div>

        <div>
          <div className="text-sm text-zinc-400 mb-1">Reputation Progress</div>
          <div className="w-full bg-zinc-800 rounded-full h-3">
            <div
              className="bg-orange-500 h-3 rounded-full transition-all"
              style={{ width: "50%" }}
            />
          </div>
        </div>

        {isOwn && (
          <div className="border-t border-zinc-800 pt-4">
            <h3 className="font-semibold mb-3">Stake sBTC</h3>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.00000001"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder="Amount in sBTC"
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none"
              />
              <button
                onClick={handleStake}
                disabled={txStatus === "pending" || !stakeAmount}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-500 transition disabled:opacity-50"
              >
                {txStatus === "pending" ? "..." : "Stake"}
              </button>
            </div>
            {txStatus === "success" && (
              <p className="text-green-400 text-sm mt-2">Stake submitted!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
