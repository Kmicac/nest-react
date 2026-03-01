import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Between, ILike, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

import { Role } from '../enums/role.enum';
import { AuditLogQuery } from './audit-log.query';
import { AuditLog, AuditLogStatus } from './audit-log.entity';

export type AuditActor = {
  userId?: string;
  username?: string;
  role?: string;
};

export type CreateAuditLogInput = {
  actorUserId?: string;
  actorUsername?: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  status?: AuditLogStatus;
  message?: string;
  metadata?: Record<string, any>;
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class AuditLogService {
  async record(input: CreateAuditLogInput): Promise<AuditLog> {
    const metadata = this.sanitizeMetadata(input.metadata);

    return await AuditLog.create({
      actorUserId: input.actorUserId,
      actorUsername: input.actorUsername,
      actorRole: input.actorRole,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      status: input.status ?? 'SUCCESS',
      message: input.message,
      metadata,
      ip: input.ip,
      userAgent: input.userAgent,
    }).save();
  }

  async recordSafe(input: CreateAuditLogInput): Promise<void> {
    try {
      await this.record(input);
    } catch (error) {
      // Never break business flow due to audit persistence issues.
    }
  }

  async findAll(
    query: AuditLogQuery,
    requester: AuditActor,
  ): Promise<{ data: AuditLog[]; total: number; page: number; limit: number }> {
    const {
      actorUserId,
      actorUsername,
      actorRole,
      action,
      entityType,
      entityId,
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const where: any = {};
    const isAdmin = requester?.role === Role.Admin;

    if (isAdmin) {
      if (actorUserId) {
        where.actorUserId = actorUserId;
      }
    } else {
      where.actorUserId = requester?.userId;
    }

    if (actorUsername) {
      where.actorUsername = ILike(`%${actorUsername}%`);
    }

    if (actorRole) {
      where.actorRole = actorRole;
    }

    if (action) {
      where.action = action;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (entityId) {
      where.entityId = entityId;
    }

    if (status) {
      where.status = status;
    }

    if (dateFrom && dateTo) {
      where.createdAt = Between(new Date(dateFrom), new Date(dateTo));
    } else if (dateFrom) {
      where.createdAt = MoreThanOrEqual(new Date(dateFrom));
    } else if (dateTo) {
      where.createdAt = LessThanOrEqual(new Date(dateTo));
    }

    const [data, total] = await AuditLog.findAndCount({
      where,
      order: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findById(id: string): Promise<AuditLog> {
    const log = await AuditLog.findOne(id);

    if (!log) {
      throw new HttpException(
        `Could not find audit log with matching id ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }

    return log;
  }

  canReadLog(requester: AuditActor, log: AuditLog): boolean {
    if (requester?.role === Role.Admin) {
      return true;
    }

    if (!requester?.userId || !log.actorUserId) {
      return false;
    }

    return requester.userId === log.actorUserId;
  }

  private sanitizeMetadata(
    metadata?: Record<string, any>,
  ): Record<string, any> {
    if (!metadata) {
      return null;
    }

    return this.redactDeep(metadata) as Record<string, any>;
  }

  private redactDeep(value: any): any {
    if (Array.isArray(value)) {
      return value.map((entry) => this.redactDeep(entry));
    }

    if (value && typeof value === 'object') {
      const cloned: Record<string, any> = {};

      for (const [key, nestedValue] of Object.entries(value)) {
        const normalizedKey = key.toLowerCase();
        const isSensitive =
          normalizedKey.includes('password') ||
          normalizedKey.includes('token') ||
          normalizedKey.includes('secret') ||
          normalizedKey.includes('hash');

        cloned[key] = isSensitive ? '[REDACTED]' : this.redactDeep(nestedValue);
      }

      return cloned;
    }

    return value;
  }
}
