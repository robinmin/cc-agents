# Platform Adaptation Guide

## Platform Specifications

| Platform     | Max Length      | Tone          | Format                    |
|--------------|-----------------|---------------|---------------------------|
| twitter      | 280 chars/tweet | Conversational | Thread (5-10 tweets)      |
| linkedin     | 3,000 chars     | Professional  | Single post with bullets  |
| devto        | No limit        | Technical     | Article with code blocks  |
| medium       | No limit        | Narrative     | Article with headers      |

## Twitter Thread Strategy

1. Extract 5-10 key points from article
2. Each tweet: Hook + Key Point + Brief Example
3. Thread starter: Engaging hook (question/statistic)
4. Number tweets (1/X, 2/X, etc.)
5. Add hashtags at end (2-3 relevant tags)
6. Include link to full article

## LinkedIn Post Strategy

1. Professional hook (first 2-3 lines critical)
2. Key insights in bullet points
3. Personal experience angle
4. Clear call-to-action
5. 3-5 relevant hashtags

## Dev.to Article Strategy

1. Preserve code blocks with syntax highlighting
2. Add Dev.to frontmatter:
```yaml
---
title: "[Title]"
tags: [tag1, tag2, tag3]
published: true
---
```
3. Include tags for discoverability
4. Add canonical URL if cross-posted

## Medium Article Strategy

1. Preserve narrative flow
2. Add section headers for readability
3. Support bold/italic emphasis
4. Include inline links naturally
