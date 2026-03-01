interface AgentBadgeProps {
  reputation: number;
  name?: string;
}

export function AgentBadge({ reputation, name }: AgentBadgeProps) {
  const color =
    reputation >= 150
      ? "text-green-400 border-green-600"
      : reputation >= 100
        ? "text-orange-400 border-orange-600"
        : "text-red-400 border-red-600";

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 border rounded text-sm ${color}`}>
      {name && <span className="font-medium">{name}</span>}
      <span className="font-mono">{reputation}</span>
    </span>
  );
}
