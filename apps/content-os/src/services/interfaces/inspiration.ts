/**
 * Inspiration service interface contracts.
 *
 * Defines the shape of the fetch service (URL -> raw content) and
 * the decomposition service (raw content -> structured highlights).
 */

import type {
  InspirationSourceType,
  CreateInspirationHighlightParams,
} from '@/domain';

/**
 * Result of fetching an inspiration URL.
 * Optional fields reflect reality: not every source has a title or author.
 */
export interface FetchResult {
  sourceType: InspirationSourceType;
  title?: string;
  author?: string;
  authorHandle?: string;
  publishedAt?: Date;
  bodyMarkdown?: string;
  bodyHtml?: string;
  mediaUrl?: string;
  raw: Record<string, unknown>;
}

export interface IInspirationFetchService {
  fetch(url: string, hintedType?: InspirationSourceType): Promise<FetchResult>;
}

export interface InspirationDecompositionInput {
  id: string;
  title?: string;
  sourceType: InspirationSourceType;
  bodyMarkdown: string;
}

export interface InspirationDecompositionResult {
  highlights: Array<
    Omit<CreateInspirationHighlightParams, 'inspirationItemId' | 'userId'> & {
      position: number;
    }
  >;
  summary?: string;
}

export interface IInspirationDecompositionService {
  decompose(
    input: InspirationDecompositionInput,
  ): Promise<InspirationDecompositionResult>;
}
