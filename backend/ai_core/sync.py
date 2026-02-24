"""
OpenRouter model registry synchronization
"""

from typing import Dict, Any, Set
import requests


def safe_parse_float(value: Any) -> float:
    """
    Safely parse a float value, returning 0 for invalid values

    Args:
        value: Value to parse (string, number, None, etc.)

    Returns:
        Parsed float or 0 for invalid values
    """
    if value is None:
        return 0.0
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0.0


def sync_openrouter_models(supabase: Any) -> Dict[str, int]:
    """
    Fetch all OpenRouter models and sync them into the ai_models table.

    - New models are inserted with is_active=True
    - Existing models are updated with latest pricing and context lengths
    - Models no longer in the API response are set to is_active=False
    - Models with missing or zero pricing are skipped

    Args:
        supabase: Supabase client instance

    Returns:
        Summary dict with keys: inserted, updated, deactivated

    Raises:
        Exception: On network failure or API errors
    """
    result = {
        'inserted': 0,
        'updated': 0,
        'deactivated': 0,
    }

    try:
        # Fetch models from OpenRouter API (no auth required)
        response = requests.get('https://openrouter.ai/api/v1/models', timeout=30)

        if not response.ok:
            raise Exception(
                f'OpenRouter API error: {response.status_code} {response.reason}'
            )

        api_data = response.json()

        # Get current OpenRouter models from database
        existing_result = supabase.from_('ai_models') \
            .select('id') \
            .eq('provider', 'openrouter') \
            .execute()

        if existing_result.data is None:
            raise Exception('Failed to fetch existing models')

        existing_model_ids: Set[str] = set(m['id'] for m in existing_result.data)
        api_model_ids: Set[str] = set()

        # Process each model from the API
        for model in api_data.get('data', []):
            model_id = model['id']
            api_model_ids.add(model_id)

            # Parse pricing
            cost_per_input_token = safe_parse_float(model.get('pricing', {}).get('prompt'))
            cost_per_output_token = safe_parse_float(model.get('pricing', {}).get('completion'))

            # Skip models with missing or zero pricing
            if cost_per_input_token == 0 and cost_per_output_token == 0:
                continue

            # Parse context and output limits
            max_context_tokens = model.get('context_length') or 8192
            max_output_tokens = 8192  # Conservative fallback

            # Extract max_completion_tokens from top_provider if available
            top_provider = model.get('top_provider')
            if top_provider and isinstance(top_provider, dict):
                max_comp = top_provider.get('max_completion_tokens')
                if max_comp:
                    max_output_tokens = max_comp

            # Prepare model row
            model_row = {
                'id': model_id,
                'provider': 'openrouter',
                'display_name': model.get('name', model_id),
                'cost_per_input_token': cost_per_input_token,
                'cost_per_output_token': cost_per_output_token,
                'max_context_tokens': max_context_tokens,
                'max_output_tokens': max_output_tokens,
                'supports_streaming': True,  # OpenRouter supports streaming for all models
                'supports_tools': True,      # OpenRouter supports tools via OpenAI format
                'is_default': False,
                'is_active': True,
            }

            # Upsert: insert if new, update if exists
            try:
                supabase.from_('ai_models').upsert(model_row, on_conflict='id').execute()

                # Track if this was an insert or update
                if model_id in existing_model_ids:
                    result['updated'] += 1
                else:
                    result['inserted'] += 1
            except Exception as e:
                print(f'Failed to upsert model {model_id}: {e}')
                continue

        # Deactivate models that are no longer in the API response
        models_to_deactivate = [
            model_id for model_id in existing_model_ids
            if model_id not in api_model_ids
        ]

        if models_to_deactivate:
            try:
                supabase.from_('ai_models') \
                    .update({'is_active': False}) \
                    .in_('id', models_to_deactivate) \
                    .execute()
                result['deactivated'] = len(models_to_deactivate)
            except Exception as e:
                print(f'Failed to deactivate removed models: {e}')

        return result

    except requests.exceptions.RequestException as error:
        # Network failures, timeouts
        raise Exception(f'OpenRouter sync failed: {str(error)}')
    except Exception as error:
        # Other errors
        raise Exception(f'OpenRouter sync failed: {str(error)}')
