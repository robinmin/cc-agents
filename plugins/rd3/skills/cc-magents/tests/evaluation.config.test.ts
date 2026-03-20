import { describe, it, expect } from 'bun:test';
import {
    MAGENT_EVALUATION_CONFIG,
    getWeightsForProfile,
    getGradeForPercentage,
    validateWeightProfile,
    EXPECTED_CATEGORIES,
    SPECIFICITY_INDICATORS,
    SAFETY_INDICATORS,
} from '../scripts/evaluation.config';

describe('evaluation.config', () => {
    describe('MAGENT_EVALUATION_CONFIG', () => {
        it('should have all required profiles', () => {
            expect(MAGENT_EVALUATION_CONFIG.profiles.standard).toBeDefined();
            expect(MAGENT_EVALUATION_CONFIG.profiles.minimal).toBeDefined();
            expect(MAGENT_EVALUATION_CONFIG.profiles.advanced).toBeDefined();
        });

        it('should have weights that sum to 100 for standard profile', () => {
            const weights = MAGENT_EVALUATION_CONFIG.profiles.standard;
            const sum = weights.completeness + weights.specificity + weights.verifiability + weights.safety + weights.evolutionReadiness;
            expect(sum).toBe(100);
        });

        it('should have weights that sum to 100 for minimal profile', () => {
            const weights = MAGENT_EVALUATION_CONFIG.profiles.minimal;
            const sum = weights.completeness + weights.specificity + weights.verifiability + weights.safety + weights.evolutionReadiness;
            expect(sum).toBe(100);
        });

        it('should have weights that sum to 100 for advanced profile', () => {
            const weights = MAGENT_EVALUATION_CONFIG.profiles.advanced;
            const sum = weights.completeness + weights.specificity + weights.verifiability + weights.safety + weights.evolutionReadiness;
            expect(sum).toBe(100);
        });

        it('should have grade thresholds in order', () => {
            const thresholds = MAGENT_EVALUATION_CONFIG.gradeThresholds;
            expect(thresholds[0].grade).toBe('A');
            expect(thresholds[1].grade).toBe('B');
            expect(thresholds[2].grade).toBe('C');
            expect(thresholds[3].grade).toBe('D');
            expect(thresholds[4].grade).toBe('F');
        });

        it('should have decreasing minPercentage for grades', () => {
            const thresholds = MAGENT_EVALUATION_CONFIG.gradeThresholds;
            for (let i = 1; i < thresholds.length; i++) {
                expect(thresholds[i].minPercentage).toBeLessThan(thresholds[i - 1].minPercentage);
            }
        });

        it('should have pass threshold at 75', () => {
            expect(MAGENT_EVALUATION_CONFIG.passThreshold).toBe(75);
        });

        it('should have dimension display names for all dimensions', () => {
            const displayNames = MAGENT_EVALUATION_CONFIG.dimensionDisplayNames;
            expect(displayNames.completeness).toBeDefined();
            expect(displayNames.specificity).toBeDefined();
            expect(displayNames.verifiability).toBeDefined();
            expect(displayNames.safety).toBeDefined();
            expect(displayNames['evolution-readiness']).toBeDefined();
        });
    });

    describe('getWeightsForProfile', () => {
        it('should return standard weights by default', () => {
            const weights = getWeightsForProfile('standard');
            expect(weights.completeness).toBe(25);
            expect(weights.specificity).toBe(20);
        });

        it('should return minimal weights for minimal profile', () => {
            const weights = getWeightsForProfile('minimal');
            expect(weights.completeness).toBe(30);
            expect(weights.safety).toBe(30);
        });

        it('should return advanced weights for advanced profile', () => {
            const weights = getWeightsForProfile('advanced');
            expect(weights.evolutionReadiness).toBe(25);
            expect(weights.verifiability).toBe(25);
        });
    });

    describe('getGradeForPercentage', () => {
        it('should return A for 90+', () => {
            expect(getGradeForPercentage(90)).toBe('A');
            expect(getGradeForPercentage(100)).toBe('A');
        });

        it('should return B for 80-89', () => {
            expect(getGradeForPercentage(80)).toBe('B');
            expect(getGradeForPercentage(85)).toBe('B');
            expect(getGradeForPercentage(89)).toBe('B');
        });

        it('should return C for 70-79', () => {
            expect(getGradeForPercentage(70)).toBe('C');
            expect(getGradeForPercentage(75)).toBe('C');
            expect(getGradeForPercentage(79)).toBe('C');
        });

        it('should return D for 60-69', () => {
            expect(getGradeForPercentage(60)).toBe('D');
            expect(getGradeForPercentage(65)).toBe('D');
            expect(getGradeForPercentage(69)).toBe('D');
        });

        it('should return F for below 60', () => {
            expect(getGradeForPercentage(59)).toBe('F');
            expect(getGradeForPercentage(0)).toBe('F');
            expect(getGradeForPercentage(30)).toBe('F');
        });
    });

    describe('validateWeightProfile', () => {
        it('should return valid for weights summing to 100', () => {
            const result = validateWeightProfile({
                completeness: 25,
                specificity: 20,
                verifiability: 20,
                safety: 20,
                evolutionReadiness: 15,
            });
            expect(result.valid).toBe(true);
            expect(result.sum).toBe(100);
        });

        it('should return invalid for weights not summing to 100', () => {
            const result = validateWeightProfile({
                completeness: 30,
                specificity: 20,
                verifiability: 20,
                safety: 20,
                evolutionReadiness: 15,
            });
            expect(result.valid).toBe(false);
            expect(result.sum).toBe(105);
        });
    });

    describe('EXPECTED_CATEGORIES', () => {
        it('should have required categories', () => {
            expect(EXPECTED_CATEGORIES.required).toContain('identity');
            expect(EXPECTED_CATEGORIES.required).toContain('rules');
            expect(EXPECTED_CATEGORIES.required).toContain('tools');
        });

        it('should have recommended categories', () => {
            expect(EXPECTED_CATEGORIES.recommended).toContain('workflow');
            expect(EXPECTED_CATEGORIES.recommended).toContain('standards');
        });

        it('should have optional categories', () => {
            expect(EXPECTED_CATEGORIES.optional.length).toBeGreaterThan(0);
        });
    });

    describe('SPECIFICITY_INDICATORS', () => {
        it('should have decision tree patterns', () => {
            expect(SPECIFICITY_INDICATORS.decisionTrees.length).toBeGreaterThan(0);
        });

        it('should have example patterns', () => {
            expect(SPECIFICITY_INDICATORS.examples.length).toBeGreaterThan(0);
        });

        it('should have version patterns', () => {
            expect(SPECIFICITY_INDICATORS.versions.length).toBeGreaterThan(0);
        });
    });

    describe('SAFETY_INDICATORS', () => {
        it('should have critical marker patterns', () => {
            expect(SAFETY_INDICATORS.criticalMarkers.length).toBeGreaterThan(0);
        });

        it('should have destructive warning patterns', () => {
            expect(SAFETY_INDICATORS.destructiveWarnings.length).toBeGreaterThan(0);
        });

        it('should have secret protection patterns', () => {
            expect(SAFETY_INDICATORS.secretProtection.length).toBeGreaterThan(0);
        });
    });
});
