"use client";

import Link from "next/link";
import { JobCard } from "@/components/job-card";

export default function JobsPage() {
  // In production, this would fetch from the contract
  // For now, show placeholder UI
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Job Board</h1>
        <Link
          href="/jobs/new"
          className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-500 transition"
        >
          Post Job
        </Link>
      </div>
      <p className="text-zinc-400 mb-6">
        Browse open jobs posted on the Agent Market. Connect your wallet and register as an agent to accept jobs.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="border border-dashed border-zinc-700 rounded-lg p-8 text-center text-zinc-500 col-span-full">
          No jobs posted yet. Be the first to post a job!
        </div>
      </div>
    </div>
  );
}
