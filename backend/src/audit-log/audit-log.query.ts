import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { Role } from '../enums/role.enum';
import { AuditAction } from './audit-action.enum';
import { AuditLogStatus } from './audit-log.entity';

export class AuditLogQuery {
  @ApiPropertyOptional({
    example: 'f87c5521-1048-407b-b352-72c303b65460',
    description: 'Filter by actor user ID (admin/editor use case)',
  })
  @IsOptional()
  @IsString()
  actorUserId?: string;

  @ApiPropertyOptional({
    example: 'cami',
    description: 'Filter by actor username',
  })
  @IsOptional()
  @IsString()
  actorUsername?: string;

  @ApiPropertyOptional({
    enum: Object.values(Role),
    description: 'Filter by actor role',
  })
  @IsOptional()
  @IsIn(Object.values(Role))
  actorRole?: Role;

  @ApiPropertyOptional({
    enum: Object.values(AuditAction),
    description: 'Filter by audit activity/action',
  })
  @IsOptional()
  @IsIn(Object.values(AuditAction))
  action?: AuditAction;

  @ApiPropertyOptional({
    example: 'course',
    description: 'Filter by entity type (auth, user, course, content, enrollment, favorite)',
  })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({
    example: '931596ed-99bc-4e34-82bd-e6108f16e67d',
    description: 'Filter by entity ID/reference',
  })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({
    enum: ['SUCCESS', 'FAIL'],
    description: 'Filter by execution result',
  })
  @IsOptional()
  @IsIn(['SUCCESS', 'FAIL'])
  status?: AuditLogStatus;

  @ApiPropertyOptional({
    example: '2026-03-01T00:00:00.000Z',
    description: 'ISO start date filter',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-03-02T23:59:59.999Z',
    description: 'ISO end date filter',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    enum: ['createdAt'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['createdAt'])
  sortBy?: 'createdAt' = 'createdAt';

  @ApiPropertyOptional({
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
