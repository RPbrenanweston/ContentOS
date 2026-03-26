#!/usr/bin/env python3
"""
Client Go Bag CLI Tool

Scrapes a client website, analyzes their brand, and generates three
premium "White Glove" onboarding documents.

Usage:
    python go_bag.py https://example.com
"""

import os
import sys
from pathlib import Path
from datetime import datetime

import typer
from dotenv import load_dotenv
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.panel import Panel

from go_bag.core import ClientContextBuilder
from go_bag.generators import ExecutiveAuditGenerator, RoadmapGenerator, ManifestoGenerator

# Load environment variables
load_dotenv()

app = typer.Typer()
console = Console()


def validate_api_key() -> str:
    """Ensure ANTHROPIC_API_KEY is set."""
    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        console.print(
            Panel(
                "[bold red]❌ Error:[/bold red] ANTHROPIC_API_KEY not found\n\n"
                "Please set your API key:\n"
                "1. Copy .env.example to .env\n"
                "2. Add your Anthropic API key\n"
                "3. Run again",
                title="Configuration Required"
            )
        )
        raise typer.Exit(code=1)
    return api_key


@app.command()
def main(
    url: str = typer.Argument(..., help="Client website URL (e.g., https://example.com)"),
    output_dir: str = typer.Option(
        "client_outputs",
        "--output",
        "-o",
        help="Output directory for generated documents"
    ),
):
    """
    Generate white-glove onboarding documents for a client.

    Takes a client website URL, analyzes their brand intelligence,
    and generates three customized documents:
    - Executive Audit
    - 90-Day Roadmap
    - Communication Manifesto
    """

    # Validate API key
    api_key = validate_api_key()

    try:
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            # Step 1: Scrape and analyze
            task_id = progress.add_task("[cyan]Analyzing client website...", total=None)

            builder = ClientContextBuilder(api_key=api_key)
            context = builder.build(url)

            progress.update(task_id, description="[cyan]Generating documents...")

            # Step 2: Generate documents
            generators = [
                ExecutiveAuditGenerator(api_key=api_key),
                RoadmapGenerator(api_key=api_key),
                ManifestoGenerator(api_key=api_key),
            ]

            # Create output directory
            client_output_path = Path(output_dir) / context.client_name
            client_output_path.mkdir(parents=True, exist_ok=True)

            # Generate each document
            for generator in generators:
                document_content = generator.generate(context)
                filename = generator.filename()
                filepath = client_output_path / filename

                with open(filepath, 'w') as f:
                    f.write(document_content)

            progress.update(task_id, description="[green]✅ Complete!")

        # Success message
        console.print("\n")
        console.print(
            Panel(
                f"[bold green]✨ Go Bag Generated Successfully![/bold green]\n\n"
                f"[bold]Client:[/bold] {context.client_name}\n"
                f"[bold]Output:[/bold] {client_output_path}\n\n"
                f"[yellow]Generated Files:[/yellow]\n"
                f"  • 01_Executive_Audit.md\n"
                f"  • 02_The_90_Day_Roadmap.md\n"
                f"  • 03_Communication_Manifesto.md",
                title="Success"
            )
        )

    except Exception as e:
        console.print(
            Panel(
                f"[bold red]❌ Error:[/bold red]\n{str(e)}",
                title="Generation Failed"
            )
        )
        raise typer.Exit(code=1)


if __name__ == "__main__":
    app()
