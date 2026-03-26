/**
 * @crumb
 * id: writing-frameworks-library
 * AREA: DAT
 * why: Define writing framework templates—guide asset generation for platform-specific content with proven structural patterns
 * in: None (data structure only; no live queries)
 * out: 32 WritingFramework objects across 6 FrameworkCategory groups (Basic, Narrative, Persuasion, Journalism, Education, Thought Leadership, Creative)
 * err: No errors typed—frameworks are static data; no dynamic validation
 * hazard: frameworks hardcoded in source—adding new frameworks requires code deployment; no hot-reload pathway for template updates
 * hazard: FrameworkSection prompts use imperative language ("What grabs attention") but no parser validates prompt semantics—AI may misinterpret intent
 * edge: ../services/decomposition.service.ts -> RELATES
 * edge: USED_BY asset-generator.service.ts (framework selection based on platform and assetType)
 * edge: REFERENCED_BY UI dashboards for framework picker (not shown in backend)
 * prompt: Test framework coverage for all Platform values (LinkedIn, X, YouTube, TikTok, Instagram, newsletter, Bluesky, Threads, Reddit); verify framework sections align with AssetType enum; test asset generation against each framework; validate hint field clarity for AI interpretation
 */

export interface FrameworkSection {
  title: string;
  prompt: string;
  hint?: string;
}

export interface WritingFramework {
  id: string;
  name: string;
  description: string;
  sections: FrameworkSection[];
}

export interface FrameworkCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  frameworks: WritingFramework[];
}

export const frameworkCategories: FrameworkCategory[] = [
  /* ═══════════════════════════════════════
     BASIC STRUCTURES
     ═══════════════════════════════════════ */
  {
    id: 'basic',
    name: 'Basic Structures',
    description: 'Simple scaffolding that works for any content',
    icon: '📐',
    frameworks: [
      {
        id: 'start-middle-end',
        name: 'Start / Middle / End',
        description: 'The simplest structure — three acts that carry any idea',
        sections: [
          { title: 'Start', prompt: 'Set the scene. What is this about and why should someone care?', hint: 'Hook them in the first two sentences' },
          { title: 'Middle', prompt: 'The substance. What is the core message, story, or argument?', hint: 'This is where the value lives' },
          { title: 'End', prompt: 'The landing. What should the reader take away or do next?', hint: 'Leave them with something to think about' },
        ],
      },
      {
        id: 'hook-bridge-conclusion',
        name: 'Hook / Bridge / Conclusion',
        description: 'Grab attention, build the case, land the point',
        sections: [
          { title: 'Hook', prompt: 'What grabs attention immediately? A stat, question, bold claim, or story?', hint: 'You have 3 seconds' },
          { title: 'Bridge', prompt: 'Connect the hook to your main message. Why does this matter?', hint: 'Transition from intrigue to substance' },
          { title: 'Body', prompt: 'Deliver the core value. What does the reader need to know?', hint: 'Support with evidence or examples' },
          { title: 'Conclusion', prompt: 'Summarise and give a clear next step or thought to carry', hint: 'End stronger than you started' },
        ],
      },
      {
        id: 'five-paragraph',
        name: '5-Paragraph Structure',
        description: 'Classic essay format — intro, three points, conclusion',
        sections: [
          { title: 'Introduction', prompt: 'State your thesis. What are you going to argue or explain?', hint: 'One clear sentence that captures everything' },
          { title: 'Point 1', prompt: 'Your strongest or most foundational argument', hint: 'Lead with your best' },
          { title: 'Point 2', prompt: 'Your second supporting point', hint: 'Build on point 1' },
          { title: 'Point 3', prompt: 'Your third point — the one that seals the deal', hint: 'Often the most surprising or counterintuitive' },
          { title: 'Conclusion', prompt: 'Restate your thesis, strengthened by the three points', hint: 'Never introduce new information here' },
        ],
      },
      {
        id: 'situation-complication-resolution',
        name: 'SCR (Situation → Complication → Resolution)',
        description: 'McKinsey\'s go-to structure for executive communication',
        sections: [
          { title: 'Situation', prompt: 'What is the current state? What does everyone agree on?', hint: 'Establish common ground' },
          { title: 'Complication', prompt: 'What has changed or gone wrong? What is the tension?', hint: 'This creates the need for your piece' },
          { title: 'Resolution', prompt: 'What is the answer? What should be done?', hint: 'Your insight or recommendation' },
        ],
      },
    ],
  },

  /* ═══════════════════════════════════════
     NARRATIVE / STORYTELLING
     ═══════════════════════════════════════ */
  {
    id: 'narrative',
    name: 'Narrative',
    description: 'Story structures for personal stories, case studies, and journeys',
    icon: '📖',
    frameworks: [
      {
        id: 'heros-journey',
        name: "Hero's Journey",
        description: 'The classic transformation arc — struggle to breakthrough',
        sections: [
          { title: 'The Ordinary World', prompt: 'What was the status quo before the change?', hint: 'Set the scene. What did life/work look like before?' },
          { title: 'The Call', prompt: 'What challenge or opportunity appeared?', hint: 'The moment everything shifted' },
          { title: 'The Resistance', prompt: 'What made you hesitate? What were the doubts?', hint: 'Be honest about the friction' },
          { title: 'The Mentor/Insight', prompt: 'What person, idea, or moment gave you clarity?', hint: 'The turning point' },
          { title: 'The Transformation', prompt: 'What did you do differently? What changed?', hint: 'Action and result' },
          { title: 'The Return', prompt: 'What do you know now that you wish you knew then?', hint: 'The lesson for the reader' },
        ],
      },
      {
        id: 'story-spine',
        name: 'Story Spine (Pixar)',
        description: 'Once upon a time... until one day... and ever since then...',
        sections: [
          { title: 'Once upon a time...', prompt: 'Set up the world and the character', hint: 'Establish normal' },
          { title: 'Every day...', prompt: 'What was the routine? The pattern?', hint: 'Repetition builds tension' },
          { title: 'Until one day...', prompt: 'What disrupted the pattern?', hint: 'The inciting incident' },
          { title: 'Because of that...', prompt: 'What happened as a consequence?', hint: 'Cause and effect chain' },
          { title: 'Until finally...', prompt: 'What was the resolution?', hint: 'The climax' },
          { title: 'And ever since then...', prompt: 'What changed permanently?', hint: 'The new normal + lesson' },
        ],
      },
      {
        id: 'before-after-bridge',
        name: 'Before / After / Bridge',
        description: 'Show the contrast between the problem and the solution',
        sections: [
          { title: 'Before', prompt: "Paint the painful picture. What's broken, frustrating, or failing?", hint: 'Make the reader feel the problem' },
          { title: 'After', prompt: 'Describe the ideal outcome. What does the world look like solved?', hint: 'Make them want this future' },
          { title: 'The Bridge', prompt: 'How do you get from Before to After?', hint: 'Your insight, method, or discovery' },
        ],
      },
      {
        id: 'in-medias-res',
        name: 'In Medias Res',
        description: 'Start in the middle of the action, then explain how you got there',
        sections: [
          { title: 'The Moment', prompt: 'Drop the reader into the most intense, interesting, or pivotal moment', hint: 'No context yet — pure scene' },
          { title: 'Rewind', prompt: 'Now back up. How did you get here?', hint: 'Fill in just enough context' },
          { title: 'The Build', prompt: 'Walk through what happened, building back to that moment', hint: 'Now the reader understands the stakes' },
          { title: 'The Resolution', prompt: 'What happened after that pivotal moment?', hint: 'Complete the arc' },
          { title: 'The Reflection', prompt: 'What does it all mean? What did you learn?', hint: 'The takeaway' },
        ],
      },
      {
        id: 'freytags-pyramid',
        name: "Freytag's Pyramid",
        description: 'Classical dramatic structure — rising action to falling action',
        sections: [
          { title: 'Exposition', prompt: 'Introduce the characters, setting, and situation', hint: 'Who, where, when' },
          { title: 'Rising Action', prompt: 'What complications or challenges build tension?', hint: 'Each event raises the stakes' },
          { title: 'Climax', prompt: 'What is the turning point? The moment of highest tension?', hint: 'Everything changes here' },
          { title: 'Falling Action', prompt: 'What happens as a result of the climax?', hint: 'Consequences unfold' },
          { title: 'Resolution', prompt: 'How does it end? What is the new normal?', hint: 'Tie up the threads' },
        ],
      },
      {
        id: 'moth-structure',
        name: 'The Moth Structure',
        description: 'Personal storytelling format from The Moth — stakes, transformation, meaning',
        sections: [
          { title: 'The Stakes', prompt: 'What did you stand to gain or lose? Why did this matter so much?', hint: 'Without stakes, there is no story' },
          { title: 'The Scene', prompt: 'Set the specific moment. Where were you? What did it look, feel, sound like?', hint: 'Sensory details make it real' },
          { title: 'The Choice', prompt: 'What decision did you face? What did you do?', hint: 'Agency is what makes stories compelling' },
          { title: 'The Consequence', prompt: 'What happened as a result of your choice?', hint: 'Be honest — even if it did not go as planned' },
          { title: 'The Meaning', prompt: 'Why are you telling this story now? What does it mean to you?', hint: 'Connect it to something universal' },
        ],
      },
    ],
  },

  /* ═══════════════════════════════════════
     PERSUASION
     ═══════════════════════════════════════ */
  {
    id: 'persuasion',
    name: 'Persuasion',
    description: 'Frameworks for convincing, selling, and changing minds',
    icon: '🎯',
    frameworks: [
      {
        id: 'aida',
        name: 'AIDA',
        description: 'Attention → Interest → Desire → Action',
        sections: [
          { title: 'Attention', prompt: 'What stops the scroll? What makes someone look twice?', hint: 'A surprising fact, bold claim, or vivid image' },
          { title: 'Interest', prompt: 'Now that you have their attention, why should they keep reading?', hint: 'Relevance to their life or work' },
          { title: 'Desire', prompt: 'Make them want the outcome. What does success look like?', hint: 'Paint the picture of the result' },
          { title: 'Action', prompt: 'What should they do right now?', hint: 'One clear, specific next step' },
        ],
      },
      {
        id: 'pas',
        name: 'PAS (Problem → Agitate → Solve)',
        description: 'Name the pain, make it worse, then offer the cure',
        sections: [
          { title: 'Problem', prompt: 'What specific problem does your audience face?', hint: 'Use their language, not yours' },
          { title: 'Agitate', prompt: 'What happens if they do not solve it? What gets worse?', hint: 'Raise the emotional stakes' },
          { title: 'Solve', prompt: 'Present your solution. How does it fix the problem?', hint: 'Be clear and confident' },
        ],
      },
      {
        id: 'monroes-sequence',
        name: "Monroe's Motivated Sequence",
        description: 'Five-step persuasion structure used in the best speeches',
        sections: [
          { title: 'Attention', prompt: 'Open with something that demands attention', hint: 'Story, statistic, or provocative question' },
          { title: 'Need', prompt: 'Establish that there is a problem that must be addressed', hint: 'Make it personal and urgent' },
          { title: 'Satisfaction', prompt: 'Present your solution to the need', hint: 'Explain how it works' },
          { title: 'Visualisation', prompt: 'Help the audience see what life looks like with your solution', hint: 'Contrast: with it vs without it' },
          { title: 'Action', prompt: 'Tell them exactly what to do next', hint: 'Be specific and immediate' },
        ],
      },
      {
        id: 'contrarian-take',
        name: 'Contrarian Take',
        description: 'Challenge conventional wisdom with evidence',
        sections: [
          { title: 'The Common Belief', prompt: 'What does everyone in your industry assume is true?', hint: 'State it clearly and fairly' },
          { title: 'Why It Is Wrong', prompt: 'Where does this belief break down? What evidence contradicts it?', hint: 'Be specific — data, examples, experience' },
          { title: 'The Real Truth', prompt: 'What should people believe instead?', hint: 'Your alternative perspective' },
          { title: 'The Evidence', prompt: 'What proof do you have? Stories, data, results?', hint: '2-3 concrete examples' },
          { title: 'So What?', prompt: 'What should the reader do differently?', hint: 'Actionable takeaway' },
        ],
      },
      {
        id: 'hot-take-evidence',
        name: 'Hot Take → Evidence',
        description: 'Lead with a bold claim, then back it up',
        sections: [
          { title: 'The Bold Claim', prompt: 'What is your spicy, attention-grabbing opinion?', hint: 'One sentence. Make them react.' },
          { title: 'Why This Matters', prompt: 'Why should anyone care right now?', hint: 'Timeliness or stakes' },
          { title: 'Evidence Stack', prompt: 'Three pieces of evidence supporting your claim', hint: 'Mix personal experience, data, and observation' },
          { title: 'The Counterargument', prompt: 'What would a smart critic say?', hint: 'Shows intellectual honesty' },
          { title: 'The Conclusion', prompt: 'Restate your position, now earned', hint: 'Circle back, strengthened' },
        ],
      },
    ],
  },

  /* ═══════════════════════════════════════
     JOURNALISM
     ═══════════════════════════════════════ */
  {
    id: 'journalism',
    name: 'Journalism',
    description: 'News, analysis, trend coverage, and data-driven stories',
    icon: '📰',
    frameworks: [
      {
        id: 'inverted-pyramid',
        name: 'Inverted Pyramid',
        description: 'Most important information first, details follow',
        sections: [
          { title: 'The Lead', prompt: 'What happened? Who, what, when, where — in one paragraph', hint: 'Answer the question a busy person would ask' },
          { title: 'Key Context', prompt: 'Why does this matter? What is the significance?', hint: 'The "so what" factor' },
          { title: 'Supporting Details', prompt: 'Important facts, quotes, or data points', hint: 'Ordered by importance, not chronology' },
          { title: 'Background', prompt: 'What history or context helps understanding?', hint: 'Only what is needed' },
          { title: 'What Next', prompt: 'What should we watch for? Implications?', hint: 'Forward-looking close' },
        ],
      },
      {
        id: '5w1h',
        name: '5W1H Deep Dive',
        description: 'Who, What, When, Where, Why, How — comprehensive coverage',
        sections: [
          { title: 'Who', prompt: 'Who is involved? Who is affected? Who is responsible?', hint: 'People make stories real' },
          { title: 'What', prompt: 'What happened? What is the core event or trend?', hint: 'Facts first' },
          { title: 'When', prompt: 'When did this happen? What is the timeline?', hint: 'Sequence and timing matter' },
          { title: 'Where', prompt: 'Where is this happening? Geographic or market context?', hint: 'Location shapes the story' },
          { title: 'Why', prompt: 'Why is this happening? Root causes and motivations?', hint: 'The hardest and most important question' },
          { title: 'How', prompt: 'How did this come about? How does it work?', hint: 'Mechanism and process' },
        ],
      },
      {
        id: 'nut-graf',
        name: 'Nut Graf',
        description: 'Open with a scene, then deliver the thesis paragraph',
        sections: [
          { title: 'The Scene', prompt: 'Open with a vivid, specific scene or anecdote', hint: 'Show, do not tell' },
          { title: 'The Nut Graf', prompt: 'Now explain why this scene matters. What is the bigger story?', hint: 'This is the thesis — the paragraph that tells the reader what the story is really about' },
          { title: 'The Evidence', prompt: 'Support the thesis with reporting — quotes, data, examples', hint: 'Build the case' },
          { title: 'The Kicker', prompt: 'End with a memorable scene, quote, or thought', hint: 'Circle back to the opening or surprise them' },
        ],
      },
      {
        id: 'data-story',
        name: 'Data Story',
        description: 'Let numbers tell a narrative',
        sections: [
          { title: 'The Headline Number', prompt: 'What is the single most striking statistic?', hint: 'Lead with surprise' },
          { title: 'The Context', prompt: 'Why is this number surprising?', hint: 'Benchmarks, comparisons, history' },
          { title: 'The Trend', prompt: 'What pattern do you see?', hint: 'Show the trajectory' },
          { title: 'The Human Impact', prompt: 'What does this mean for real people?', hint: 'Translate data into lived experience' },
          { title: 'The Takeaway', prompt: 'What should the reader do with this?', hint: 'Practical or strategic implication' },
        ],
      },
    ],
  },

  /* ═══════════════════════════════════════
     EDUCATION
     ═══════════════════════════════════════ */
  {
    id: 'education',
    name: 'Education',
    description: 'Teaching, explaining, and guiding your audience',
    icon: '🎓',
    frameworks: [
      {
        id: 'how-to-guide',
        name: 'How-To Guide',
        description: 'Step-by-step instructions that solve a specific problem',
        sections: [
          { title: 'The Problem', prompt: 'What specific problem does your reader have?', hint: '"How to X" not "about X"' },
          { title: 'Why It Is Hard', prompt: 'What makes this tricky? What do most people get wrong?', hint: 'Show empathy and expertise' },
          { title: 'Prerequisites', prompt: 'What tools or knowledge are needed?', hint: 'Set expectations' },
          { title: 'Step 1', prompt: 'First thing to do', hint: 'Start with the easiest win' },
          { title: 'Step 2', prompt: 'Next step', hint: 'Build momentum' },
          { title: 'Step 3', prompt: 'Final step', hint: 'End with the result' },
          { title: 'Common Mistakes', prompt: 'What pitfalls should they avoid?', hint: 'Save them time' },
        ],
      },
      {
        id: 'listicle',
        name: 'Listicle',
        description: 'Numbered items — scannable and shareable',
        sections: [
          { title: 'The Hook', prompt: 'Why read this list? What will they gain?', hint: '1-2 sentences' },
          { title: 'Item 1', prompt: 'Strongest or most surprising point', hint: 'Lead with your best' },
          { title: 'Item 2', prompt: 'Second point', hint: 'Self-contained' },
          { title: 'Item 3', prompt: 'Third point', hint: 'Vary length and depth' },
          { title: 'Item 4', prompt: 'Fourth point', hint: 'Add a story or example' },
          { title: 'Item 5', prompt: 'Fifth point', hint: 'Save something good for last' },
          { title: 'The Wrap', prompt: 'What ties these together?', hint: 'Meta-lesson' },
        ],
      },
      {
        id: 'problem-solution',
        name: 'Problem → Solution',
        description: 'Agitate a pain point then deliver the fix',
        sections: [
          { title: 'The Problem', prompt: 'What keeps your reader up at night?', hint: 'Vivid and specific' },
          { title: 'Agitate', prompt: 'What gets worse if they ignore it?', hint: 'Raise stakes' },
          { title: 'The Solution', prompt: 'Present your approach', hint: 'Clear and confident' },
          { title: 'Proof', prompt: 'Results, testimonials, data', hint: 'Evidence builds trust' },
          { title: 'Next Steps', prompt: 'What should they do now?', hint: 'One clear CTA' },
        ],
      },
      {
        id: 'comparison',
        name: 'Comparison / Versus',
        description: 'Compare two approaches, tools, or ideas side by side',
        sections: [
          { title: 'The Question', prompt: 'What are people trying to decide between?', hint: 'Frame the decision' },
          { title: 'Option A', prompt: 'Describe the first option — strengths and weaknesses', hint: 'Be fair' },
          { title: 'Option B', prompt: 'Describe the second option — strengths and weaknesses', hint: 'Equally fair' },
          { title: 'Key Differences', prompt: 'What actually matters when choosing?', hint: 'Focus on decision criteria' },
          { title: 'Your Recommendation', prompt: 'When would you choose each? Who is each best for?', hint: 'Context-dependent advice' },
        ],
      },
      {
        id: 'faq',
        name: 'FAQ / Q&A',
        description: 'Answer the questions your audience is actually asking',
        sections: [
          { title: 'Introduction', prompt: 'What topic are you covering? Why these questions?', hint: 'Brief context' },
          { title: 'Question 1', prompt: 'The most common question', hint: 'Answer directly then elaborate' },
          { title: 'Question 2', prompt: 'The most important question', hint: 'This might not be the most asked, but it matters most' },
          { title: 'Question 3', prompt: 'The most misunderstood question', hint: 'Correct common misconceptions' },
          { title: 'Question 4', prompt: 'The question nobody asks but should', hint: 'Show deeper expertise' },
          { title: 'Summary', prompt: 'Key takeaways', hint: 'Distil the answers' },
        ],
      },
    ],
  },

  /* ═══════════════════════════════════════
     THOUGHT LEADERSHIP
     ═══════════════════════════════════════ */
  {
    id: 'thought-leadership',
    name: 'Thought Leadership',
    description: 'Building authority, sharing frameworks, making predictions',
    icon: '💡',
    frameworks: [
      {
        id: 'framework-builder',
        name: 'Framework Builder',
        description: 'Create a named mental model others can use',
        sections: [
          { title: 'The Problem Space', prompt: 'What complex problem lacks structure?', hint: 'Something people face repeatedly' },
          { title: 'The Framework Name', prompt: 'What do you call your approach?', hint: 'Acronym, metaphor, or numbered steps' },
          { title: 'Element 1', prompt: 'First component — what and why', hint: 'Brief example' },
          { title: 'Element 2', prompt: 'Second component', hint: 'How it connects to the first' },
          { title: 'Element 3', prompt: 'Third component', hint: 'Complete the picture' },
          { title: 'Application', prompt: 'Real example of using the full framework', hint: 'Make it concrete and replicable' },
        ],
      },
      {
        id: 'first-principles',
        name: 'First Principles Breakdown',
        description: 'Strip away assumptions to reveal the fundamental truth',
        sections: [
          { title: 'The Accepted Wisdom', prompt: 'What does everyone take for granted in this space?', hint: 'The unquestioned assumption' },
          { title: 'Decompose', prompt: 'Break it down to its fundamental components. What is actually true?', hint: 'Remove all assumptions' },
          { title: 'Rebuild', prompt: 'From these fundamentals, what should we actually be doing?', hint: 'Often very different from the accepted wisdom' },
          { title: 'Implications', prompt: 'What changes if we adopt this first-principles view?', hint: 'Practical consequences' },
        ],
      },
      {
        id: 'prediction',
        name: 'Prediction / Trend Analysis',
        description: 'Spot a pattern and explain where it leads',
        sections: [
          { title: 'The Signal', prompt: 'What specific thing have you noticed that most people have not?', hint: 'A data point, behaviour change, or event' },
          { title: 'The Pattern', prompt: 'Connect it to other signals. What pattern is forming?', hint: 'At least 3 data points make a trend' },
          { title: 'The Prediction', prompt: 'Where does this pattern lead? What will happen next?', hint: 'Be specific and time-bound if possible' },
          { title: 'The Evidence', prompt: 'Why should anyone believe this prediction?', hint: 'Track record, analogies, structural reasons' },
          { title: 'How to Prepare', prompt: 'What should the reader do if this prediction is right?', hint: 'Actionable regardless of certainty' },
        ],
      },
      {
        id: 'manifesto',
        name: 'Manifesto',
        description: 'Declare what you believe and why it matters',
        sections: [
          { title: 'The World As It Is', prompt: 'What is wrong with the current state of things?', hint: 'Be specific about the dysfunction' },
          { title: 'The World As It Should Be', prompt: 'What does the better future look like?', hint: 'Paint the vision' },
          { title: 'What We Believe', prompt: 'State your principles. What do you stand for?', hint: '3-5 clear beliefs' },
          { title: 'What We Reject', prompt: 'What practices or beliefs do you explicitly reject?', hint: 'Drawing lines creates clarity' },
          { title: 'The Call', prompt: 'What should people who agree with you do?', hint: 'Join, build, change, start' },
        ],
      },
    ],
  },

  /* ═══════════════════════════════════════
     CREATIVE / PERSONAL BRAND
     ═══════════════════════════════════════ */
  {
    id: 'creative',
    name: 'Creative',
    description: 'Personal brand, behind-the-scenes, reflections',
    icon: '🎬',
    frameworks: [
      {
        id: 'behind-the-scenes',
        name: 'Behind the Scenes',
        description: 'Pull back the curtain on how you work',
        sections: [
          { title: 'What You Made', prompt: 'Show or describe the finished output', hint: 'Start with the result' },
          { title: 'The Messy Middle', prompt: 'What did the process actually look like?', hint: 'Authenticity lives in the mess' },
          { title: 'Key Decisions', prompt: 'What choices did you face?', hint: '2-3 decision points' },
          { title: 'What You Learned', prompt: 'What would you do differently?', hint: 'Honest reflection' },
          { title: 'Your Advice', prompt: 'What should someone else know?', hint: 'Practical wisdom' },
        ],
      },
      {
        id: 'lessons-learned',
        name: 'Lessons Learned',
        description: 'Distil experience into teachable moments',
        sections: [
          { title: 'The Experience', prompt: 'What did you go through?', hint: 'Enough context for the lessons' },
          { title: 'Lesson 1', prompt: 'Biggest insight', hint: 'The one that changed behaviour' },
          { title: 'Lesson 2', prompt: 'Most counterintuitive thing', hint: 'The surprise' },
          { title: 'Lesson 3', prompt: 'What you wish you knew earlier', hint: 'The time saver' },
          { title: 'The Bigger Picture', prompt: 'How do these connect? What is the principle?', hint: 'Zoom out' },
        ],
      },
      {
        id: 'open-letter',
        name: 'Open Letter',
        description: 'Write directly to a specific person or group',
        sections: [
          { title: 'Dear...', prompt: 'Who are you writing to? Why publicly?', hint: 'Make the audience clear' },
          { title: 'What I Want You to Know', prompt: 'The core message you need them to hear', hint: 'Be direct and honest' },
          { title: 'The Story Behind This', prompt: 'What experience or observation prompted this letter?', hint: 'Personal context' },
          { title: 'What I Am Asking', prompt: 'What do you want them to do, change, or understand?', hint: 'Be specific' },
          { title: 'With respect,', prompt: 'Close with your stance — firm but fair', hint: 'Leave the door open or close it, your choice' },
        ],
      },
      {
        id: 'confession',
        name: 'Confession',
        description: 'Admit something publicly — vulnerability builds connection',
        sections: [
          { title: 'The Admission', prompt: 'What are you admitting? Say it plainly.', hint: 'No preamble. Just say it.' },
          { title: 'Why I Did It', prompt: 'What led to this? What was the reasoning at the time?', hint: 'Context, not excuses' },
          { title: 'What I Got Wrong', prompt: 'With hindsight, what was the mistake?', hint: 'Be specific about the error' },
          { title: 'What Changed', prompt: 'What do you do differently now?', hint: 'Show growth' },
          { title: 'Why I Am Telling You', prompt: 'Why share this now? What is the lesson for others?', hint: 'Make it useful, not self-indulgent' },
        ],
      },
    ],
  },
];
