// @crumb insights-dashboard
// UI | analytics-view | data-aggregation
// why: Surfaces creation pipeline metrics and distribution lineage; enables data-driven decisions about content strategy and variant performance
// in:[/api/content, /api/assets, /api/distribution/jobs] out:[JSX-dashboard-ui] err:[fetch-failure]
// hazard: No error handling on cascading API fetches; if any single fetch fails, entire metrics state remains unset (undefined metrics rendered)
// hazard: Nested Promise.all in load() doesn't validate response schemas; malformed API responses crash lineageRows construction
// hazard: Filter state updates don't debounce; rapid filter changes trigger expensive re-renders across MetricCard and LineageTable
// edge:../../components/analytics/metric-card.tsx -> USES
// edge:../../components/analytics/lineage-table.tsx -> USES
// edge:/api/content -> API-ENDPOINT
// edge:/api/assets -> API-ENDPOINT
// edge:/api/distribution/jobs -> API-ENDPOINT
// prompt: Add granular error states for each API layer (nodes/assets/jobs); implement schema validation on all responses; debounce filter changes

'use client';

import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/analytics/metric-card';
import { LineageTable } from '@/components/analytics/lineage-table';
import type { ContentNode, DerivedAsset, DistributionJob } from '@/domain';

interface LineageRow {
  node: ContentNode;
  assets: DerivedAsset[];
  jobs: DistributionJob[];
}

interface OverviewMetrics {
  totalNodes: number;
  totalAssets: number;
  totalPublished: number;
  totalFailed: number;
}

export default function ArchivePage() {
  const [rows, setRows] = useState<LineageRow[]>([]);
  const [metrics, setMetrics] = useState<OverviewMetrics>({
    totalNodes: 0,
    totalAssets: 0,
    totalPublished: 0,
    totalFailed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    async function load() {
      try {
        // Load all content nodes
        const nodesRes = await fetch('/api/content');
        const nodesData = await nodesRes.json();
        const nodes: ContentNode[] = nodesData.nodes ?? [];

        // For each node, load assets and jobs
        const lineageRows: LineageRow[] = await Promise.all(
          nodes.map(async (node) => {
            const assetsRes = await fetch(`/api/assets?nodeId=${node.id}`);
            const assetsData = await assetsRes.json();
            const assets: DerivedAsset[] = assetsData.assets ?? [];

            // Load jobs for all assets
            const allJobs: DistributionJob[] = [];
            for (const asset of assets) {
              const jobsRes = await fetch(`/api/distribution/jobs?assetId=${asset.id}`);
              const jobsData = await jobsRes.json();
              allJobs.push(...(jobsData.jobs ?? []));
            }

            return { node, assets, jobs: allJobs };
          }),
        );

        setRows(lineageRows);

        // Calculate overview metrics
        const totalAssets = lineageRows.reduce((sum, r) => sum + r.assets.length, 0);
        const totalPublished = lineageRows.reduce(
          (sum, r) => sum + r.jobs.filter((j) => j.status === 'published').length,
          0,
        );
        const totalFailed = lineageRows.reduce(
          (sum, r) => sum + r.jobs.filter((j) => j.status === 'failed').length,
          0,
        );

        setMetrics({
          totalNodes: nodes.length,
          totalAssets,
          totalPublished,
          totalFailed,
        });
      } catch (e) {
        console.error('Failed to load archive:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredRows = filter
    ? rows.filter((r) =>
        r.node.title.toLowerCase().includes(filter.toLowerCase()) ||
        r.node.contentType.includes(filter.toLowerCase()),
      )
    : rows;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-12 border-b border-border flex items-center px-4">
        <span className="font-button text-primary">THE ARCHIVE</span>
      </div>

      {/* Metrics strip */}
      <div className="grid grid-cols-4 border-b border-border">
        <MetricCard label="Content Nodes" value={metrics.totalNodes} />
        <MetricCard label="Derived Assets" value={metrics.totalAssets} />
        <MetricCard label="Published" value={metrics.totalPublished} />
        <MetricCard label="Failed" value={metrics.totalFailed} />
      </div>

      {/* Filter bar */}
      <div className="h-12 border-b border-border flex items-center px-4">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="FILTER..."
          className="bg-transparent font-small text-foreground placeholder:text-muted outline-none w-64"
        />
        <span className="font-small text-muted ml-4">
          {filteredRows.length} / {rows.length} RESULTS
        </span>
      </div>

      {/* Lineage table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 font-small text-muted">[DATA STREAM INCOMING]</div>
        ) : filteredRows.length === 0 ? (
          <div className="p-4 font-small text-muted">0 RESULTS FOUND</div>
        ) : (
          <LineageTable rows={filteredRows} />
        )}
      </div>
    </div>
  );
}
