/**
 * OpenRouter model registry synchronization
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Result summary from syncOpenRouterModels
 */
export interface SyncResult {
  inserted: number;
  updated: number;
  deactivated: number;
}

/**
 * OpenRouter API model format
 */
interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;  // per-token string like "0.000003"
    completion: string;
  };
  context_length: number;
  top_provider?: {
    max_completion_tokens?: number | null;
  };
}

/**
 * OpenRouter API response format
 */
interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

/**
 * Safely parse a float value, returning 0 for invalid values
 */
function safeParseFloat(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Fetch all OpenRouter models and sync them into the ai_models table.
 *
 * - New models are inserted with is_active=true
 * - Existing models are updated with latest pricing and context lengths
 * - Models no longer in the API response are set to is_active=false
 * - Models with missing or zero pricing are skipped
 *
 * @param supabase - Supabase client instance
 * @returns Summary of sync operation
 * @throws Error on network failure or API errors
 */
export async function syncOpenRouterModels(
  supabase: SupabaseClient
): Promise<SyncResult> {
  const result: SyncResult = {
    inserted: 0,
    updated: 0,
    deactivated: 0,
  };

  try {
    // Fetch models from OpenRouter API (no auth required)
    const response = await fetch('https://openrouter.ai/api/v1/models');

    if (!response.ok) {
      throw new Error(
        `OpenRouter API error: ${response.status} ${response.statusText}`
      );
    }

    const apiData = await response.json() as OpenRouterModelsResponse;

    // Get current OpenRouter models from database
    const { data: existingModels, error: fetchError } = await supabase
      .from('ai_models')
      .select('id')
      .eq('provider', 'openrouter');

    if (fetchError) {
      throw new Error(`Failed to fetch existing models: ${fetchError.message}`);
    }

    const existingModelIds = new Set((existingModels || []).map(m => m.id));
    const apiModelIds = new Set<string>();

    // Process each model from the API
    for (const model of apiData.data) {
      apiModelIds.add(model.id);

      // Parse pricing
      const costPerInputToken = safeParseFloat(model.pricing.prompt);
      const costPerOutputToken = safeParseFloat(model.pricing.completion);

      // Skip models with missing or zero pricing
      if (costPerInputToken === 0 && costPerOutputToken === 0) {
        continue;
      }

      // Parse context and output limits
      const maxContextTokens = model.context_length || 8192;
      const maxOutputTokens =
        model.top_provider?.max_completion_tokens || 8192; // Conservative fallback

      // Prepare model row
      const modelRow = {
        id: model.id,
        provider: 'openrouter',
        display_name: model.name,
        cost_per_input_token: costPerInputToken,
        cost_per_output_token: costPerOutputToken,
        max_context_tokens: maxContextTokens,
        max_output_tokens: maxOutputTokens,
        supports_streaming: true,  // OpenRouter supports streaming for all models
        supports_tools: true,      // OpenRouter supports tools via OpenAI format
        is_default: false,
        is_active: true,
      };

      // Upsert: insert if new, update if exists
      const { error: upsertError } = await supabase
        .from('ai_models')
        .upsert(modelRow, { onConflict: 'id' });

      if (upsertError) {
        console.error(`Failed to upsert model ${model.id}:`, upsertError);
        continue;
      }

      // Track if this was an insert or update
      if (existingModelIds.has(model.id)) {
        result.updated++;
      } else {
        result.inserted++;
      }
    }

    // Deactivate models that are no longer in the API response
    const modelsToDeactivate = Array.from(existingModelIds).filter(
      id => !apiModelIds.has(id)
    );

    if (modelsToDeactivate.length > 0) {
      const { error: deactivateError } = await supabase
        .from('ai_models')
        .update({ is_active: false })
        .in('id', modelsToDeactivate);

      if (deactivateError) {
        console.error('Failed to deactivate removed models:', deactivateError);
      } else {
        result.deactivated = modelsToDeactivate.length;
      }
    }

    return result;

  } catch (error) {
    // Network failures, rate limits, or unexpected errors
    if (error instanceof Error) {
      throw new Error(`OpenRouter sync failed: ${error.message}`);
    }
    throw new Error('OpenRouter sync failed with unknown error');
  }
}
