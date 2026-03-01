import AuditLog from '../models/audit-log/AuditLog';
import AuditLogQuery from '../models/audit-log/AuditLogQuery';
import apiService from './ApiService';
import { PaginatedResponse } from './UserService';

class AuditLogService {
  async findAll(query: AuditLogQuery): Promise<PaginatedResponse<AuditLog>> {
    const response = await apiService.get<PaginatedResponse<AuditLog>>(
      '/api/audit-logs',
      {
        params: query,
      },
    );

    return {
      data: response.data?.data ?? [],
      total: response.data?.total ?? 0,
      page: response.data?.page,
      limit: response.data?.limit,
    };
  }

  async findOne(id: string): Promise<AuditLog> {
    return (await apiService.get<AuditLog>(`/api/audit-logs/${id}`)).data;
  }
}

export default new AuditLogService();
