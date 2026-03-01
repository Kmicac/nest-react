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
  ) {}

  @Post()
  @Roles(Role.Admin, Role.Editor)
  @UseInterceptors(FileInterceptor('image'))
  async save(
    @Body() createCourseDto: CreateCourseDto,
    @UploadedFile() image?: CourseImageFile,
  ): Promise<Course> {
    return await this.courseService.save(createCourseDto, image);
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
    @UploadedFile() image?: CourseImageFile,
  ): Promise<Course> {
    return await this.courseService.update(id, updateCourseDto, image);
  }

  @Delete('/:id')
  @Roles(Role.Admin)
  async delete(@Param('id') id: string): Promise<string> {
    return await this.courseService.delete(id);
  }

  @Post('/:id/enrollment')
  @Roles(Role.User, Role.Editor, Role.Admin)
  async enroll(@Param('id') id: string, @Req() request: any) {
    return await this.courseService.enroll(id, request.user.userId);
  }

  @Delete('/:id/enrollment')
  @Roles(Role.User, Role.Editor, Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unenroll(@Param('id') id: string, @Req() request: any): Promise<void> {
    await this.courseService.unenroll(id, request.user.userId);
  }

  @Post('/:id/favorite')
  @Roles(Role.User)
  async favorite(@Param('id') id: string, @Req() request: any) {
    return await this.courseService.favorite(id, request.user.userId);
  }

  @Delete('/:id/favorite')
  @Roles(Role.User)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfavorite(
    @Param('id') id: string,
    @Req() request: any,
  ): Promise<void> {
    await this.courseService.unfavorite(id, request.user.userId);
  }

  @Post('/:id/contents')
  @Roles(Role.Admin, Role.Editor)
  async saveContent(
    @Param('id') id: string,
    @Body() createContentDto: CreateContentDto,
  ): Promise<Content> {
    return await this.contentService.save(id, createContentDto);
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
  ): Promise<Content> {
    return await this.contentService.update(id, contentId, updateContentDto);
  }

  @Delete('/:id/contents/:contentId')
  @Roles(Role.Admin)
  async deleteContent(
    @Param('id') id: string,
    @Param('contentId') contentId: string,
  ): Promise<string> {
    return await this.contentService.delete(id, contentId);
  }
}
