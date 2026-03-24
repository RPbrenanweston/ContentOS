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
