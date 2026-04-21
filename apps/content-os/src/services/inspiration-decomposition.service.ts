/**
 * Inspiration decomposition service.
 *
 * Takes fetched inspiration content (article, tweet, transcript, etc.) and
 * extracts structured highlights (key ideas, hooks, quotes, structure notes,
 * tonal markers, vocabulary notes) plus an optional summary.
 *
 * Tuned for a creator learning to write in their own voice: highlight rationales
 * must be detailed enough that the user, reading this months later, can see
 * WHY each snippet was flagged as interesting.
 *
 * Mirrors AIDecompositionService shape (constructor deps, chat call, JSON parse).
 */

import type {
  InspirationHighlightType,
  InspirationSourceType,
  CreateInspirationHighlightParams,
} from '@/domain';
import type { AIClient } from '@/lib/ai';
import type {
  IInspirationDecompositionService,
  InspirationDecompositionInput,
  InspirationDecompositionResult,
} from './interfaces/inspiration';

const SYSTEM_GUIDANCE = `You help a creator study other writing so they can develop their own voice.
Your job: extract the most interesting, reusable, teachable moments from a piece of content.

For each highlight you emit, include:
- highlightType: one of "key_idea" | "hook" | "quote" | "structure_note" | "tonal_marker" | "vocabulary_note"
- content: the actual snippet (for quotes, VERBATIM — preserve wording exactly)
- rationale: 1-2 sentences explaining WHY this is interesting — what the creator can learn from it. Be specific. The creator will re-read this in 6 months and needs to remember WHY this was flagged. Say things like "uses second-person to create intimacy" not "good style."

Skip highlight types that don't apply. Not every piece has structure_notes (tweets rarely do). Not every piece has quotes. Only emit what is actually meaningful.

Target counts (upper bounds — emit fewer if the content doesn't support more):
- key_idea: 2-5
- hook: 1-3
- quote: 1-5 (verbatim only)
- structure_note: 0-2
- tonal_marker: 2-4
- vocabulary_note: 0-3

Return JSON only:
{
  "highlights": [
    { "highlightType": "key_idea", "content": "...", "rationale": "..." }
  ],
  "summary": "2-3 sentence summary of the piece"
}`;

function instructionsForSource(sourceType: InspirationSourceType): string {
  switch (sourceType) {
    case 'tweet':
      return `This is a tweet — short-form. Skip structure_notes. Focus on hook craft, tonal markers, and vocabulary. Emit 0-2 key_ideas at most.`;
    case 'youtube':
      return `This is a YouTube transcript — spoken, so prose will be looser. Look for structural beats, rhetorical devices, and memorable phrasing. Quotes should be verbatim from the transcript.`;
    case 'substack':
      return `This is a Substack post — long-form personal writing. Pay close attention to voice, tonal markers, and structural moves.`;
    case 'linkedin':
      return `This is a LinkedIn post — business-casual, typically structured around a hook and takeaway. Note the hook pattern explicitly.`;
    case 'pdf':
    case 'image':
      return `Source is limited — emit only what is clearly supported by the content.`;
    case 'article':
    default:
      return `This is a long-form article. Full range of highlight types is in play.`;
  }
}

const ALLOWED_HIGHLIGHT_TYPES: ReadonlySet<InspirationHighlightType> = new Set([
  'key_idea',
  'hook',
  'quote',
  'structure_note',
  'tonal_marker',
  'vocabulary_note',
]);

export class AIInspirationDecompositionService
  implements IInspirationDecompositionService
{
  constructor(private ai: AIClient) {}

  async decompose(
    input: InspirationDecompositionInput,
  ): Promise<InspirationDecompositionResult> {
    const body = input.bodyMarkdown?.trim() ?? '';
    if (!body) {
      throw new Error(
        'No content to decompose — inspiration body is empty',
      );
    }

    const sourceInstructions = instructionsForSource(input.sourceType);
    const titleLine = input.title ? `Title: ${input.title}\n\n` : '';

    const prompt = `${SYSTEM_GUIDANCE}\n\n${sourceInstructions}\n\n--- SOURCE (${input.sourceType}) ---\n\n${titleLine}${body}`;

    const result = await this.ai.chat({
      // Inspiration decomposition has no per-user billing surface yet — Phase 1
      // uses the item id as a userId proxy. The API route layer is responsible
      // for passing a real userId if it wants to bill against a specific user.
      userId: input.id,
      featureId: 'inspiration-decomposition',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 4096,
      temperature: 0.3,
    });

    // Strip code fences if present
    let jsonStr = result.content.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();

    const parsed = JSON.parse(jsonStr) as {
      highlights: Array<{
        highlightType: string;
        content: string;
        rationale?: string;
      }>;
      summary?: string;
    };

    // Assign position per type (index within that type's array)
    const positionByType = new Map<InspirationHighlightType, number>();
    const highlights: InspirationDecompositionResult['highlights'] = [];

    for (const h of parsed.highlights ?? []) {
      const type = h.highlightType as InspirationHighlightType;
      if (!ALLOWED_HIGHLIGHT_TYPES.has(type)) continue;
      if (!h.content || typeof h.content !== 'string') continue;

      const position = positionByType.get(type) ?? 0;
      positionByType.set(type, position + 1);

      const highlight: Omit<
        CreateInspirationHighlightParams,
        'inspirationItemId' | 'userId'
      > & { position: number } = {
        highlightType: type,
        content: h.content,
        rationale: h.rationale,
        position,
      };

      highlights.push(highlight);
    }

    return {
      highlights,
      summary: parsed.summary,
    };
  }
}
