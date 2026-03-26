"""Executive Audit document generator."""

import os
from anthropic import Anthropic
from go_bag.core import ClientContext
from .base import DocumentGenerator


class ExecutiveAuditGenerator(DocumentGenerator):
    """Generates Executive Audit document."""

    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('ANTHROPIC_API_KEY')
        self.client = Anthropic(api_key=self.api_key)

    def filename(self) -> str:
        return "01_Executive_Audit.md"

    def generate(self, context: ClientContext) -> str:
        """Generate Executive Audit with site analysis and alignment."""

        prompt = f"""You are a strategic consultant preparing a high-level executive audit for a prospective client.

Company Name: {context.client_name}
Mission: {context.mission}
Target Audience: {context.target_audience}
Brand Tone: {context.brand_tone}
Primary Services: {', '.join(context.primary_services)}

Based on their website ({context.website_url}), write a professional Executive Audit in Markdown that includes:

1. **Current Digital Presence Assessment** - A 2-3 paragraph analysis of their web presence, messaging clarity, and digital maturity
2. **Brand Strengths** - 3-4 bullet points highlighting what they're doing well
3. **Key Opportunity Gaps** - 3-4 bullet points on areas where they could improve (positioning, clarity, conversion, engagement)
4. **Our Alignment** - A 2-paragraph statement on why we're the perfect partner (emphasize that we understand their mission, audience, and tone)
5. **Recommended Focus Areas** - 3-4 priority areas for the first 90 days of engagement

Keep the tone professional but warm. Use their brand tone in your writing. Make it feel bespoke and high-touch, not generic."""

        response = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1500,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        content = response.content[0].text

        # Wrap in markdown header
        md = f"""# Executive Audit: {context.client_name}

**Date:** {{current_date}}
**Prepared for:** {context.client_name}
**Prepared by:** Your Company Name

---

{content}

---

*This audit is based on analysis of {context.client_name}'s current website and digital presence. We look forward to discussing these insights with you.*
"""

        return md
