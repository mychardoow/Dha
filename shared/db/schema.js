import { pgEnum, pgTable, serial, timestamp, varchar, jsonb } from 'drizzle-orm/pg-core';
export const complianceEventTypeEnum = pgEnum('compliance_event_type', [
    'DATA_ACCESS',
    'DATA_MODIFICATION',
    'SECURITY_VIOLATION',
    'POLICY_VIOLATION',
    'AUDIT_TRAIL'
]);
export const systemMetricsTable = pgTable('system_metrics', {
    id: serial('id').primaryKey(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    metricType: varchar('metric_type').notNull(),
    value: varchar('value').notNull(), // Using varchar for flexibility with numeric values
    tags: jsonb('tags')
});
export const selfHealingActionsTable = pgTable('self_healing_actions', {
    id: serial('id').primaryKey(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    actionType: varchar('action_type').notNull(),
    status: varchar('status').notNull(),
    details: jsonb('details')
});
export const auditLogsTable = pgTable('audit_logs', {
    id: serial('id').primaryKey(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    eventType: varchar('event_type').notNull(),
    userId: varchar('user_id'),
    details: jsonb('details')
});
export const complianceEventsTable = pgTable('compliance_events', {
    id: serial('id').primaryKey(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    eventType: complianceEventTypeEnum('event_type').notNull(),
    userId: varchar('user_id'),
    details: jsonb('details')
});
export const securityEventsTable = pgTable('security_events', {
    id: serial('id').primaryKey(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    severity: varchar('severity').notNull(),
    eventType: varchar('event_type').notNull(),
    details: jsonb('details')
});
