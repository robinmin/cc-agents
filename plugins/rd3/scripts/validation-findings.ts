/**
 * Shared helpers for accumulating validation findings across rd3 skills.
 */

export type SharedValidationSeverity = string;

export interface SharedValidationFinding<Severity extends string = SharedValidationSeverity> {
    severity: Severity;
    message: string;
    suggestion?: string;
}

export interface ValidationFindingAccumulator<Finding extends SharedValidationFinding = SharedValidationFinding> {
    errors: string[];
    warnings: string[];
    suggestions?: string[];
    findings: Finding[];
}

export function createValidationFinding<Finding extends SharedValidationFinding>(
    severity: Finding['severity'],
    message: string,
    contextValue?: string,
    suggestion?: string,
    contextKey = 'field',
): Finding {
    return {
        severity,
        message,
        ...(contextValue !== undefined ? { [contextKey]: contextValue } : {}),
        ...(suggestion !== undefined ? { suggestion } : {}),
    } as Finding;
}

export function addValidationFinding<Finding extends SharedValidationFinding>(
    report: ValidationFindingAccumulator<Finding>,
    severity: Finding['severity'],
    message: string,
    contextValue?: string,
    suggestion?: string,
    contextKey = 'field',
): Finding {
    const finding = createValidationFinding<Finding>(severity, message, contextValue, suggestion, contextKey);
    report.findings.push(finding);

    if (severity === 'error') {
        report.errors.push(message);
    } else if (severity === 'warning') {
        report.warnings.push(message);
    } else if (severity === 'suggestion' && Array.isArray(report.suggestions)) {
        report.suggestions.push(message);
    }

    return finding;
}
