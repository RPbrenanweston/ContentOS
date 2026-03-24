/**
 * AI-powered derived asset generator.
 *
 * Uses @org/ai-core to generate platform-aware content from segments.
 * Each platform gets tailored formatting, tone, and length constraints.
 */

import type {
  AssetType,
  Platform,
  DerivedAsset,
} from '@/domain';
import type {
  IAssetGeneratorService,
  GenerateAssetParams,
} from './interfaces/asset-generator.service';
import type { AIClient } from '@/lib/ai';

const PLATFORM_GUIDELINES: Record<string, string> = {
  linkedin: `LinkedIn post guidelines:
- Professional tone, insight-driven
- 1-3 short paragraphs (max 1300 chars)
- Use line breaks for readability
- End with a question or call to engagement
- No hashtags in body (add 3-5 relevant ones at the end)`,

  x: `X/Twitter post guidelines:
- Concise, punchy, conversational
- Max 280 characters for single tweet
- For threads: 3-7 tweets, each standalone but connected
- Use hooks that stop the scroll
- No hashtags in body text`,

  youtube: `YouTube description guidelines:
- First 2 lines are the hook (visible before "Show more")
- Include timestamps if applicable
- 2-3 paragraphs of context
- End with subscribe CTA`,

  tiktok: `TikTok caption guidelines:
- Ultra-concise, max 150 characters
- Hook in first 3 words
- Casual, energetic tone
- 3-5 relevant hashtags`,

  instagram: `Instagram caption guidelines:
- Hook in first line (before "more" cut)
- Storytelling format works well
- 1-3 paragraphs
- End with CTA or question
- 5-10 hashtags at the end`,

  newsletter: `Email/newsletter draft guidelines:
- Subject line + preview text
- Personal, direct tone
- 3-5 short paragraphs
- Single clear CTA
- Keep under 500 words`,
};

const ASSET_TYPE_PROMPTS: Record<AssetType, string> = {
  social_post: 'Create a single social media post from the following content segments.',
  thread: 'Create a multi-part thread (3-7 parts) from the following content. Each part should stand alone but connect to the next.',
  clip: 'Write a caption/description for a video clip extracted from this segment.',
  carousel: 'Outline a carousel (5-8 slides) from the following content. For each slide provide: slide number, headline (max 8 words), body text (max 30 words).',
  email_draft: 'Draft a newsletter email based on the following content.',
  blog_summary: 'Write a concise summary (150-250 words) of the following content suitable for a blog digest or RSS feed.',
};

export class AIAssetGeneratorService implements IAssetGeneratorService {
  constructor(private ai: AIClient) {}

  async generate(
    params: GenerateAssetParams,
  ): Promise<Omit<DerivedAsset, 'id' | 'createdAt' | 'updatedAt'>> {
    const segmentText = params.sourceSegments
      .map((s) => `[${s.segmentType.toUpperCase()}] ${s.title ? s.title + ': ' : ''}${s.body}`)
      .join('\n\n');

    const platformGuide = params.platform
      ? PLATFORM_GUIDELINES[params.platform] ?? ''
      : '';

    const typePrompt = ASSET_TYPE_PROMPTS[params.assetType] ?? 'Generate content from the following segments.';

    const prompt = `${typePrompt}

${platformGuide ? `\n${platformGuide}\n` : ''}
${params.tone ? `Tone: ${params.tone}` : ''}
${params.maxLength ? `Max length: ${params.maxLength} characters` : ''}

Source segments:
${segmentText}

Respond with the generated content only. No explanations or metadata.`;

    const result = await this.ai.chat({
      userId: params.userId,
      featureId: 'asset-generation',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 2048,
      temperature: 0.7,
    });

    return {
      contentNodeId: params.contentNodeId,
      assetType: params.assetType,
      status: 'draft',
      title: this.generateTitle(params.assetType, params.platform),
      body: result.content.trim(),
      platformHint: params.platform ?? null,
      mediaUrl: null,
      sourceSegmentIds: params.sourceSegments.map((s) => s.id),
      generationPrompt: prompt,
      aiModel: result.model,
      version: 1,
      metadata: {
        tokensUsed: result.usage.tokensIn + result.usage.tokensOut,
        costUsd: result.usage.costUsd,
        latencyMs: result.latencyMs,
      },
    };
  }

  async regenerate(
    assetId: string,
    feedback: string,
    userId: string,
  ): Promise<Omit<DerivedAsset, 'id' | 'createdAt' | 'updatedAt'>> {
    // Caller should load the existing asset and pass context
    // For now, this is a stub that requires the full asset to be passed via metadata
    const result = await this.ai.chat({
      userId,
      featureId: 'asset-regeneration',
      messages: [
        {
          role: 'user',
          content: `Regenerate this content asset based on the following feedback.

Asset ID: ${assetId}
Feedback: ${feedback}

Generate improved content only. No explanations.`,
        },
      ],
      maxTokens: 2048,
      temperature: 0.7,
    });

    return {
      contentNodeId: '',
      assetType: 'social_post',
      status: 'draft',
      title: null,
      body: result.content.trim(),
      platformHint: null,
      mediaUrl: null,
      sourceSegmentIds: [],
      generationPrompt: `Regeneration feedback: ${feedback}`,
      aiModel: result.model,
      version: 1,
      metadata: { regeneratedFrom: assetId },
    };
  }

  private generateTitle(assetType: AssetType, platform?: Platform): string {
    const platformLabel = platform ? ` for ${platform}` : '';
    const typeLabels: Record<AssetType, string> = {
      social_post: 'Social Post',
      thread: 'Thread',
      clip: 'Clip Caption',
      carousel: 'Carousel',
      email_draft: 'Email Draft',
      blog_summary: 'Blog Summary',
    };
    return `${typeLabels[assetType]}${platformLabel}`;
  }
}
