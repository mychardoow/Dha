// Shared schema types
// Re-export from audit-schema
export { AuditAction } from './audit-schema.js';
export var ComplianceEventType;
(function (ComplianceEventType) {
    ComplianceEventType["DATA_ACCESS"] = "DATA_ACCESS";
    ComplianceEventType["DATA_MODIFICATION"] = "DATA_MODIFICATION";
    ComplianceEventType["SECURITY_VIOLATION"] = "SECURITY_VIOLATION";
    ComplianceEventType["POLICY_VIOLATION"] = "POLICY_VIOLATION";
    ComplianceEventType["AUDIT_TRAIL"] = "AUDIT_TRAIL";
})(ComplianceEventType || (ComplianceEventType = {}));
