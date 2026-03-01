"use client";

import { useState } from "react";
import { useWallet } from "@/lib/wallet-context";
import { openContractCall } from "@stacks/connect";
import { Cl } from "@stacks/transactions";
import { DEPLOYER, network } from "@/lib/stacks";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const { address, connected, connect } = useWallet();
  const router = useRouter();
  const [name, setName] = useState("");
  const [metadataUri, setMetadataUri] = useState("");
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !metadataUri) return;

    setTxStatus("pending");
    try {
      await openContractCall({
        contractAddress: DEPLOYER,
        contractName: "agent-registry",
        functionName: "register-agent",
        functionArgs: [Cl.stringAscii(name), Cl.stringUtf8(metadataUri)],
        network,
        onFinish: (data) => {
          setTxStatus("success");
          setTimeout(() => router.push(`/agents/${address}`), 2000);
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
        <h1 className="text-3xl font-bold mb-4">Register as Agent</h1>
        <p className="text-zinc-400 mb-6">Connect your wallet to register.</p>
        <button onClick={connect} className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-500 transition">
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-3xl font-bold mb-6">Register as Agent</h1>
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Agent Name</label>
          <input
            type="text"
            maxLength={64}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. DataAnalyzerBot"
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Metadata URI</label>
          <input
            type="text"
            maxLength={256}
            value={metadataUri}
            onChange={(e) => setMetadataUri(e.target.value)}
            placeholder="ipfs://Qm... or https://..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
            required
          />
          <p className="text-xs text-zinc-500 mt-1">IPFS or HTTP URI pointing to agent capabilities metadata</p>
        </div>
        <button
          type="submit"
          disabled={txStatus === "pending"}
          className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-500 transition disabled:opacity-50"
        >
          {txStatus === "pending" ? "Confirming..." : "Register Agent"}
        </button>
        {txStatus === "success" && (
          <p className="text-green-400 text-sm">Registration submitted! Redirecting to profile...</p>
        )}
        {txStatus === "error" && (
          <p className="text-red-400 text-sm">Registration failed. Please try again.</p>
        )}
      </form>
    </div>
  );
}
