/**
 * Shared validation runner framework.
 *
 * Replaces the duplicated errors/warnings/printSummary pattern
 * found in validate_report.ts, verify_html.ts, and similar scripts.
 */

import { logger } from '../logger';

export interface ValidationReport {
    passed: boolean;
    errors: string[];
    warnings: string[];
}

export type CheckFn = () => boolean;

export class ValidationRunner {
    readonly errors: string[] = [];
    readonly warnings: string[] = [];

    constructor() {}

    addError(message: string): void {
        this.errors.push(message);
    }

    addWarning(message: string): void {
        this.warnings.push(message);
    }

    /**
     * Run a series of named checks. Each check function should call
     * addError/addWarning on this runner and return true if the check passed.
     */
    runChecks(checks: Array<[string, CheckFn]>): ValidationReport {
        for (const [checkName, checkFn] of checks) {
            logger.log(`  Checking: ${checkName}...`);
            const passed = checkFn();
            logger.log(passed ? '  PASS' : '  FAIL');
        }

        return this.getReport();
    }

    getReport(): ValidationReport {
        return {
            passed: this.errors.length === 0,
            errors: [...this.errors],
            warnings: [...this.warnings],
        };
    }

    printSummary(): void {
        logger.log(`\n${'='.repeat(60)}`);
        logger.log('VALIDATION SUMMARY');
        logger.log(`${'='.repeat(60)}\n`);

        if (this.errors.length > 0) {
            logger.log(`ERRORS (${this.errors.length}):`);
            for (const error of this.errors) {
                logger.log(`   - ${error}`);
            }
            logger.log();
        }

        if (this.warnings.length > 0) {
            logger.log(`WARNINGS (${this.warnings.length}):`);
            for (const warning of this.warnings) {
                logger.log(`   - ${warning}`);
            }
            logger.log();
        }

        if (this.errors.length === 0 && this.warnings.length === 0) {
            logger.log('ALL CHECKS PASSED\n');
        } else if (this.warnings.length > 0) {
            logger.log('VALIDATION PASSED (with warnings)\n');
        } else {
            logger.log('VALIDATION FAILED - Please fix errors\n');
        }
    }
}
