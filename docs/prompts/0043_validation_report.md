---
name: Source Validation Report - Anti-Hallucination Research
status: Done
date: 2026-01-20
---

# Phase 1 Validation Report: 16 Anti-Hallucination Sources

## Summary

**Total Sources Validated**: 16
**Verify-Success**: 16
**Verify-Failed**: 0
**Can-Not-Verify**: 0

All sources have been successfully validated and are ready for integration.

---

## Core Papers (1-5)

### 1. Chain-of-Verification (CoVe) [verify-success]

**URL**: https://arxiv.org/abs/2309.11495
**Authors**: Shehzaad Dhuliawala et al. (Meta AI)
**Citations**: 727+
**Key Findings**:
- Self-verification approach with 4-step process:
  1. Draft Initial Response
  2. Plan Verification Questions
  3. Execute Verification (independent fact checks)
  4. Generate Final Answer (based on verification)
- Significant decrease in hallucinations across Wikidata, MultiSpanQA, long-form generation

**Sources**:
- [ACL Anthology](https://aclanthology.org/2024.findings-acl.212/)
- [arXiv](https://arxiv.org/abs/2309.11495)
- [OpenReview](https://openreview.net/forum?id=ek3GqAs2uO&referrer=%255Bthe%2520profile%2520of%2520Shehzaad%2520Dhuliawala%255D(%252Fprofile%253Fid%253D~Shehzaad_Dhuliawala1)
- [LearnPrompting Guide](https://learnprompting.org/docs/advanced/self_criticism/chain_of_verification?srsltid=AfmBOooPh34B5M4MGmwQHWWRXxf8H3BMhb9wS3IoAJL4Ul8KP9U8KweO)

---

### 2. HaluEval 2.0 [verify-success]

**URL**: https://arxiv.org/pdf/2401.03205
**Published**: January 6, 2024
**Citations**: 226+
**Key Findings**:
- 8,770 questions that LLMs are prone to hallucinate on
- GPT-4-based hallucination detection framework
- Fact extraction + independent fact verification
- Improved from original HaluEval (2023, 747 citations)

**Sources**:
- [arXiv Paper](https://arxiv.org/pdf/2401.03205)
- [ACM Survey 2025](https://dl.acm.org/doi/10.1145/3703155)
- [Original HaluEval](https://arxiv.org/abs/2305.11747) (EMNLP 2023)

---

### 3. Counterfactual Probing [verify-success]

**URL**: https://arxiv.org/abs/2508.01862
**Authors**: Y. Feng et al.
**Published**: August 2025 (based on late-2024 research)
**Citations**: 3+
**Key Findings**:
- Four-component framework:
  1. Statement Extraction (parse responses into factual statements)
  2. Counterfactual Probe Generation (perturbed statement versions)
  3. Sensitivity Analysis (measure model response to perturbations)
  4. Adaptive Mitigation (reduce hallucinations based on probe results)
- Tests model's sensitivity to counterfactual variations to identify hallucinations

**Sources**:
- [arXiv](https://arxiv.org/abs/2508.01862)
- [Semantic Scholar](https://www.semanticscholar.org/paper/14cc76ae5c58326eec4927c70e8d93eca1c0aded)
- [ResearchGate](https://www.researchgate.net/publication/394293845)

---

### 4. FactCheckMate [verify-success]

**URL**: https://arxiv.org/abs/2410.02899
**Authors**: D. Alnuhait et al.
**Published**: October 2024
**Citations**: 8+
**Key Findings**:
- **Preemptive** hallucination detection (before hallucination occurs)
- Classifies hidden states before text decoding
- Provides early warning several tokens before hallucinations manifest
- EMNLP 2025 Findings accepted

**Sources**:
- [arXiv](https://arxiv.org/abs/2410.02899)
- [GitHub](https://github.com/deema-A/FactCheckmate)
- [OpenReview](https://openreview.net/pdf?id=4ExwvWAy9b)

---

### 5. UQLM [verify-success]

**URLs**:
- Paper: https://arxiv.org/abs/2403.04696
- GitHub: https://github.com/cvs-health/uqlm
**Published**: March 2024
**Citations**: 115+ (Nature 2024: 37 citations)
**Key Findings**:
- Token-level uncertainty quantification for hallucination detection
- Novel fact-checking pipeline based on token-level uncertainty
- Python library for LLM hallucination detection
- LLM hallucination-aware dynamic modeling using agent-based probability distributions

**Sources**:
- [arXiv Paper](https://arxiv.org/abs/2403.04696)
- [Nature Article](https://www.nature.com/articles/s41598-024-66708-4)
- [GitHub](https://github.com/cvs-health/uqlm)
- [MBZUAI News](https://mbzuai.ac.ae/news/a-new-approach-to-identify-llm-hallucinations-uncertainty-quantification-presented-at-acl/)

---

## Surveys (6-8)

### 6. Comprehensive Survey 2025 [verify-success]

**URL**: https://arxiv.org/abs/2510.06265
**Authors**: Aisha Alansari, H. Luqman
**Published**: October 2025
**Citations**: 7+
**Key Findings**:
- Comprehensive review of LLM hallucination research
- Three main areas: Causes, Detection, Mitigation
- Recent 2025 publication addressing critical LLM deployment challenges

**Sources**:
- [arXiv](https://arxiv.org/abs/2510.06265)
- [arXiv HTML](https://arxiv.org/html/2510.06265v2)
- [ResearchGate](https://www.researchgate.net/publication/396329987)

---

### 7. Comprehensive Survey 2024 [verify-success]

**URL**: https://arxiv.org/abs/2401.01313
**Authors**: SM Tonmoy et al.
**Published**: January 2024
**Citations**: 650+
**Key Findings**:
- Survey of **32+ techniques** for mitigating hallucination in LLMs
- Detailed taxonomy of mitigation approaches
- Comprehensive categorization framework

**Sources**:
- [arXiv](https://arxiv.org/abs/2401.01313)
- [PDF](https://arxiv.org/pdf/2401.01313)
- [ResearchGate](https://www.researchgate.net/publication/377081841_A_Comprehensive_Survey_of_Hallucination_Mitigation_Techniques_in_Large_Language_Models)

---

### 8. Theoretical Foundations [verify-success]

**URL**: https://arxiv.org/abs/2507.22915
**Author**: Esmail Gumaan
**Published**: July 20, 2025
**Key Findings**:
- Rigorous theoretical treatment of hallucination in LLMs
- Formal definitions and theoretical analyses
- Distinction between **intrinsic and extrinsic hallucinations**
- Unified detection and mitigation framework
- Framework to **quantify hallucination** in LLMs

**Sources**:
- [arXiv](https://arxiv.org/abs/2507.22915)
- [Semantic Scholar](https://www.semanticscholar.org/paper/9b7260eee7975e8f58681ab8d60cd1b58603e437)
- [ResearchGate](https://www.researchgate.net/publication/394175066)

---

## Benchmarks (9-10)

### 9. ANAH-v2 [verify-success]

**URL**: https://arxiv.org/abs/2407.04693
**Authors**: Yuzhe Gu et al.
**Citations**: 21+
**Key Findings**:
- Stands for "Scaling Analytical Hallucination Annotation of LLMs"
- Multi-iteration framework that simultaneously:
  - Enhances size of hallucination annotation datasets
  - Improves annotator model through iterative self-training
- **First to outperform GPT-4** in hallucination detection benchmarks
- Achieves this with only 7B parameters

**Sources**:
- [arXiv](https://arxiv.org/abs/2407.04693)
- [GitHub](https://github.com/open-compass/ANAH)
- [ACL 2024](https://aclanthology.org/2024.acl-long.749/)

---

### 10. MedHallu [verify-success]

**Note**: Correct name is **MedHallu** (not "MedHalu")

**URL**: https://arxiv.org/abs/2502.14302
**Authors**: UT Austin AI Health Team
**Citations**: 22+
**Key Findings**:
- First comprehensive benchmark for medical hallucination detection
- 1,000 manually curated entries
- Bidirectional entailment clustering to reveal semantic closeness
- Evaluates LLM reliability in medical Q&A scenarios

**Sources**:
- [arXiv](https://arxiv.org/abs/2502.14302)
- Related: **Med-HALT** (reasoning/memory-based tests)
- Related: **Med-HallMark** (multimodal hallucination, 64 citations)

---

## Web Guides (11-14)

### 11. Lakera.ai Guide [verify-success]

**URL**: https://www.lakera.ai/blog/guide-to-hallucinations-in-large-language-models
**Published**: October 3, 2025
**Key Findings**:
- Comprehensive guide to LLM hallucinations in 2025
- Defines hallucination as output that looks plausible but is factually wrong
- Practical mitigation strategies

**Sources**:
- [Main Guide](https://www.lakera.ai/blog/guide-to-hallucinations-in-large-language-models)
- [ML Glossary](https://www.lakera.ai/ml-glossary/llm-hallucinations)

---

### 12. RootSignals [verify-success]

**URL**: https://rootsignals.ai/post/why-do-llms-still-hallucinate-in-2025/
**Author**: Alex Korolev (ML Research Engineer)
**Published**: June 17, 2025
**Key Findings**:
- **Notable finding**: Newer AI models experiencing MORE hallucinations, not fewer
- Root Judge: Open-source LLM for AI evaluation
- Uses LUMI supercomputing resources
- SOC 2 Type II compliant

**Sources**:
- [Blog Post](https://rootsignals.ai/post/why-do-llms-still-hallucinate-in-2025/)
- Company: Finnish AI startup, $2.8M funding (Sept 2024)

---

### 13. Voiceflow [verify-success]

**URL**: https://www.voiceflow.com/blog/prevent-llm-hallucinations
**Published**: October 28, 2025
**Key Findings**:
- 5 Proven Strategies to reduce AI hallucinations
- Focus on RAG, human feedback, and guardrails
- Framework built in Voiceflow to reduce LLM hallucinations
- Key approach: "Augment utterance to be RAG optimized"

**Sources**:
- [Blog Post](https://www.voiceflow.com/blog/prevent-llm-hallucinations)
- [LinkedIn Post by Braden Ream](https://www.linkedin.com/posts/bradenream)

---

### 14. AWS Bedrock [verify-success]

**URL**: https://aws.amazon.com/blogs/machine-learning/reducing-hallucinations-in-large-language-models-with-custom-intervention-using-amazon-bedrock-agents/
**Authors**: Shayan Ray, Bharathi Srinivasan
**Published**: November 26, 2024
**Key Findings**:
- Custom agentic AI workflow using Amazon Bedrock Agents
- Intervenes when LLM hallucinations detected
- **Guardrails for Amazon Bedrock** detects hallucinations and safeguards apps
- **Automated Reasoning Checks**: Up to 99% verification accuracy
- **Contextual Grounding Check**: Detects and filters hallucinations with reference source
- Human-in-the-loop intervention when hallucination criteria met

**Sources**:
- [AWS Blog](https://aws.amazon.com/blogs/machine-learning/reducing-hallucinations-in-large-language-models-with-custom-intervention-using-amazon-bedrock-agents/)
- [Guardrails Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-contextual-grounding-check.html)
- [AWS News](https://aws.amazon.com/blogs/aws/guardrails-for-amazon-bedrock-can-now-detect-hallucinations-and-safeguard-apps-built-using-custom-or-third-party-fms/)

---

## HuggingFace Models (15-16)

### 15. AimonLabs Model [verify-success]

**URL**: https://huggingface.co/AimonLabs/hallucination-detection-model
**Model Version**: HDM-2 (Hallucination Detection Model 2)
**Last Updated**: April-May 2025
**Key Findings**:
- Modular, production-ready, multi-task hallucination evaluation model
- Validates factual groundedness of LLM outputs
- Designed for enterprise applications
- Detects factual inaccuracies and ungrounded content
- Multi-task evaluation capability

**Sources**:
- [HuggingFace Model](https://huggingface.co/AimonLabs/hallucination-detection-model)
- [GitHub](https://github.com/aimonlabs/hallucination-detection-model)
- [Company Announcement](https://www.aimon.ai/announcements/aimon-hdm-2-hallucination-detection-model/)

---

### 16. Varun-Chowdary Model [verify-success]

**URL**: https://huggingface.co/Varun-Chowdary/hallucination_detect
**Base Model**: DeBERTa-v3-base
**Last Updated**: May 27, 2024
**Key Findings**:
- Fine-tuned specifically for detecting hallucinations between pairs of text
- Uses DeBERTa architecture
- Detects hallucinations between pairs of text/sequences

**Sources**:
- [HuggingFace Model](https://huggingface.co/Varun-Chowdary/hallucination_detect)
- [GitHub](https://github.com/Varun-Chowdary/Hallucination-detector)

---

## Validation Summary by Category

| Category | Total | Verified |
|----------|-------|----------|
| Core Papers | 5 | 5 |
| Surveys | 3 | 3 |
| Benchmarks | 2 | 2 |
| Web Guides | 4 | 4 |
| HuggingFace Models | 2 | 2 |
| **TOTAL** | **16** | **16** |

## Next Phase

All 16 sources validated successfully. Proceeding to **Phase 2: Technique Integration**.
