"""
Model registry queries

Functions to query ai_models table for model information and cost calculation.
"""

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
