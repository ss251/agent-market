"use client";

import Link from "next/link";
import { useWallet } from "@/lib/wallet-context";

export function Navbar() {
  const { address, connected, connect, disconnect } = useWallet();

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-orange-500">
              Agent Market
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/jobs" className="text-zinc-400 hover:text-white transition">
                Jobs
              </Link>
              <Link href="/jobs/new" className="text-zinc-400 hover:text-white transition">
                Post Job
              </Link>
              <Link href="/register" className="text-zinc-400 hover:text-white transition">
                Register
              </Link>
              {address && (
                <Link href={`/agents/${address}`} className="text-zinc-400 hover:text-white transition">
                  Profile
                </Link>
              )}
            </div>
          </div>
          <div>
            {connected ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-400 font-mono">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
                <button
                  onClick={disconnect}
                  className="px-3 py-1.5 text-sm border border-zinc-700 text-zinc-300 rounded hover:bg-zinc-800 transition"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connect}
                className="px-4 py-2 bg-orange-600 text-white rounded font-medium hover:bg-orange-500 transition"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
