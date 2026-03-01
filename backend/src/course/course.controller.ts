import {
  Body,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuditAction } from '../audit-log/audit-action.enum';
import { AuditLogService } from '../audit-log/audit-log.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateContentDto, UpdateContentDto } from '../content/content.dto';
import { Content } from '../content/content.entity';
import { ContentQuery } from '../content/content.query';
import { ContentService } from '../content/content.service';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';
import { CreateCourseDto, UpdateCourseDto } from './course.dto';
import { Course } from './course.entity';
import { CourseQuery } from './course.query';
import { CourseService } from './course.service';

type CourseImageFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

@Controller('courses')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@ApiTags('Courses')
export class CourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly contentService: ContentService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post()
  @Roles(Role.Admin, Role.Editor)
  @UseInterceptors(FileInterceptor('image'))
  async save(
    @Body() createCourseDto: CreateCourseDto,
    @UploadedFile() image: CourseImageFile,
    @Req() request: any,
  ): Promise<Course> {
    const course = await this.courseService.save(createCourseDto, image);

    await this.auditLogService.recordSafe({
      actorUserId: request.user?.userId,
      actorUsername: request.user?.username,
      actorRole: request.user?.role,
      action: AuditAction.CourseCreate,
      entityType: 'course',
      entityId: course.id,
      status: 'SUCCESS',
      message: 'Course created',
      metadata: {
        name: course.name,
        description: course.description,
      },
      ip: request.ip,
      userAgent: request.headers?.['user-agent'],
    });

    return course;
  }

  @Get()
  async findAll(@Query() query: CourseQuery, @Req() request: any) {
    return this.courseService.findAll(query, request.user?.userId);
  }

  @Get('/:id')
  async findOne(@Param('id') id: string, @Req() request: any): Promise<Course> {
    return await this.courseService.findById(id, request.user?.userId);
  }

  @Put('/:id')
  @Roles(Role.Admin, Role.Editor)
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @UploadedFile() image: CourseImageFile,
    @Req() request: any,
  ): Promise<Course> {
    const course = await this.courseService.update(id, updateCourseDto, image);

    await this.auditLogService.recordSafe({
      actorUserId: request.user?.userId,
      actorUsername: request.user?.username,
      actorRole: request.user?.role,
      action: AuditAction.CourseUpdate,
      entityType: 'course',
      entityId: course.id,
      status: 'SUCCESS',
      message: 'Course updated',
      metadata: {
        updatedFields: Object.keys(updateCourseDto || {}),
      },
      ip: request.ip,
      userAgent: request.headers?.['user-agent'],
    });

    return course;
  }

  @Delete('/:id')
  @Roles(Role.Admin)
  async delete(@Param('id') id: string, @Req() request: any): Promise<string> {
    const deletedId = await this.courseService.delete(id);

    await this.auditLogService.recordSafe({
      actorUserId: request.user?.userId,
      actorUsername: request.user?.username,
      actorRole: request.user?.role,
      action: AuditAction.CourseDelete,
      entityType: 'course',
      entityId: deletedId,
      status: 'SUCCESS',
      message: 'Course deleted',
      metadata: { deletedCourseId: deletedId },
      ip: request.ip,
      userAgent: request.headers?.['user-agent'],
    });

    return deletedId;
  }

  @Post('/:id/enrollment')
  @Roles(Role.User, Role.Editor, Role.Admin)
  async enroll(@Param('id') id: string, @Req() request: any) {
    const enrollment = await this.courseService.enroll(id, request.user.userId);

    await this.auditLogService.recordSafe({
      actorUserId: request.user?.userId,
      actorUsername: request.user?.username,
      actorRole: request.user?.role,
      action: AuditAction.CourseEnroll,
      entityType: 'enrollment',
      entityId: enrollment.id,
      status: 'SUCCESS',
      message: 'User enrolled in course',
      metadata: {
        courseId: id,
        userId: request.user?.userId,
      },
      ip: request.ip,
      userAgent: request.headers?.['user-agent'],
    });

    return enrollment;
  }

  @Delete('/:id/enrollment')
  @Roles(Role.User, Role.Editor, Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unenroll(@Param('id') id: string, @Req() request: any): Promise<void> {
    await this.courseService.unenroll(id, request.user.userId);

    await this.auditLogService.recordSafe({
      actorUserId: request.user?.userId,
      actorUsername: request.user?.username,
      actorRole: request.user?.role,
      action: AuditAction.CourseUnenroll,
      entityType: 'enrollment',
      entityId: id,
      status: 'SUCCESS',
      message: 'User unenrolled from course',
      metadata: {
        courseId: id,
        userId: request.user?.userId,
      },
      ip: request.ip,
      userAgent: request.headers?.['user-agent'],
    });
  }

  @Post('/:id/favorite')
  @Roles(Role.User)
  async favorite(@Param('id') id: string, @Req() request: any) {
    const favorite = await this.courseService.favorite(id, request.user.userId);

    await this.auditLogService.recordSafe({
      actorUserId: request.user?.userId,
      actorUsername: request.user?.username,
      actorRole: request.user?.role,
      action: AuditAction.CourseFavorite,
      entityType: 'favorite',
      entityId: favorite.id,
      status: 'SUCCESS',
      message: 'Course added to favorites',
      metadata: {
        courseId: id,
        userId: request.user?.userId,
      },
      ip: request.ip,
      userAgent: request.headers?.['user-agent'],
    });

    return favorite;
  }

  @Delete('/:id/favorite')
  @Roles(Role.User)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfavorite(
    @Param('id') id: string,
    @Req() request: any,
  ): Promise<void> {
    await this.courseService.unfavorite(id, request.user.userId);

    await this.auditLogService.recordSafe({
      actorUserId: request.user?.userId,
      actorUsername: request.user?.username,
      actorRole: request.user?.role,
      action: AuditAction.CourseUnfavorite,
      entityType: 'favorite',
      entityId: id,
      status: 'SUCCESS',
      message: 'Course removed from favorites',
      metadata: {
        courseId: id,
        userId: request.user?.userId,
      },
      ip: request.ip,
      userAgent: request.headers?.['user-agent'],
    });
  }

  @Post('/:id/contents')
  @Roles(Role.Admin, Role.Editor)
  async saveContent(
    @Param('id') id: string,
    @Body() createContentDto: CreateContentDto,
    @Req() request: any,
  ): Promise<Content> {
    const content = await this.contentService.save(id, createContentDto);

    await this.auditLogService.recordSafe({
      actorUserId: request.user?.userId,
      actorUsername: request.user?.username,
      actorRole: request.user?.role,
      action: AuditAction.ContentCreate,
      entityType: 'content',
      entityId: content.id,
      status: 'SUCCESS',
      message: 'Content created',
      metadata: {
        courseId: id,
        name: content.name,
      },
      ip: request.ip,
      userAgent: request.headers?.['user-agent'],
    });

    return content;
  }

  @Get('/:id/contents')
  async findAllContentsByCourseId(
    @Param('id') id: string,
    @Query() contentQuery: ContentQuery,
  ) {
    return await this.contentService.findAllByCourseId(id, contentQuery);
  }

  @Put('/:id/contents/:contentId')
  @Roles(Role.Admin, Role.Editor)
  async updateContent(
    @Param('id') id: string,
    @Param('contentId') contentId: string,
    @Body() updateContentDto: UpdateContentDto,
    @Req() request: any,
  ): Promise<Content> {
    const content = await this.contentService.update(
      id,
      contentId,
      updateContentDto,
    );

    await this.auditLogService.recordSafe({
      actorUserId: request.user?.userId,
      actorUsername: request.user?.username,
      actorRole: request.user?.role,
      action: AuditAction.ContentUpdate,
      entityType: 'content',
      entityId: content.id,
      status: 'SUCCESS',
      message: 'Content updated',
      metadata: {
        courseId: id,
        updatedFields: Object.keys(updateContentDto || {}),
      },
      ip: request.ip,
      userAgent: request.headers?.['user-agent'],
    });

    return content;
  }

  @Delete('/:id/contents/:contentId')
  @Roles(Role.Admin)
  async deleteContent(
    @Param('id') id: string,
    @Param('contentId') contentId: string,
    @Req() request: any,
  ): Promise<string> {
    const deletedId = await this.contentService.delete(id, contentId);

    await this.auditLogService.recordSafe({
      actorUserId: request.user?.userId,
      actorUsername: request.user?.username,
      actorRole: request.user?.role,
      action: AuditAction.ContentDelete,
      entityType: 'content',
      entityId: deletedId,
      status: 'SUCCESS',
      message: 'Content deleted',
      metadata: {
        courseId: id,
        contentId: deletedId,
      },
      ip: request.ip,
      userAgent: request.headers?.['user-agent'],
    });

    return deletedId;
  }
}
