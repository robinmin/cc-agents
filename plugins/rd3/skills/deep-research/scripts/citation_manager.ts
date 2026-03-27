#!/usr/bin/env bun
/**
 * Citation Management System
 * Tracks sources, generates citations, and maintains bibliography
 */

interface Citation {
    id: string;
    title: string;
    url: string;
    authors: string[] | null;
    publicationDate: string | null;
    retrievedDate: string;
    sourceType: string;
    doi: string | null;
    citationCount: number;
}

interface CredibilityScore {
    overallScore: number;
    domainAuthority: number;
    recency: number;
    expertise: number;
    biasScore: number;
    factors: Record<string, string>;
    recommendation: string;
}

class SourceEvaluator {
    private HIGH_AUTHORITY_DOMAINS: Set<string>;
    private MODERATE_AUTHORITY_DOMAINS: Set<string>;
    private LOW_AUTHORITY_INDICATORS: string[];

    constructor() {
        this.HIGH_AUTHORITY_DOMAINS = new Set([
            'arxiv.org',
            'nature.com',
            'science.org',
            'cell.com',
            'nejm.org',
            'thelancet.com',
            'springer.com',
            'sciencedirect.com',
            'plos.org',
            'ieee.org',
            'acm.org',
            'pubmed.ncbi.nlm.nih.gov',
            'nih.gov',
            'cdc.gov',
            'who.int',
            'fda.gov',
            'nasa.gov',
            'gov.uk',
            'europa.eu',
            'un.org',
            'docs.python.org',
            'developer.mozilla.org',
            'docs.microsoft.com',
            'cloud.google.com',
            'aws.amazon.com',
            'kubernetes.io',
            'reuters.com',
            'apnews.com',
            'bbc.com',
            'economist.com',
            'scientificamerican.com',
        ]);

        this.MODERATE_AUTHORITY_DOMAINS = new Set([
            'techcrunch.com',
            'theverge.com',
            'arstechnica.com',
            'wired.com',
            'zdnet.com',
            'cnet.com',
            'forbes.com',
            'bloomberg.com',
            'wsj.com',
            'ft.com',
            'wikipedia.org',
            'britannica.com',
            'khanacademy.org',
            'medium.com',
            'dev.to',
            'stackoverflow.com',
            'github.com',
        ]);

        this.LOW_AUTHORITY_INDICATORS = ['blogspot.com', 'wordpress.com', 'wix.com', 'substack.com'];
    }

    evaluateSource(
        url: string,
        title: string,
        content?: string | null,
        publicationDate?: string | null,
        author?: string | null,
    ): CredibilityScore {
        const domain = this.extractDomain(url);

        // Calculate component scores
        const domainScore = this.evaluateDomainAuthority(domain);
        const recencyScore = this.evaluateRecency(publicationDate);
        const expertiseScore = this.evaluateExpertise(domain, title, author);
        const biasScore = this.evaluateBias(domain, title, content);

        // Calculate overall score (weighted average)
        const overall = domainScore * 0.35 + recencyScore * 0.2 + expertiseScore * 0.25 + biasScore * 0.2;

        // Determine factors
        const factors = this.identifyFactors(domain, domainScore, recencyScore, expertiseScore, biasScore);

        // Generate recommendation
        const recommendation = this.generateRecommendation(overall);

        return {
            overallScore: Math.round(overall * 100) / 100,
            domainAuthority: Math.round(domainScore * 100) / 100,
            recency: Math.round(recencyScore * 100) / 100,
            expertise: Math.round(expertiseScore * 100) / 100,
            biasScore: Math.round(biasScore * 100) / 100,
            factors,
            recommendation,
        };
    }

    private extractDomain(url: string): string {
        try {
            const urlObj = new URL(url);
            let domain = urlObj.hostname.toLowerCase();
            // Remove www prefix
            domain = domain.replace(/^www\./, '');
            return domain;
        } catch {
            return '';
        }
    }

    private evaluateDomainAuthority(domain: string): number {
        if (this.HIGH_AUTHORITY_DOMAINS.has(domain)) {
            return 90.0;
        }
        if (this.MODERATE_AUTHORITY_DOMAINS.has(domain)) {
            return 70.0;
        }
        if (this.LOW_AUTHORITY_INDICATORS.some((ind) => domain.includes(ind))) {
            return 40.0;
        }
        // Unknown domain - moderate skepticism
        return 55.0;
    }

    private evaluateRecency(publicationDate: string | null | undefined): number {
        if (!publicationDate) {
            return 50.0; // Unknown date
        }

        try {
            const pubDate = new Date(publicationDate);
            const now = new Date();
            const diffMs = now.getTime() - pubDate.getTime();
            const diffDays = diffMs / (1000 * 60 * 60 * 24);

            if (diffDays < 90) {
                // < 3 months
                return 100.0;
            }
            if (diffDays < 365) {
                // < 1 year
                return 85.0;
            }
            if (diffDays < 730) {
                // < 2 years
                return 70.0;
            }
            if (diffDays < 1825) {
                // < 5 years
                return 50.0;
            }
            return 30.0;
        } catch {
            return 50.0;
        }
    }

    private evaluateExpertise(domain: string, title: string, author: string | null | undefined): number {
        let score = 50.0;

        // Academic/research domains get high expertise
        if (['arxiv', 'nature', 'science', 'ieee', 'acm'].some((d) => domain.includes(d))) {
            score += 30;
        }

        // Government/official sources
        if (domain.includes('.gov') || domain.includes('who.int')) {
            score += 25;
        }

        // Technical documentation
        if (domain.includes('docs.') || title.toLowerCase().includes('documentation')) {
            score += 20;
        }

        // Author credentials
        if (author) {
            const authorLower = author.toLowerCase();
            if (['dr.', 'phd', 'professor'].some((t) => authorLower.includes(t))) {
                score += 15;
            }
        }

        return Math.min(score, 100.0);
    }

    private evaluateBias(domain: string, title: string, content: string | null | undefined): number {
        let score = 70.0; // Start neutral

        // Check for sensationalism in title
        const sensationalIndicators = [
            '!',
            'shocking',
            'unbelievable',
            "you won't believe",
            'secret',
            "they don't want you to know",
        ];
        const titleLower = title.toLowerCase();
        if (sensationalIndicators.some((ind) => titleLower.includes(ind))) {
            score -= 20;
        }

        // Academic sources are typically less biased
        if (['arxiv', 'nature', 'science', 'ieee'].some((d) => domain.includes(d))) {
            score += 20;
        }

        // Check for balanced language in content
        if (content) {
            const balancedIndicators = ['however', 'although', 'on the other hand', 'critics argue'];
            if (balancedIndicators.some((ind) => content.toLowerCase().includes(ind))) {
                score += 10;
            }
        }

        return Math.max(0, Math.min(score, 100.0));
    }

    private identifyFactors(
        _domain: string,
        domainScore: number,
        recencyScore: number,
        expertiseScore: number,
        biasScore: number,
    ): Record<string, string> {
        const factors: Record<string, string> = {};

        if (domainScore >= 85) {
            factors.domain = 'High authority domain';
        } else if (domainScore <= 45) {
            factors.domain = 'Low authority domain - verify claims';
        }

        if (recencyScore >= 85) {
            factors.recency = 'Recent information';
        } else if (recencyScore <= 40) {
            factors.recency = 'Outdated information - verify currency';
        }

        if (expertiseScore >= 80) {
            factors.expertise = 'Expert source';
        } else if (expertiseScore <= 45) {
            factors.expertise = 'Limited expertise indicators';
        }

        if (biasScore >= 80) {
            factors.bias = 'Balanced perspective';
        } else if (biasScore <= 50) {
            factors.bias = 'Potential bias detected';
        }

        return factors;
    }

    private generateRecommendation(overallScore: number): string {
        if (overallScore >= 80) {
            return 'high_trust';
        }
        if (overallScore >= 60) {
            return 'moderate_trust';
        }
        if (overallScore >= 40) {
            return 'low_trust';
        }
        return 'verify';
    }
}

export type { Citation, CredibilityScore };
export { SourceEvaluator };
