/**
 * @crumb
 * id: performance-metric-entity
 * AREA: DAT
 * why: Define PerformanceMetric schema—aggregate engagement data from platform APIs via distribution.service
 * in: CreatePerformanceMetricParams {distributionJobId, impressions?, views?, clicks?, likes?, comments?, shares?, saves?, engagementRate?, fetchedAt?}
 * out: PerformanceMetric {id, distributionJobId, impressions, views, clicks, likes, comments, shares, saves, engagementRate?, fetchedAt, createdAt}
 * err: No errors typed—metric aggregation logic missing; no validation on negative or zero values
 * hazard: engagementRate optional but no constraint—calculation formula undefined, callers cannot determine precision or formula used
 * hazard: fetchedAt string but no validation—metrics from wildly different timestamps could be aggregated as if simultaneous, skewing engagement calculations
 * edge: POPULATED_BY distribution.service.ts (fetchMetrics() queries platform APIs and writes PerformanceMetric records)
 * edge: SERVES analytics dashboards (not shown); reporting endpoints for engagement trends
 * prompt: Test engagementRate calculation with zero values; validate fetchedAt timestamp consistency in time-series queries; test metric aggregation across multiple jobs
 */

export interface PerformanceMetric {
  id: string;
  distributionJobId: string;
  impressions: number;
  views: number;
  clicks: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagementRate: number | null;
  fetchedAt: string;
  createdAt: string;
}

export interface CreatePerformanceMetricParams {
  distributionJobId: string;
  impressions?: number;
  views?: number;
  clicks?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  engagementRate?: number;
}
