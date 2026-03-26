"""Communication Manifesto document generator."""

import os
from anthropic import Anthropic
from go_bag.core import ClientContext
from .base import DocumentGenerator


class ManifestoGenerator(DocumentGenerator):
    """Generates Communication Manifesto document."""

    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('ANTHROPIC_API_KEY')
        self.client = Anthropic(api_key=self.api_key)

    def filename(self) -> str:
        return "03_Communication_Manifesto.md"

    def generate(self, context: ClientContext) -> str:
        """Generate communication manifesto matching their brand tone."""

        prompt = f"""You are writing a Communication Manifesto for a partnership with {context.client_name}.

Company Name: {context.client_name}
Mission: {context.mission}
Target Audience: {context.target_audience}
Brand Tone: {context.brand_tone}
Primary Services: {', '.join(context.primary_services)}

Write a Communication Manifesto in Markdown that outlines how WE (the agency/partner) will work WITH them. This should:

1. Open with a statement about shared mission alignment
2. Outline our communication principles (e.g., "We believe in radical transparency", "Weekly syncs, monthly strategies")
3. Define response times and availability expectations
4. Describe our reporting cadence (weekly updates, monthly reviews, quarterly strategy sessions)
5. Explain our approach to collaboration and feedback loops
6. Outline escalation and issue resolution processes
7. End with a shared commitment statement

The tone should match {context.brand_tone}. Make it feel personal and customized to THEM, not a generic boilerplate. Reference their specific mission and what makes them unique. Make it clear we're committed to their success."""

        response = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1500,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        content = response.content[0].text

        md = f"""# Our Communication Manifesto: {context.client_name}

---

## For {context.client_name}

We're committed to a partnership that feels like an extension of your team. Here's how we work.

---

{content}

---

## Commitment

{context.client_name}'s success is our success. We bring strategy, expertise, and heart to every interaction. Let's build something great together.

**Our Team**
[Your Company Name]

---

*Last Updated: {{current_date}}*
*Partnership Begins: {{start_date}}*
"""

        return md
