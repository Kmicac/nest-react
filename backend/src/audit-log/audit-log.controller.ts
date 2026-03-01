import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';
import { AuditLogQuery } from './audit-log.query';
import { AuditLogService } from './audit-log.service';

@Controller('audit-logs')
@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Roles(Role.Admin, Role.Editor, Role.User)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  async findAll(@Query() query: AuditLogQuery, @Req() request: any) {
    return await this.auditLogService.findAll(query, request.user);
  }

  @Get('/:id')
  async findOne(@Param('id') id: string, @Req() request: any) {
    const log = await this.auditLogService.findById(id);

    if (!this.auditLogService.canReadLog(request.user, log)) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    return log;
  }
}
