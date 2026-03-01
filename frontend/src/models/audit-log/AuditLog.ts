export type AuditLogStatus = 'SUCCESS' | 'FAIL';

export default interface AuditLog {
  id: string;
  actorUserId?: string | null;
  actorUsername?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  status: AuditLogStatus;
  message?: string | null;
  metadata?: Record<string, any> | null;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;
}
