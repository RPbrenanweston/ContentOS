"""30-60-90 Day Roadmap document generator."""

import os
from anthropic import Anthropic
from go_bag.core import ClientContext
from .base import DocumentGenerator


class RoadmapGenerator(DocumentGenerator):
    """Generates 30-60-90 day roadmap document."""

    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('ANTHROPIC_API_KEY')
        self.client = Anthropic(api_key=self.api_key)

    def filename(self) -> str:
        return "02_The_90_Day_Roadmap.md"

    def generate(self, context: ClientContext) -> str:
        """Generate customized 30-60-90 day roadmap."""

        prompt = f"""You are a strategy consultant preparing a detailed 30-60-90 day roadmap for {context.client_name}.

Company Name: {context.client_name}
Mission: {context.mission}
Target Audience: {context.target_audience}
Brand Tone: {context.brand_tone}
Primary Services: {', '.join(context.primary_services)}

Write a comprehensive 30-60-90 day roadmap in Markdown that:

**Month 1 (Days 1-30): Foundation & Discovery**
- 3-4 specific discovery activities tailored to their business
- Key milestones and deliverables
- Success metrics for the month

**Month 2 (Days 31-60): Strategy & Build**
- 3-4 implementation activities that build on Month 1
- How we're solving identified gaps
- Interim deliverables and feedback loops

**Month 3 (Days 61-90): Scale & Optimize**
- 3-4 optimization and scaling activities
- How we're measuring impact
- Long-term recommendations beyond 90 days

Each section should feel bespoke to their industry and specific challenges. Use their brand tone. Be specific - avoid generic roadmap language. Make it clear we've studied their business deeply.

Format the roadmap professionally with clear headers and bullet points."""

        response = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        content = response.content[0].text

        md = f"""# The 90-Day Roadmap: {context.client_name}

**Prepared for:** {context.client_name}
**Duration:** 90 days
**Objective:** Establish foundation, implement strategy, and drive measurable results

---

## Overview

This roadmap outlines our phased approach to transforming {context.client_name}'s {', '.join(context.primary_services)} capabilities. We've tailored each phase to your unique mission ({context.mission}) and the needs of {context.target_audience}.

---

{content}

---

## How We'll Measure Success

- Monthly check-ins to review progress against milestones
- Clear KPIs for each phase
- Adaptive approach: roadmap adjusts based on learnings

## Next Steps

1. Align on priorities and timeline
2. Establish core team and communication cadence
3. Kick off Month 1 discovery activities

We're excited to partner with {context.client_name} on this journey.
"""

        return md
