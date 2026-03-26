export default function AnalyticsPage() {
  return (
    <div className="h-full flex flex-col">
      <div
        className="h-14 flex items-center px-6 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h1 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
          Insights
        </h1>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <p className="text-2xl mb-2">📊</p>
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
          Distribution analytics
        </p>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Coming soon — see engagement and reach across all channels.
        </p>
      </div>
    </div>
  );
}
