// @crumb home-page
// UI | welcome-screen | entry-point
// why: Surfaces empty state with primary CTA to encourage first piece creation
// in:[theme-variables] out:[JSX-landing] err:[none-critical]
// hazard: Hardcoded href paths could break with routing changes
// hazard: Theme-dependent styling vulnerable to CSS variable renames
// edge:../../components/ui/theme-toggle.tsx -> USES
// prompt: Keep CTAs aligned with theme-system; validate href paths on routing changes

export default function HomePage() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--theme-foreground)' }}>
            What will you create today?
          </h2>
          <p className="text-[15px] mb-8" style={{ color: 'var(--theme-muted)' }}>
            Write your story, and we'll help it reach every platform authentically.
          </p>

          <div className="flex gap-3 justify-center">
            <a
              href="/content/new"
              className="px-5 py-2.5 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--theme-btn-primary-bg)', color: 'var(--theme-btn-primary-text)' }}
            >
              Start writing
            </a>
            <a
              href="/content"
              className="px-5 py-2.5 text-sm font-medium rounded-lg transition-colors"
              style={{
                border: '1px solid var(--theme-btn-secondary-border)',
                color: 'var(--theme-btn-secondary-text)',
              }}
            >
              View pieces
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
