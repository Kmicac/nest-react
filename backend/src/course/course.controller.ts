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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

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
  @ApiOperation({ summary: 'Create a new course (optional image upload)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'description'],
      properties: {
        name: { type: 'string', example: 'Docker Fundamentals' },
        description: {
          type: 'string',
          example: 'Hands-on containerization course for beginners',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Optional image (JPG/PNG/WEBP, max 5MB)',
        },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Course created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid payload or invalid image file' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'Insufficient role to create course' })
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
  @ApiOperation({ summary: 'List courses with filters, sorting and pagination' })
  @ApiOkResponse({ description: 'Courses returned successfully' })
  async findAll(@Query() query: CourseQuery, @Req() request: any) {
    return this.courseService.findAll(query, request.user?.userId);
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Get course by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Course ID (uuid)' })
  @ApiOkResponse({ description: 'Course returned successfully' })
  @ApiNotFoundResponse({ description: 'Course not found' })
  async findOne(@Param('id') id: string, @Req() request: any): Promise<Course> {
    return await this.courseService.findById(id, request.user?.userId);
  }

  @Put('/:id')
  @Roles(Role.Admin, Role.Editor)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Update a course (replace/remove image supported)' })
  @ApiParam({ name: 'id', type: String, description: 'Course ID (uuid)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Docker Fundamentals - Advanced' },
        description: { type: 'string', example: 'Updated description' },
        removeImage: {
          type: 'boolean',
          example: false,
          description: 'Set true to remove current image if no new image is provided',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Optional new image (JPG/PNG/WEBP, max 5MB)',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Course updated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid payload or invalid image file' })
  @ApiNotFoundResponse({ description: 'Course not found' })
  @ApiForbiddenResponse({ description: 'Insufficient role to update course' })
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
  @ApiOperation({ summary: 'Delete a course' })
  @ApiParam({ name: 'id', type: String, description: 'Course ID (uuid)' })
  @ApiOkResponse({ description: 'Course deleted successfully (returns deleted id)' })
  @ApiNotFoundResponse({ description: 'Course not found' })
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
  @ApiOperation({ summary: 'Enroll authenticated user in a course' })
  @ApiParam({ name: 'id', type: String, description: 'Course ID (uuid)' })
  @ApiCreatedResponse({ description: 'Enrollment created (or already exists)' })
  @ApiNotFoundResponse({ description: 'Course not found' })
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
  @ApiOperation({ summary: 'Unenroll authenticated user from a course' })
  @ApiParam({ name: 'id', type: String, description: 'Course ID (uuid)' })
  @ApiNoContentResponse({ description: 'Unenrolled successfully' })
  @ApiNotFoundResponse({ description: 'Course not found' })
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
  @ApiOperation({ summary: 'Add course to favorites for authenticated user' })
  @ApiParam({ name: 'id', type: String, description: 'Course ID (uuid)' })
  @ApiCreatedResponse({ description: 'Favorite created (or already exists)' })
  @ApiNotFoundResponse({ description: 'Course not found' })
  @ApiForbiddenResponse({ description: 'Only user role can favorite courses' })
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
  @ApiOperation({ summary: 'Remove course from favorites for authenticated user' })
  @ApiParam({ name: 'id', type: String, description: 'Course ID (uuid)' })
  @ApiNoContentResponse({ description: 'Course removed from favorites' })
  @ApiNotFoundResponse({ description: 'Course not found' })
  @ApiForbiddenResponse({ description: 'Only user role can unfavorite courses' })
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
  @ApiOperation({ summary: 'Create content inside a course' })
  @ApiParam({ name: 'id', type: String, description: 'Course ID (uuid)' })
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
  @ApiOperation({ summary: 'List contents from a specific course' })
  @ApiParam({ name: 'id', type: String, description: 'Course ID (uuid)' })
  async findAllContentsByCourseId(
    @Param('id') id: string,
    @Query() contentQuery: ContentQuery,
  ) {
    return await this.contentService.findAllByCourseId(id, contentQuery);
  }

  @Put('/:id/contents/:contentId')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Update content from a specific course' })
  @ApiParam({ name: 'id', type: String, description: 'Course ID (uuid)' })
  @ApiParam({ name: 'contentId', type: String, description: 'Content ID (uuid)' })
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
  @ApiOperation({ summary: 'Delete content from a specific course' })
  @ApiParam({ name: 'id', type: String, description: 'Course ID (uuid)' })
  @ApiParam({ name: 'contentId', type: String, description: 'Content ID (uuid)' })
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
