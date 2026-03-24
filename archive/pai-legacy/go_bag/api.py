"""
Go Bag API Module

Exposes core functions for programmatic access by Ralph loops,
slash commands, and other external systems.

This module is intentionally separate from the CLI to enable:
- Asynchronous execution via Ralph
- Direct function imports for slash commands
- Integration with larger orchestration systems
"""

import os
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict

from go_bag.core import ClientContextBuilder, ClientContext
from go_bag.generators import ExecutiveAuditGenerator, RoadmapGenerator, ManifestoGenerator


async def generate_go_bag(
    url: str,
    output_dir: str = "client_outputs",
    api_key: Optional[str] = None,
) -> Dict[str, str]:
    """
    Generate complete go bag for a client (async-compatible).

    Args:
        url: Client website URL
        output_dir: Base output directory
        api_key: Anthropic API key (uses env if not provided)

    Returns:
        Dict with client name and generated file paths

    Raises:
        ValueError: If API key not found or URL invalid
        Exception: If scraping or generation fails
    """
    # Use provided API key or load from environment
    if not api_key:
        api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not found in environment")

    # Build client context
    builder = ClientContextBuilder(api_key=api_key)
    context = builder.build(url)

    # Create output directory
    client_output_path = Path(output_dir) / context.client_name
    client_output_path.mkdir(parents=True, exist_ok=True)

    # Generate documents
    generators = [
        ExecutiveAuditGenerator(api_key=api_key),
        RoadmapGenerator(api_key=api_key),
        ManifestoGenerator(api_key=api_key),
    ]

    generated_files = {}

    for generator in generators:
        try:
            document_content = generator.generate(context)
            filename = generator.filename()
            filepath = client_output_path / filename

            with open(filepath, 'w') as f:
                f.write(document_content)

            generated_files[filename] = str(filepath)
        except Exception as e:
            raise Exception(f"Failed to generate {filename}: {str(e)}")

    return {
        'client_name': context.client_name,
        'output_directory': str(client_output_path),
        'generated_files': generated_files,
        'context': {
            'mission': context.mission,
            'target_audience': context.target_audience,
            'brand_tone': context.brand_tone,
            'primary_services': context.primary_services,
        }
    }


def get_client_context(url: str, api_key: Optional[str] = None) -> ClientContext:
    """
    Extract brand intelligence from a URL without generating documents.

    Useful for: validation, preview, integration with other systems.

    Args:
        url: Client website URL
        api_key: Anthropic API key

    Returns:
        ClientContext with extracted intelligence
    """
    if not api_key:
        api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not found in environment")

    builder = ClientContextBuilder(api_key=api_key)
    return builder.build(url)


def generate_document(
    document_type: str,
    context: ClientContext,
    api_key: Optional[str] = None,
) -> str:
    """
    Generate a single document from existing context.

    Useful for: regenerating individual documents, custom templates.

    Args:
        document_type: One of 'audit', 'roadmap', 'manifesto'
        context: ClientContext with brand intelligence
        api_key: Anthropic API key

    Returns:
        Markdown content as string

    Raises:
        ValueError: If document_type not recognized
    """
    if not api_key:
        api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not found in environment")

    generators = {
        'audit': ExecutiveAuditGenerator,
        'executive_audit': ExecutiveAuditGenerator,
        'roadmap': RoadmapGenerator,
        'manifesto': ManifestoGenerator,
    }

    GeneratorClass = generators.get(document_type.lower())
    if not GeneratorClass:
        raise ValueError(
            f"Unknown document type: {document_type}. "
            f"Valid options: {', '.join(generators.keys())}"
        )

    generator = GeneratorClass(api_key=api_key)
    return generator.generate(context)


def batch_generate(
    urls: list[str],
    output_dir: str = "client_outputs",
    api_key: Optional[str] = None,
) -> list[Dict[str, str]]:
    """
    Generate go bags for multiple clients (non-async version).

    For async batch processing via Ralph, use this as a template
    and wrap with asyncio.gather() in Ralph loop.

    Args:
        urls: List of client website URLs
        output_dir: Base output directory
        api_key: Anthropic API key

    Returns:
        List of results (one per URL)
    """
    if not api_key:
        api_key = os.getenv('ANTHROPIC_API_KEY')

    results = []
    for url in urls:
        try:
            # Using the async function but running synchronously
            # In Ralph, this would be wrapped with asyncio.gather()
            result = generate_go_bag(url, output_dir, api_key)
            results.append({
                'status': 'success',
                'url': url,
                'data': result
            })
        except Exception as e:
            results.append({
                'status': 'failed',
                'url': url,
                'error': str(e)
            })

    return results
