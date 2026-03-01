import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuditAction } from '../audit-log/audit-action.enum';
import { AuditLogService } from '../audit-log/audit-log.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserGuard } from '../auth/guards/user.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';
import { CreateUserDto, UpdateUserDto } from './user.dto';
import { User } from './user.entity';
import { UserQuery } from './user.query';
import { UserService } from './user.service';

@Controller('users')
@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.Admin)
  async save(
    @Body() createUserDto: CreateUserDto,
    @Req() request: any,
  ): Promise<User> {
    const user = await this.userService.save(createUserDto);

    await this.auditLogService.recordSafe({
      actorUserId: request.user?.userId,
      actorUsername: request.user?.username,
      actorRole: request.user?.role,
      action: AuditAction.UserCreate,
      entityType: 'user',
      entityId: user.id,
      status: 'SUCCESS',
      message: 'User created',
      metadata: {
        createdUserId: user.id,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
      },
      ip: request.ip,
      userAgent: request.headers?.['user-agent'],
    });

    return user;
  }

  @Get()
  @Roles(Role.Admin, Role.Editor)
  async findAll(@Query() userQuery: UserQuery) {
    return this.userService.findAll(userQuery);
  }

  @Get('/:id')
  @UseGuards(UserGuard)
  async findOne(@Param('id') id: string): Promise<User> {
    return await this.userService.findById(id);
  }

  @Put('/:id')
  @UseGuards(UserGuard)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() request: any,
  ): Promise<User> {
    const currentUser = await this.userService.findById(id);
    const user = await this.userService.update(id, updateUserDto);

    await this.auditLogService.recordSafe({
      actorUserId: request.user?.userId,
      actorUsername: request.user?.username,
      actorRole: request.user?.role,
      action: AuditAction.UserUpdate,
      entityType: 'user',
      entityId: user.id,
      status: 'SUCCESS',
      message: 'User updated',
      metadata: {
        targetUserId: user.id,
        updatedFields: Object.keys(updateUserDto || {}),
      },
      ip: request.ip,
      userAgent: request.headers?.['user-agent'],
    });

    if (updateUserDto.role && updateUserDto.role !== currentUser.role) {
      await this.auditLogService.recordSafe({
        actorUserId: request.user?.userId,
        actorUsername: request.user?.username,
        actorRole: request.user?.role,
        action: AuditAction.UserRoleChange,
        entityType: 'user',
        entityId: user.id,
        status: 'SUCCESS',
        message: 'User role changed',
        metadata: {
          targetUserId: user.id,
          previousRole: currentUser.role,
          nextRole: updateUserDto.role,
        },
        ip: request.ip,
        userAgent: request.headers?.['user-agent'],
      });
    }

    return user;
  }

  @Delete('/:id')
  @Roles(Role.Admin)
  async delete(@Param('id') id: string, @Req() request: any): Promise<string> {
    const targetUser = await this.userService.findById(id);
    const deletedId = await this.userService.delete(id);

    await this.auditLogService.recordSafe({
      actorUserId: request.user?.userId,
      actorUsername: request.user?.username,
      actorRole: request.user?.role,
      action: AuditAction.UserDelete,
      entityType: 'user',
      entityId: deletedId,
      status: 'SUCCESS',
      message: 'User deleted',
      metadata: {
        deletedUserId: deletedId,
        username: targetUser.username,
        role: targetUser.role,
      },
      ip: request.ip,
      userAgent: request.headers?.['user-agent'],
    });

    return deletedId;
  }
}
