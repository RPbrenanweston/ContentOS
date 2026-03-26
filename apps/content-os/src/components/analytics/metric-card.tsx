// @crumb metric-card
// UI | Data display | Metric visualization | Analytics card
// why: Simple reusable card for displaying single numeric metrics with auto-formatting (k suffix for thousands)
// in:[label, value (number), optional suffix] out:[formatted metric display] err:[invalid number type, null label]
// hazard: Auto-formatting uses toFixed(1) but k-formatting hides decimals—1234 shows as "1.2k" losing 34 units
// hazard: No decimal rounding for non-k values—floating point display could show "1234.56789" for values > 1000
// edge:../analytics/lineage-table.tsx -> RELATES [metric-card could display in analytics dashboard]
// edge:../../domain/performance-metric.ts -> READS [metric value structure]
// prompt: Document k-formatting precision loss. Add decimal control parameter. Validate label length for overflow.

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
