export default interface AuditLogQuery {
  actorUserId?: string;
  actorUsername?: string;
  actorRole?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  status?: 'SUCCESS' | 'FAIL';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
}
