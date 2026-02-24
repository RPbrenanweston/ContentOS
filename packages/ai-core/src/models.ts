/**
 * Model registry and pricing helpers
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { ModelInfo } from './types';
import { ModelNotFoundError } from './errors';

/**
 * Safely parse a float value, throwing if NaN
 */
function safeParseFloat(value: string | number, fieldName: string): number {
  const parsed = parseFloat(String(value));
  if (isNaN(parsed)) {
    throw new Error(`Invalid numeric value for ${fieldName}: "${value}"`);
  }
  return parsed;
}

/**
 * Get a specific model by ID
 */
export async function getModel(
  modelId: string,
  supabase: SupabaseClient
): Promise<ModelInfo> {
  const { data, error } = await supabase
    .from('ai_models')
    .select('*')
    .eq('id', modelId)
    .single();

  if (error || !data) {
    throw new ModelNotFoundError(modelId);
  }

  return mapDatabaseToModel(data);
}

/**
 * Get the default model
 */
export async function getDefaultModel(supabase: SupabaseClient): Promise<ModelInfo> {
  const { data, error } = await supabase
    .from('ai_models')
    .select('*')
    .eq('is_default', true)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    throw new ModelNotFoundError('default model');
  }

  return mapDatabaseToModel(data);
}

/**
 * Calculate cost for a model call
 */
export function calculateCost(
  model: ModelInfo,
  tokensIn: number,
  tokensOut: number
): number {
  const inputCost = tokensIn * model.costPerInputToken;
  const outputCost = tokensOut * model.costPerOutputToken;
  return inputCost + outputCost;
}

/**
 * Map database model row to ModelInfo
 */
function mapDatabaseToModel(row: any): ModelInfo {
  return {
    id: row.id,
    provider: row.provider,
    displayName: row.display_name,
    costPerInputToken: safeParseFloat(row.cost_per_input_token, 'cost_per_input_token'),
    costPerOutputToken: safeParseFloat(row.cost_per_output_token, 'cost_per_output_token'),
    maxContextTokens: row.max_context_tokens,
    maxOutputTokens: row.max_output_tokens,
    supportsStreaming: row.supports_streaming,
    supportsTools: row.supports_tools,
    isDefault: row.is_default,
    isActive: row.is_active,
  };
}
