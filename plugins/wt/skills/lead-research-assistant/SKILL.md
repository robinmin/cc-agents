---
name: lead-research-assistant
description: This skill should be used when the user asks to "find leads", "identify potential customers", "find companies that would benefit from my product", "build a prospect list", "target accounts for sales outreach", or mentions lead generation, prospecting, or business development research. Helps identify high-quality leads by analyzing your business, searching for target companies, and providing actionable contact strategies.
---

# Lead Research Assistant

This skill helps identify and qualify potential leads by analyzing your product/service, understanding your ideal customer profile, and providing actionable outreach strategies.

## When to Use This Skill

- Finding potential customers or clients for your product/service
- Building a list of companies to reach out to for partnerships
- Identifying target accounts for sales outreach
- Researching companies that match your ideal customer profile
- Preparing for business development activities

## What This Skill Does

1. **Understands Your Business**: Analyzes your product/service, value proposition, and target market
2. **Identifies Target Companies**: Finds companies that match your ideal customer profile based on:
   - Industry and sector
   - Company size and location
   - Technology stack and tools they use
   - Growth stage and funding
   - Pain points your product solves
3. **Prioritizes Leads**: Ranks companies based on fit score and relevance
4. **Provides Contact Strategies**: Suggests how to approach each lead with personalized messaging
5. **Enriches Data**: Gathers relevant information about decision-makers and company context

## How to Use

### Basic Usage

Simply describe your product/service and what you're looking for:

```
I'm building [product description]. Find me 10 companies in [location/industry] 
that would be good leads for this.
```

### With Your Codebase

For even better results, run this from your product's source code directory:

```
Look at what I'm building in this repository and identify the top 10 companies 
in [location/industry] that would benefit from this product.
```

### Advanced Usage

For more targeted research:

```
My product: [description]
Ideal customer profile:
- Industry: [industry]
- Company size: [size range]
- Location: [location]
- Current pain points: [pain points]
- Technologies they use: [tech stack]

Find me 20 qualified leads with contact strategies for each.
```

## Instructions

When a user requests lead research:

1. **Understand the Product/Service**
   - If in a code directory, analyze the codebase to understand the product
   - Ask clarifying questions about the value proposition
   - Identify key features and benefits
   - Understand what problems it solves

2. **Define Ideal Customer Profile**
   - Determine target industries and sectors
   - Identify company size ranges
   - Consider geographic preferences
   - Understand relevant pain points
   - Note any technology requirements

3. **Research and Identify Leads**
   - Search for companies matching the criteria
   - Look for signals of need (job postings, tech stack, recent news)
   - Consider growth indicators (funding, expansion, hiring)
   - Identify companies with complementary products/services
   - Check for budget indicators

4. **Prioritize and Score**
   - Create a fit score (1-10) for each lead
   - Consider factors like:
     - Alignment with ICP
     - Signals of immediate need
     - Budget availability
     - Competitive landscape
     - Timing indicators

5. **Provide Actionable Output**
   
   For each lead, provide:
   - **Company Name** and website
   - **Why They're a Good Fit**: Specific reasons based on their business
   - **Priority Score**: 1-10 with explanation
   - **Decision Maker**: Role/title to target (e.g., "VP of Engineering")
   - **Contact Strategy**: Personalized approach suggestions
   - **Value Proposition**: How your product solves their specific problem
   - **Conversation Starters**: Specific points to mention in outreach
   - **LinkedIn URL**: If available, for easy connection

6. **Format the Output**

   Present results in a clear, scannable format:

   ```markdown
   # Lead Research Results
   
   ## Summary
   - Total leads found: [X]
   - High priority (8-10): [X]
   - Medium priority (5-7): [X]
   - Average fit score: [X]
   
   ---
   
   ## Lead 1: [Company Name]
   
   **Website**: [URL]
   **Priority Score**: [X/10]
   **Industry**: [Industry]
   **Size**: [Employee count/revenue range]
   
   **Why They're a Good Fit**:
   [2-3 specific reasons based on their business]
   
   **Target Decision Maker**: [Role/Title]
   **LinkedIn**: [URL if available]
   
   **Value Proposition for Them**:
   [Specific benefit for this company]
   
   **Outreach Strategy**:
   [Personalized approach - mention specific pain points, recent company news, or relevant context]
   
   **Conversation Starters**:
   - [Specific point 1]
   - [Specific point 2]
   
   ---
   
   [Repeat for each lead]
   ```

7. **Offer Next Steps**
   - Suggest saving results to a CSV for CRM import
   - Offer to draft personalized outreach messages
   - Recommend prioritization based on timing
   - Suggest follow-up research for top leads

## Examples

### Example 1: AI Data Security Tool

**User**: "I'm building a tool that masks sensitive data in AI coding assistant queries. Find potential leads."

**Output Sample**:
```markdown
## Lead 3: Stripe

**Website**: https://stripe.com
**Priority Score**: 9/10
**Industry**: Fintech / Payments
**Size**: 8,000+ employees

**Why They're a Good Fit**:
- Heavy usage of AI coding assistants (evident in engineering blog posts)
- Handles highly sensitive payment data (PCI compliance critical)
- Recent GitHub activity shows Cursor/Copilot integration work
- Security is core to their brand identity

**Target Decision Maker**: VP of Engineering or Head of Developer Platform
**LinkedIn**: https://linkedin.com/company/stripe

**Value Proposition for Them**:
Enable Stripe engineers to use AI coding assistants without risking data exposure
or PCI violations. Your tool integrates seamlessly with existing workflows.

**Outreach Strategy**:
Reference Stripe's recent "Engineering at Stripe" blog post about AI tool adoption.
Highlight how your solution addresses the specific data masking challenge they
mentioned in their Q3 engineering update.

**Conversation Starters**:
- "Saw your post about AI coding adoption - how are you handling data masking?"
- "Stripe's approach to developer security is impressive - we can help extend that to AI workflows"
```

### Example 2: Remote Work Consulting

**User**: "I run a consulting practice for remote team productivity. Find me 10 companies in the Bay Area that recently went remote."

**Output Sample**:
```markdown
## Lead 1: Discord (Remote-First Transition)

**Website**: https://discord.com
**Priority Score**: 8/10
**Industry**: Social Technology / Communication
**Size**: 600+ employees

**Why They're a Good Fit**:
- Announced remote-first policy in March 2024 (company blog)
- Scaling distributed teams across 3 time zones
- Recent job postings emphasize "remote collaboration excellence"
- Engineering leadership publicly discussed remote onboarding challenges

**Target Decision Maker**: Head of People Operations or VP of Engineering
**LinkedIn**: https://linkedin.com/company/discord

**Value Proposition for Them**:
Proven frameworks for scaling remote productivity, specifically for companies
transitioning from hybrid to fully distributed models.

**Outreach Strategy**:
Lead with insights from their CEO's recent interview about "lessons learned
going remote-first." Offer specific workshop on async documentation practices.

**Conversation Starters**:
- "Congrats on the remote-first transition - what's been your biggest challenge?"
- "Saw your CEO's interview about distributed teams - we help with the async communication gap"
```

## Tips for Best Results

- **Be specific** about your product and its unique value
- **Run from your codebase** if applicable for automatic context
- **Provide context** about your ideal customer profile
- **Specify constraints** like industry, location, or company size
- **Request follow-up** research on promising leads for deeper insights

## Related Use Cases

- Drafting personalized outreach emails after identifying leads
- Building a CRM-ready CSV of qualified prospects
- Researching specific companies in detail
- Analyzing competitor customer bases
- Identifying partnership opportunities

## Additional Resources

### Detailed Methodology
- **`references/research-methodology.md`** - Comprehensive guide on lead research strategies, data sources, scoring frameworks, industry-specific approaches, and quality validation. Use this for advanced research patterns and detailed guidance on scoring and personalization.
