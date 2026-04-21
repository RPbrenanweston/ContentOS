/**
 * @crumb
 * id: service-dependency-registry
 * AREA: INF
 * why: Centralize service instantiation and caching—prevent duplicate repository connections and enforce singleton semantics
 * in: supabase (SupabaseClient)
 * out: ServiceContainer {repos[], services[]}
 * err: No errors handled—propagates upstream
 * hazard: Singleton caching prevents test isolation—tests share mutable state, causing flaky test suite with data leakage
 * hazard: Hard coupling to Supabase via instanceof checks breaks with mocked clients—mock tests cannot swap implementations
 * edge: SERVES all request handlers and background jobs
 * edge: READS ServiceContainer interface (defines contract)
 * edge: INSTANTIATES all repository and service classes
 * edge: CALLED_BY route handlers, job processors, API controllers
 * prompt: Verify container resets between tests; validate singleton equality check (supabase instance); ensure mock clients satisfy interface
 */

/**
 * Service container / dependency injection registry.
 */

import { type SupabaseClient } from '@supabase/supabase-js';
import {
  ContentNodeRepo,
  ContentSegmentRepo,
  DerivedAssetRepo,
  DistributionAccountRepo,
  DistributionJobRepo,
  PerformanceMetricRepo,
} from '@/infrastructure/supabase/repositories';
import { DeepgramTranscriptService } from '@/services/transcript.service';
import { AIDecompositionService } from '@/services/decomposition.service';
import { AIAssetGeneratorService } from '@/services/asset-generator.service';
import { FFmpegMediaService } from '@/services/media.service';
import { DistributionServiceImpl } from '@/services/distribution.service';
import { InspirationFetchServiceImpl } from '@/services/inspiration-fetch.service';
import { AIInspirationDecompositionService } from '@/services/inspiration-decomposition.service';
import { getAIClient } from '@/lib/ai';
import type { ITranscriptService } from '@/services/interfaces/transcript.service';
import type { IDecompositionService } from '@/services/interfaces/decomposition.service';
import type { IAssetGeneratorService } from '@/services/interfaces/asset-generator.service';
import type { IMediaService } from '@/services/interfaces/media.service';
import type { IDistributionService } from '@/services/interfaces/distribution.service';
import type {
  IInspirationFetchService,
  IInspirationDecompositionService,
} from '@/services/interfaces/inspiration';

export interface ServiceContainer {
  contentNodeRepo: ContentNodeRepo;
  segmentRepo: ContentSegmentRepo;
  assetRepo: DerivedAssetRepo;
  accountRepo: DistributionAccountRepo;
  jobRepo: DistributionJobRepo;
  metricRepo: PerformanceMetricRepo;

  transcriptService: ITranscriptService;
  decompositionService: IDecompositionService;
  assetGeneratorService: IAssetGeneratorService;
  mediaService: IMediaService;
  distributionService: IDistributionService;
  inspirationFetchService: IInspirationFetchService;
  inspirationDecompositionService: IInspirationDecompositionService;
}

let cachedContainer: ServiceContainer | null = null;
let cachedClient: SupabaseClient | null = null;

export function getServices(supabase: SupabaseClient): ServiceContainer {
  if (cachedContainer && cachedClient === supabase) {
    return cachedContainer;
  }

  cachedClient = supabase;

  const jobRepo = new DistributionJobRepo(supabase);
  const accountRepo = new DistributionAccountRepo(supabase);
  const metricRepo = new PerformanceMetricRepo(supabase);
  const assetRepo = new DerivedAssetRepo(supabase);

  cachedContainer = {
    contentNodeRepo: new ContentNodeRepo(supabase),
    segmentRepo: new ContentSegmentRepo(supabase),
    assetRepo,
    accountRepo,
    jobRepo,
    metricRepo,

    transcriptService: new DeepgramTranscriptService(),
    decompositionService: new AIDecompositionService(getAIClient()),
    assetGeneratorService: new AIAssetGeneratorService(getAIClient(), assetRepo),
    mediaService: new FFmpegMediaService(),
    distributionService: new DistributionServiceImpl(jobRepo, accountRepo, metricRepo),
    inspirationFetchService: new InspirationFetchServiceImpl(),
    inspirationDecompositionService: new AIInspirationDecompositionService(getAIClient()),
  };

  return cachedContainer;
}
