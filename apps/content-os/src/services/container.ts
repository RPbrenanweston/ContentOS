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
import { aiClient } from '@/lib/ai';
import type { ITranscriptService } from '@/services/interfaces/transcript.service';
import type { IDecompositionService } from '@/services/interfaces/decomposition.service';
import type { IAssetGeneratorService } from '@/services/interfaces/asset-generator.service';
import type { IMediaService } from '@/services/interfaces/media.service';
import type { IDistributionService } from '@/services/interfaces/distribution.service';

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

  cachedContainer = {
    contentNodeRepo: new ContentNodeRepo(supabase),
    segmentRepo: new ContentSegmentRepo(supabase),
    assetRepo: new DerivedAssetRepo(supabase),
    accountRepo,
    jobRepo,
    metricRepo,

    transcriptService: new DeepgramTranscriptService(),
    decompositionService: new AIDecompositionService(aiClient),
    assetGeneratorService: new AIAssetGeneratorService(aiClient),
    mediaService: new FFmpegMediaService(),
    distributionService: new DistributionServiceImpl(jobRepo, accountRepo, metricRepo),
  };

  return cachedContainer;
}
