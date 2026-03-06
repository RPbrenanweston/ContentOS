/**
 * @crumb
 * @id sal-models-registry
 * @intent Serve model metadata and pricing from the database so callers never hardcode provider-specific model details
 * @responsibilities Model lookup by ID, default model resolution, cost calculation from token counts, database row mapping
 * @contracts getModel(supabase, modelId) => Promise<ModelInfo> | throws ModelNotFoundError; getDefaultModel(supabase, provider) => Promise<ModelInfo>; calculateCost(model, tokensIn, tokensOut) => number
 * @hazards safeParseFloat throws on NaN instead of defaulting — corrupted DB pricing rows crash cost calculation; getDefaultModel returns first match without deterministic ordering — multiple defaults yield inconsistent results
 * @area DAT
 * @refs packages/ai-core/src/sync.ts, packages/ai-core/src/client.ts, packages/ai-core/src/types.ts
 * @trail model-sync-flow#2 | Serve model info that was previously synced and upserted by sync.ts
 * @dependencies @supabase/supabase-js
 * @prompt When adding model fields, update both ModelInfo type in types.ts and mapDatabaseToModel mapping here
 */

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
export async function getModel(modelId: string, supabase: SupabaseClient): Promise<ModelInfo> {
  const { data, error } = await supabase.from('ai_models').select('*').eq('id', modelId).single();

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
export function calculateCost(model: ModelInfo, tokensIn: number, tokensOut: number): number {
  const inputCost = tokensIn * model.costPerInputToken;
  const outputCost = tokensOut * model.costPerOutputToken;
  return inputCost + outputCost;
}

interface DatabaseModelRow {
  id: string;
  provider: string;
  display_name: string;
  cost_per_input_token: string | number;
  cost_per_output_token: string | number;
  max_context_tokens: number;
  max_output_tokens: number;
  supports_streaming: boolean;
  supports_tools: boolean;
  is_default: boolean;
  is_active: boolean;
}

/**
 * Map database model row to ModelInfo
 */
function mapDatabaseToModel(row: DatabaseModelRow): ModelInfo {
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
