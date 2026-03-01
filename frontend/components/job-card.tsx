import Link from "next/link";

interface JobCardProps {
  id: number;
  title: string;
  reward: number;
  status: number;
  poster: string;
  deadline: number;
}

const STATUS_LABELS: Record<number, string> = {
  0: "Open",
  1: "Accepted",
  2: "Completed",
  3: "Released",
  4: "Cancelled",
  5: "Disputed",
};

const STATUS_COLORS: Record<number, string> = {
  0: "bg-green-900 text-green-300",
  1: "bg-blue-900 text-blue-300",
  2: "bg-yellow-900 text-yellow-300",
  3: "bg-purple-900 text-purple-300",
  4: "bg-zinc-700 text-zinc-300",
  5: "bg-red-900 text-red-300",
};

export function JobCard({ id, title, reward, status, poster, deadline }: JobCardProps) {
  return (
    <Link href={`/jobs/${id}`}>
      <div className="border border-zinc-800 rounded-lg p-4 hover:border-orange-600 transition bg-zinc-900">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-white">{title}</h3>
          <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[status] || "bg-zinc-700 text-zinc-300"}`}>
            {STATUS_LABELS[status] || "Unknown"}
          </span>
        </div>
        <div className="flex justify-between text-sm text-zinc-400 mt-3">
          <span>{reward / 1e8} sBTC</span>
          <span>Block {deadline}</span>
        </div>
        <div className="text-xs text-zinc-500 mt-2 font-mono">
          {poster.slice(0, 8)}...{poster.slice(-4)}
        </div>
      </div>
    </Link>
  );
}
