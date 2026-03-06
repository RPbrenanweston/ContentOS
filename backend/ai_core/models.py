"""
Model registry queries

Functions to query ai_models table for model information and cost calculation.
"""

# @crumb
# @id           sal-py-models-registry
# @intent       Serve model metadata (pricing, capabilities) from the Supabase cache populated
#               by sync.py, decoupling provider API from per-request model lookups
# @responsibilities
#               - Query ai_models by model_id for active models
#               - Query default model (is_default=true, is_active=true)
#               - Calculate USD cost from input/output token counts
# @contracts    in: model_id + supabase | out: ModelInfo | raises ModelNotFoundError if absent
# @hazards      .single() throws on multiple matches (e.g., two active rows for same model_id
#               — data integrity issue in DB); no in-memory caching, every call hits Supabase
#               (potential performance bottleneck under concurrent load)
# @area         DAT
# @trail        model-sync-flow#2  | Serve model info from DB cache
# @refs         backend/ai_core/types.py, backend/ai_core/sync.py, packages/ai-core/src/models.ts
# @prompt       Should model lookups be cached in-process to reduce Supabase round-trips?

from typing import Any
from .types import ModelInfo, ModelNotFoundError


def get_model(model_id: str, supabase: Any) -> ModelInfo:
    """
    Get model information by ID

    Args:
        model_id: Model identifier (e.g., 'claude-sonnet-4-20250514')
        supabase: Supabase client

    Returns:
        ModelInfo object

    Raises:
        ModelNotFoundError: If model not found or not active
    """
    response = supabase.from_('ai_models').select('*').eq('id', model_id).eq('is_active', True).single().execute()

    if not response.data:
        raise ModelNotFoundError(model_id)

    return ModelInfo(**response.data)


def get_default_model(supabase: Any) -> ModelInfo:
    """
    Get the default model

    Args:
        supabase: Supabase client

    Returns:
        ModelInfo for the default model (is_default=true, is_active=true)

    Raises:
        ModelNotFoundError: If no default model configured
    """
    response = supabase.from_('ai_models').select('*').eq('is_default', True).eq('is_active', True).single().execute()

    if not response.data:
        raise ModelNotFoundError('default')

    return ModelInfo(**response.data)


def calculate_cost(model: ModelInfo, tokens_in: int, tokens_out: int) -> float:
    """
    Calculate cost in USD for a given token usage

    Args:
        model: ModelInfo with pricing information
        tokens_in: Input token count
        tokens_out: Output token count

    Returns:
        Cost in USD
    """
    cost_in = tokens_in * model.cost_per_input_token
    cost_out = tokens_out * model.cost_per_output_token
    return cost_in + cost_out
