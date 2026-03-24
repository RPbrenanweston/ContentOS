interface MetricCardProps {
  label: string;
  value: number;
  suffix?: string;
}

export function MetricCard({ label, value, suffix }: MetricCardProps) {
  const formatted = value >= 1000
    ? `${(value / 1000).toFixed(1)}k`
    : value.toString();

  return (
    <div className="border border-border px-4 py-3">
      <div className="font-small text-muted uppercase">{label}</div>
      <div className="font-data text-foreground text-2xl mt-1">
        {formatted}
        {suffix && <span className="text-muted text-sm ml-1">{suffix}</span>}
      </div>
    </div>
  );
}
