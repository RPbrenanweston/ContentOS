/**
 * @crumb
 * id: content-decomposition
 * AREA: DOM
 * why: Segment content structure for asset generation pipeline—enable lineage preservation and multi-type extraction
 * in: contentNodeId (string), bodyText (string), language (string)
 * out: DecompositionResult {segments: ContentSegment[], summary: string, suggestedAssetTypes: string[]}
 * err: ProcessingError on AI service unavailability
 * hazard: AI analysis failures cascade to downstream assets—no fallback recovery mechanism
 * hazard: Word count extremes (empty or 100k+) cause segment extraction to fail or produce malformed structures
 * edge: SERVES asset-generator.service.ts (segments feed asset generation pipeline)
 * edge: READS ai.ts (Claude integration for content analysis)
 * prompt: Verify segment count matches content complexity; test with <10 and 100k+ word samples; validate lineage tracking
 */

/**
 * Content decomposition service.
 *
 * Uses @org/ai-core (via lib/ai.ts) to analyze content and extract
 * structured segments: ideas, quotes, hooks, clip candidates, chapters.
 *
 * Preserves content lineage — every segment traces back to source.
 */

import type { ContentNode, CreateSegmentParams, SegmentType } from '@/domain';
import type {
  IDecompositionService,
  DecompositionResult,
} from './interfaces/decomposition.service';
import type { AIClient } from '@/lib/ai';

const DECOMPOSITION_PROMPT = `You are a content analyst. Analyze the following content and extract structured segments.

For each segment, provide:
- segmentType: one of "idea", "quote", "hook", "clip_candidate", "chapter", "statistic", "story", "cta"
- title: short descriptive title (max 60 chars)
- body: the actual text content of the segment
- confidence: 0.0-1.0 how confident you are this is a strong segment
- sortOrder: sequential order in the source content

Also provide:
- summary: 2-3 sentence summary of the entire content
- suggestedAssetTypes: which derived assets would work well (e.g., "social_post", "thread", "blog_summary", "email_draft")

Guidelines:
- "hook" = attention-grabbing opening or compelling statement
- "quote" = memorable, quotable passage
- "idea" = key concept or insight
- "clip_candidate" = segment worth extracting as standalone content
- "chapter" = major section or topic transition
- "statistic" = data point or metric
- "story" = anecdote or narrative
- "cta" = call to action

Respond with valid JSON only:
{
  "segments": [
    {
      "segmentType": "hook",
      "title": "Opening hook about...",
      "body": "The actual text...",
      "confidence": 0.95,
      "sortOrder": 0
    }
  ],
  "summary": "...",
  "suggestedAssetTypes": ["social_post", "thread"]
}`;

export class AIDecompositionService implements IDecompositionService {
  constructor(private ai: AIClient) {}

  async decompose(
    node: ContentNode,
    transcript?: string,
  ): Promise<DecompositionResult> {
    const sourceText = transcript ?? node.bodyText ?? '';

    if (!sourceText.trim()) {
      throw new Error('No content to decompose — body text and transcript are both empty');
    }

    const contentContext = node.contentType === 'blog'
      ? `Blog post titled "${node.title}"`
      : node.contentType === 'video'
        ? `Video transcript from "${node.title}"`
        : `Audio transcript from "${node.title}"`;

    const result = await this.ai.chat({
      userId: node.userId,
      featureId: 'content-decomposition',
      messages: [
        {
          role: 'user',
          content: `${DECOMPOSITION_PROMPT}\n\n--- ${contentContext} ---\n\n${sourceText}`,
        },
      ],
      maxTokens: 4096,
      temperature: 0.3,
    });

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = result.content.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr) as {
      segments: Array<{
        segmentType: string;
        title?: string;
        body: string;
        confidence?: number;
        sortOrder?: number;
        startMs?: number;
        endMs?: number;
      }>;
      summary: string;
      suggestedAssetTypes: string[];
    };

    // Map to CreateSegmentParams (without contentNodeId — caller adds it)
    const segments: Omit<CreateSegmentParams, 'contentNodeId'>[] =
      parsed.segments.map((seg, idx) => ({
        segmentType: seg.segmentType as SegmentType,
        title: seg.title ?? undefined,
        body: seg.body,
        confidence: seg.confidence ?? 0.5,
        sortOrder: seg.sortOrder ?? idx,
        startMs: seg.startMs,
        endMs: seg.endMs,
        tags: [],
      }));

    return {
      segments,
      summary: parsed.summary,
      suggestedAssetTypes: parsed.suggestedAssetTypes,
    };
  }
}
