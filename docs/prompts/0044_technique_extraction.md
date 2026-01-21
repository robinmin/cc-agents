---
name: Phase 2 - Technique Extraction & Integration
status: WIP
date: 2026-01-20
---

# Phase 2: Technique Extraction & Integration

## Extracted Prompt-Based Techniques (De-duplicated)

### Category: DETECTION

#### 1. Chain-of-Verification (CoVe)
**Source**: [CoVe Paper](https://arxiv.org/abs/2309.11495) (Meta AI, 727+ citations)
**Technique**: Self-verification prompting pattern
```
1. Draft initial response
2. Plan verification questions: "What facts need verification?"
3. Execute verification: For each fact, independently verify
4. Generate final answer: Revise based on verification results
```
**Prompt Template**:
```
Please answer the following question. Then:
1. List the key factual claims in your answer
2. For each claim, verify it independently
3. Revise your answer if any claims are unverified

Question: {query}
```

#### 2. Uncertainty Expression
**Source**: [UQLM](https://arxiv.org/abs/2403.04696) (115+ citations), [Nature 2024](https://www.nature.com/articles/s41598-024-66708-4)
**Technique**: Ask model to express confidence/uncertainty
```
Prompt: "Answer with your confidence level (High/Medium/Low) for each claim."
```
**Detection**: Low confidence or "I don't know" responses indicate potential hallucination

#### 3. Self-Consistency Check
**Source**: [ANAH-v2](https://arxiv.org/abs/2407.04693) (21+ citations), [Nature 2024](https://www.nature.com/articles/s41586-024-07421-0)
**Technique**: Generate multiple answers, check consistency
```
Prompt: "Generate 3 different answers to this question. Then identify which claims appear consistently across all answers."
```
**Detection**: Inconsistent claims across variations indicate potential hallucination

#### 4. Fact Extraction + Verification
**Source**: [HaluEval 2.0](https://arxiv.org/pdf/2401.03205) (226+ citations)
**Technique**: Extract facts, then verify independently
```
Prompt: "Extract all factual claims from the following text. Then, for each claim, assess its verifiability and provide sources."
```

#### 5. Counterfactual Probing
**Source**: [Counterfactual Probing](https://arxiv.org/abs/2508.01862)
**Technique**: Test model's response to perturbed statements
```
Prompt: "Consider the opposite of this claim. How would you justify it? If you cannot, the original claim may be hallucinated."
```
**Detection**: Model can hallucinate counterfactuals if original is hallucinated

#### 6. Entropy-Based Detection
**Source**: [Nature 2024](https://www.nature.com/articles/s41586-024-07421-0) (1,017+ citations)
**Technique**: Monitor token-level probability distributions
**Simple Script**: Check if tokens have low probability (high entropy)
```python
# Simple entropy check (conceptual)
def detect_hallucination(logits, threshold=2.5):
    entropy = -sum(p * log(p) for p in probs)
    return entropy > threshold  # High entropy = potential hallucination
```

---

### Category: MITIGATION

#### 7. Retrieval-Augmented Generation (RAG)
**Sources**: [AWS Bedrock](https://aws.amazon.com/blogs/machine-learning/reducing-hallucinations-in-large-language-models-with-custom-intervention-using-amazon-bedrock-agents/), [Voiceflow](https://www.voiceflow.com/blog/prevent-llm-hallucinations), [Lakera.ai](https://www.lakera.ai/blog/guide-to-hallucinations-in-large-language-models), [Tonmoy et al 2024](https://arxiv.org/abs/2401.01313) (650+ citations)
**Technique**: Provide relevant context before asking question
```
Prompt: "Use the following reference material to answer the question. If the answer is not in the reference, say 'I don't know from the provided context.'

Reference: {retrieved_docs}
Question: {query}"
```

#### 8. Chain-of-Thought with Verification
**Source**: [CoVe](https://arxiv.org/abs/2309.11495)
**Technique**: Combine reasoning with verification steps
```
Prompt: "Think step-by-step to answer this question. After each step, verify the factual basis of that step."
```

#### 9. Few-Shot with Verification Examples
**Source**: [HaluEval 2.0](https://arxiv.org/pdf/2401.03205)
**Technique**: Show examples of verified vs. unverified claims
```
Prompt: "Here are examples of verified and unverified claims:
- VERIFIED: 'Paris is the capital of France' (verified by multiple sources)
- UNVERIFIED: 'Paris has a population of exactly 2,161,839' (specific number needs verification)

Now answer: {query}"
```

#### 10. Uncertainty Acknowledgment
**Source**: [UQLM](https://arxiv.org/abs/2403.04696), [Gumaan 2025](https://arxiv.org/abs/2507.22915)
**Technique**: Explicitly prompt model to admit uncertainty
```
Prompt: "If you are uncertain about any part of the answer, explicitly state 'I am not certain about this' and explain why."
```

#### 11. Guardrails / Constraints
**Source**: [AWS Bedrock](https://aws.amazon.com/blogs/machine-learning/reducing-hallucinations-in-large-language-models-with-custom-intervention-using-amazon-bedrock-agents/), [Voiceflow](https://www.voiceflow.com/blog/prevent-llm-hallucinations)
**Technique**: Set boundaries on acceptable responses
```
Prompt: "Answer only using information from the provided context. Do not speculate or add information not in the source."
```

#### 12. Human-in-the-Loop Verification
**Source**: [AWS Bedrock](https://aws.amazon.com/blogs/machine-learning/reducing-hallucinations-in-large-language-models-with-custom-intervention-using-amazon-bedrock-agents/)
**Technique**: Flag high-risk claims for human review
```python
# Simple flagging script (conceptual)
def flag_for_human_review(response, confidence_threshold=0.7):
    if calculate_confidence(response) < confidence_threshold:
        return "FLAG_FOR_REVIEW"
    return response
```

#### 13. Contextual Grounding Check
**Source**: [AWS Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-contextual-grounding-check.html)
**Technique**: Verify answer is grounded in provided context
```
Prompt: "Answer the question using ONLY the following context. For each sentence in your answer, cite which part of the context supports it."
```

#### 14. Temperature Reduction
**Source**: [Lakera.ai](https://www.lakera.ai/blog/guide-to-hallucinations-in-large-language-models), [Voiceflow](https://www.voiceflow.com/blog/prevent-llm-hallucinations)
**Technique**: Use lower temperature for more deterministic outputs
**Simple Setting**: Set temperature=0 or temperature=0.1 for factual queries

---

### Category: WORKFLOW PROTOCOLS

#### 15. Verify-Before-Generate Protocol
**Sources**: [CoVe](https://arxiv.org/abs/2309.11495), [Comprehensive Survey 2025](https://arxiv.org/abs/2510.06265)
**Workflow**:
```
1. User submits query
2. System retrieves relevant context (RAG)
3. Model generates initial draft
4. Model extracts factual claims from draft
5. Model verifies each claim against context
6. Model revises answer removing unverified claims
7. System outputs final verified answer
```

#### 16. Multi-Agent Verification
**Source**: [AWS Bedrock Agents](https://aws.amazon.com/blogs/machine-learning/reducing-hallucinations-in-large-language-models-with-custom-intervention-using-amazon-bedrock-agents/)
**Workflow**:
```
Agent 1: Generate answer
Agent 2: Extract factual claims
Agent 3: Verify each claim (with search/RAG)
Agent 4: Judge overall veracity
Agent 5: Intervene if hallucination detected (request revision or flag for human)
```

#### 17. Preemptive Detection (FactCheckMate-style)
**Source**: [FactCheckMate](https://arxiv.org/abs/2410.02899)
**Workflow**:
```
1. Before final answer, check internal model state
2. If hidden state indicates likely hallucination:
   a. Request additional context
   b. Simplify the query
   c. Flag for human review
```

#### 18. Iterative Refinement
**Source**: [ANAH-v2](https://arxiv.org/abs/2407.04693)
**Workflow**:
```
1. Generate initial answer
2. Self-criticize: "What might be wrong with this answer?"
3. Generate critique
4. Refine answer based on critique
5. Repeat 2-3 times
```

#### 19. Uncertainty Quantification Protocol
**Source**: [UQLM](https://arxiv.org/abs/2403.04696), [Theoretical Foundations](https://arxiv.org/abs/2507.22915)
**Workflow**:
```
1. Generate answer
2. Calculate confidence for each claim
3. Flag low-confidence claims
4. Either:
   a. Remove low-confidence claims
   b. Add disclaimer "This claim is uncertain"
   c. Request additional verification
```

#### 20. Reference Source Attribution
**Sources**: [Voiceflow](https://www.voiceflow.com/blog/prevent-llm-hallucinations), [Lakera.ai](https://www.lakera.ai/blog/guide-to-hallucinations-in-large-language-models)
**Workflow**:
```
Prompt: "For each factual claim in your answer, provide the source or reference that supports it."
```
**Detection**: Claims without sources are flagged as potential hallucinations

---

## De-duplicated Technique Summary (Prompt-Based + Simple Scripts)

| # | Technique | Category | Primary Source(s) | Citation Count |
|---|-----------|----------|-------------------|----------------|
| 1 | Chain-of-Verification (CoVe) | Detection+Workflow | Dhuliawala et al 2023 | 727+ |
| 2 | Uncertainty Expression | Detection | UQLM, Nature 2024 | 115+ / 1017+ |
| 3 | Self-Consistency Check | Detection | ANAH-v2, Nature 2024 | 21+ / 1017+ |
| 4 | Fact Extraction + Verification | Detection | HaluEval 2.0 | 226+ |
| 5 | Counterfactual Probing | Detection | Feng et al 2025 | 3+ |
| 6 | Entropy-Based Detection | Detection | Nature 2024 | 1017+ |
| 7 | RAG (Retrieval-Augmented Generation) | Mitigation | AWS, Voiceflow, Lakera, Tonmoy | 650+ |
| 8 | Chain-of-Thought with Verification | Mitigation | CoVe | 727+ |
| 9 | Few-Shot with Verification Examples | Mitigation | HaluEval 2.0 | 226+ |
| 10 | Uncertainty Acknowledgment | Mitigation | UQLM, Gumaan | 115+ |
| 11 | Guardrails/Constraints | Mitigation | AWS, Voiceflow | - |
| 12 | Human-in-the-Loop | Mitigation | AWS Bedrock | - |
| 13 | Contextual Grounding Check | Mitigation | AWS Bedrock | - |
| 14 | Temperature Reduction | Mitigation | Lakera, Voiceflow | - |
| 15 | Verify-Before-Generate Protocol | Workflow | CoVe, Alansari 2025 | 727+ |
| 16 | Multi-Agent Verification | Workflow | AWS Bedrock Agents | - |
| 17 | Preemptive Detection | Workflow | FactCheckMate | 8+ |
| 18 | Iterative Refinement | Workflow | ANAH-v2 | 21+ |
| 19 | Uncertainty Quantification Protocol | Workflow | UQLM, Gumaan | 115+ |
| 20 | Reference Source Attribution | Workflow | Voiceflow, Lakera | - |

## Technique Count by Category

- **Detection**: 6 techniques
- **Mitigation**: 8 techniques
- **Workflow**: 6 techniques
- **Total**: 20 techniques (all de-duplicated)

## Focus: Prompt-Based + Simple Scripts

All 20 techniques are implementable with:
- **Prompt engineering** (15 techniques)
- **Simple Python scripts** (3 techniques: #6, #12, #19)
- **Configuration settings** (2 techniques: #14, combinations)

**Excluded from integration**: Model retraining, complex fine-tuning, architectural changes

## Next Phase

Proceeding to **Phase 3: Merge into SKILL.md**
