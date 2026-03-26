'use client';

import { useState } from 'react';
import { frameworkCategories, type WritingFramework, type FrameworkCategory } from '@/lib/frameworks';

interface PlanNote {
  sectionIndex: number;
  text: string;
}

interface ContentPlan {
  id: string;
  title: string;
  category: FrameworkCategory;
  framework: WritingFramework;
  notes: PlanNote[];
  createdAt: Date;
}

export function WritingFrameworks() {
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [activePlan, setActivePlan] = useState<ContentPlan | null>(null);
  const [browsingCategory, setBrowsingCategory] = useState<FrameworkCategory | null>(null);
  const [browsingFramework, setBrowsingFramework] = useState<WritingFramework | null>(null);
  const [activeSection, setActiveSection] = useState(0);
  const [planTitle, setPlanTitle] = useState('');

  /* --- Create a new plan from a framework --- */
  const createPlan = (category: FrameworkCategory, framework: WritingFramework) => {
    const plan: ContentPlan = {
      id: `plan-${Date.now()}`,
      title: planTitle.trim() || 'Untitled plan',
      category,
      framework,
      notes: framework.sections.map((_, i) => ({ sectionIndex: i, text: '' })),
      createdAt: new Date(),
    };
    setPlans((prev) => [plan, ...prev]);
    setActivePlan(plan);
    setBrowsingCategory(null);
    setBrowsingFramework(null);
    setPlanTitle('');
    setActiveSection(0);
  };

  const updateNote = (sectionIndex: number, text: string) => {
    if (!activePlan) return;
    const updated = {
      ...activePlan,
      notes: activePlan.notes.map((n) =>
        n.sectionIndex === sectionIndex ? { ...n, text } : n
      ),
    };
    setActivePlan(updated);
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const updatePlanTitle = (title: string) => {
    if (!activePlan) return;
    const updated = { ...activePlan, title };
    setActivePlan(updated);
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const filledSections = activePlan?.notes.filter((n) => n.text.trim().length > 0).length ?? 0;
  const totalSections = activePlan?.framework.sections.length ?? 0;

  return (
    <div className="h-full flex">
      {/* --- Left panel: Plans list + Framework browser --- */}
      <div
        className="w-[280px] shrink-0 flex flex-col overflow-hidden"
        style={{ borderRight: '1px solid var(--theme-border)', backgroundColor: 'var(--theme-surface)' }}
      >
        {/* Header */}
        <div className="p-4 pb-3" style={{ borderBottom: '1px solid var(--theme-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--theme-foreground)' }}>Plans</h2>
            <button
              onClick={() => { setActivePlan(null); setBrowsingCategory(null); setBrowsingFramework(null); }}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors"
              style={{ backgroundColor: 'var(--theme-btn-primary-bg)', color: 'var(--theme-btn-primary-text)' }}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New
            </button>
          </div>

          {/* Existing plans */}
          {plans.length > 0 && (
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => { setActivePlan(plan); setActiveSection(0); }}
                  className="w-full text-left px-2.5 py-2 rounded-md transition-colors"
                  style={{
                    backgroundColor: activePlan?.id === plan.id ? 'var(--theme-background)' : 'transparent',
                    border: activePlan?.id === plan.id ? '1px solid var(--theme-border)' : '1px solid transparent',
                  }}
                >
                  <p className="text-xs font-medium truncate" style={{
                    color: activePlan?.id === plan.id ? 'var(--theme-foreground)' : 'var(--theme-muted)',
                  }}>
                    {plan.title}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--theme-muted)' }}>
                    {plan.category.icon} {plan.framework.name}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Framework browser */}
        <div className="flex-1 overflow-y-auto p-3">
          {!browsingCategory ? (
            /* Category list */
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--theme-muted)' }}>
                Frameworks
              </p>
              <div className="space-y-1">
                {frameworkCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setBrowsingCategory(cat)}
                    className="w-full text-left px-2.5 py-2.5 rounded-md transition-colors flex items-center gap-2.5"
                    style={{ color: 'var(--theme-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--theme-background)'; e.currentTarget.style.color = 'var(--theme-foreground)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--theme-muted)'; }}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <div>
                      <p className="text-xs font-medium">{cat.name}</p>
                      <p className="text-[10px]" style={{ color: 'var(--theme-muted)' }}>{cat.frameworks.length} frameworks</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : !browsingFramework ? (
            /* Framework list within category */
            <div>
              <button
                onClick={() => setBrowsingCategory(null)}
                className="flex items-center gap-1 text-[10px] font-medium mb-3 transition-colors"
                style={{ color: 'var(--theme-muted)' }}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                All categories
              </button>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">{browsingCategory.icon}</span>
                <p className="text-xs font-semibold" style={{ color: 'var(--theme-foreground)' }}>{browsingCategory.name}</p>
              </div>
              <div className="space-y-1">
                {browsingCategory.frameworks.map((fw) => (
                  <button
                    key={fw.id}
                    onClick={() => setBrowsingFramework(fw)}
                    className="w-full text-left px-2.5 py-2.5 rounded-md transition-colors"
                    style={{ color: 'var(--theme-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--theme-background)'; e.currentTarget.style.color = 'var(--theme-foreground)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--theme-muted)'; }}
                  >
                    <p className="text-xs font-medium">{fw.name}</p>
                    <p className="text-[10px]">{fw.sections.length} sections</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Framework detail + create plan */
            <div>
              <button
                onClick={() => setBrowsingFramework(null)}
                className="flex items-center gap-1 text-[10px] font-medium mb-3 transition-colors"
                style={{ color: 'var(--theme-muted)' }}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                {browsingCategory.name}
              </button>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--theme-foreground)' }}>{browsingFramework.name}</p>
              <p className="text-[10px] mb-3" style={{ color: 'var(--theme-muted)' }}>{browsingFramework.description}</p>

              <div className="space-y-1 mb-4">
                {browsingFramework.sections.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                      style={{ backgroundColor: 'var(--theme-tag-bg)', color: 'var(--theme-tag-text)' }}>
                      {i + 1}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--theme-muted)' }}>{s.title}</span>
                  </div>
                ))}
              </div>

              <input
                type="text"
                value={planTitle}
                onChange={(e) => setPlanTitle(e.target.value)}
                placeholder="Plan name (optional)"
                className="w-full px-2.5 py-1.5 rounded-md text-xs outline-none mb-2"
                style={{
                  backgroundColor: 'var(--theme-background)',
                  color: 'var(--theme-foreground)',
                  border: '1px solid var(--theme-border)',
                }}
              />

              <button
                onClick={() => createPlan(browsingCategory, browsingFramework)}
                className="w-full px-3 py-2 rounded-md text-xs font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--theme-btn-primary-bg)', color: 'var(--theme-btn-primary-text)' }}
              >
                Create plan with this framework
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --- Main content area --- */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activePlan ? (
          <>
            {/* Plan header */}
            <div className="h-14 flex items-center justify-between px-6" style={{ borderBottom: '1px solid var(--theme-border)' }}>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={activePlan.title}
                  onChange={(e) => updatePlanTitle(e.target.value)}
                  className="bg-transparent text-lg font-semibold outline-none"
                  style={{ color: 'var(--theme-foreground)' }}
                />
                <span className="text-ui-sm">
                  {activePlan.category.icon} {activePlan.framework.name}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-ui-sm">
                  {filledSections}/{totalSections} sections planned
                </span>
                {filledSections > 0 && (
                  <button
                    onClick={() => {
                      if (!activePlan) return;
                      localStorage.setItem('activePlan', JSON.stringify({
                        title: activePlan.title,
                        frameworkName: activePlan.framework.name,
                        sections: activePlan.framework.sections.map((s, i) => ({
                          title: s.title,
                          prompt: s.prompt,
                          hint: s.hint,
                          notes: activePlan.notes.find((n) => n.sectionIndex === i)?.text ?? '',
                        })),
                      }));
                      window.location.href = '/content/new';
                    }}
                    className="px-4 py-1.5 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: 'var(--theme-btn-primary-bg)', color: 'var(--theme-btn-primary-text)' }}
                  >
                    Start writing
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-0.5 w-full" style={{ backgroundColor: 'var(--theme-border)' }}>
              <div className="h-full transition-all duration-300"
                style={{ width: `${(filledSections / totalSections) * 100}%`, backgroundColor: 'var(--theme-primary)' }} />
            </div>

            {/* Sections */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto py-8 px-6">
                <div className="space-y-4">
                  {activePlan.framework.sections.map((section, i) => {
                    const note = activePlan.notes.find((n) => n.sectionIndex === i);
                    const isActive = activeSection === i;
                    const hasContent = (note?.text.trim().length ?? 0) > 0;

                    return (
                      <div
                        key={i}
                        className="rounded-lg transition-all cursor-pointer"
                        style={{
                          backgroundColor: isActive ? 'var(--theme-card-bg)' : 'transparent',
                          border: isActive ? '1px solid var(--theme-card-border)' : '1px solid transparent',
                        }}
                        onClick={() => setActiveSection(i)}
                      >
                        <div className="p-5">
                          {/* Section header */}
                          <div className="flex items-start gap-3 mb-3">
                            <span
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                              style={{
                                backgroundColor: hasContent
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : isActive
                                    ? 'var(--theme-primary)'
                                    : 'var(--theme-surface)',
                                color: hasContent
                                  ? 'var(--theme-success)'
                                  : isActive
                                    ? 'var(--theme-btn-primary-text)'
                                    : 'var(--theme-muted)',
                              }}
                            >
                              {hasContent ? '✓' : i + 1}
                            </span>
                            <div className="flex-1">
                              <h3 className="text-sm font-semibold" style={{
                                color: isActive ? 'var(--theme-foreground)' : 'var(--theme-muted)',
                              }}>
                                {section.title}
                              </h3>
                              {(isActive || !hasContent) && (
                                <p className="text-xs mt-1" style={{ color: 'var(--theme-muted)' }}>
                                  {section.prompt}
                                </p>
                              )}
                              {isActive && section.hint && (
                                <p className="text-[11px] mt-1 italic" style={{ color: 'var(--theme-muted)' }}>
                                  {section.hint}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Notes area */}
                          {isActive ? (
                            <div className="ml-9">
                              <textarea
                                value={note?.text ?? ''}
                                onChange={(e) => updateNote(i, e.target.value)}
                                placeholder="Your notes for this section..."
                                rows={4}
                                className="w-full bg-transparent text-sm outline-none resize-none leading-relaxed"
                                style={{
                                  color: 'var(--theme-foreground)',
                                  borderBottom: '1px solid var(--theme-border)',
                                  paddingBottom: '0.75rem',
                                }}
                                autoFocus
                              />
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-ui-sm">
                                  {(note?.text ?? '').split(/\s+/).filter(Boolean).length} words
                                </span>
                                {i < activePlan.framework.sections.length - 1 && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setActiveSection(i + 1); }}
                                    className="flex items-center gap-1 text-xs font-medium transition-colors"
                                    style={{ color: 'var(--theme-primary)' }}
                                  >
                                    Next: {activePlan.framework.sections[i + 1].title}
                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : hasContent ? (
                            <p className="ml-9 text-xs line-clamp-2" style={{ color: 'var(--theme-muted)' }}>
                              {note?.text}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Empty state -- no active plan */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--theme-surface)' }}>
                <svg className="w-8 h-8" style={{ color: 'var(--theme-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                  <path d="M9 12h6" /><path d="M9 16h6" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--theme-foreground)' }}>
                Plan your content
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--theme-muted)' }}>
                Choose a framework from the left panel to structure your next piece.
                Make notes on each section, then start writing when you are ready.
              </p>
              <p className="text-ui-sm">
                {frameworkCategories.length} categories · {frameworkCategories.reduce((sum, c) => sum + c.frameworks.length, 0)} frameworks
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
