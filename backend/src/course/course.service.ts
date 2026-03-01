import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { basename, extname, join } from 'path';
import { ILike, In } from 'typeorm';

import { CourseEnrollment } from './course-enrollment.entity';
import { CreateCourseDto, UpdateCourseDto } from './course.dto';
import { Course } from './course.entity';
import { CourseQuery } from './course.query';
import { UserFavorite } from './user-favorite.entity';

type CourseImageFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class CourseService {
  async save(
    createCourseDto: CreateCourseDto,
    image?: CourseImageFile,
  ): Promise<Course> {
    const imageUrl = image ? await this.storeCourseImage(image) : null;

    return await Course.create({
      name: createCourseDto.name,
      description: createCourseDto.description,
      imageUrl,
      dateCreated: new Date(),
    }).save();
  }

  async findAll(
    query: CourseQuery,
    userId?: string,
  ): Promise<{ data: Course[]; total: number; page: number; limit: number }> {
    const {
      name,
      description,
      favoritesOnly = false,
      page = 1,
      limit = 10,
      sortBy = 'dateCreated',
      sortOrder = 'DESC',
    } = query;

    const where: any = {};

    if (name) {
      where.name = ILike(`%${name}%`);
    }

    if (description) {
      where.description = ILike(`%${description}%`);
    }

    if (favoritesOnly) {
      if (!userId) {
        return { data: [], total: 0, page, limit };
      }

      const favoriteCourseIds = await this.findFavoriteCourseIdsByUser(userId);
      if (favoriteCourseIds.size < 1) {
        return { data: [], total: 0, page, limit };
      }

      where.id = In(Array.from(favoriteCourseIds));
    }

    const [data, total] = await Course.findAndCount({
      where,
      order: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    if (data.length < 1) {
      return { data, total, page, limit };
    }

    const courseIds = data.map((course) => course.id);
    const enrolledCourseIds = new Set<string>();
    const enrollmentCountByCourseId = await this.findEnrollmentCountByCourseIds(
      courseIds,
    );
    const favoriteCourseIds = userId
      ? await this.findFavoriteCourseIdsByUser(userId, courseIds)
      : new Set<string>();

    if (userId) {
      const enrollments = await CourseEnrollment.find({
        where: { userId, courseId: In(courseIds) },
      });

      for (const enrollment of enrollments) {
        enrolledCourseIds.add(enrollment.courseId);
      }
    }

    const dataWithFlags = data.map((course) => {
      course.isEnrolled = userId ? enrolledCourseIds.has(course.id) : false;
      course.isFavorite = userId ? favoriteCourseIds.has(course.id) : false;
      course.enrolledUsersCount = enrollmentCountByCourseId.get(course.id) ?? 0;
      return course;
    });

    return { data: dataWithFlags, total, page, limit };
  }

  async findById(id: string, userId?: string): Promise<Course> {
    const course = await Course.findOne(id);

    if (!course) {
      throw new HttpException(
        `Could not find course with matching id ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }

    course.enrolledUsersCount = await CourseEnrollment.count({
      where: { courseId: id },
    });

    if (userId) {
      const enrollment = await CourseEnrollment.findOne({
        where: { courseId: id, userId },
      });
      const favorite = await UserFavorite.findOne({
        where: { courseId: id, userId },
      });

      course.isEnrolled = Boolean(enrollment);
      course.isFavorite = Boolean(favorite);
    } else {
      course.isEnrolled = false;
      course.isFavorite = false;
    }

    return course;
  }

  async update(
    id: string,
    updateCourseDto: UpdateCourseDto,
    image?: CourseImageFile,
  ): Promise<Course> {
    const course = await this.findById(id);

    let nextImageUrl: string | null = course.imageUrl ?? null;

    if (image) {
      await this.deleteCourseImage(course.imageUrl);
      nextImageUrl = await this.storeCourseImage(image);
    } else if (updateCourseDto.removeImage) {
      await this.deleteCourseImage(course.imageUrl);
      nextImageUrl = null;
    }

    return await Course.create({
      id: course.id,
      name: updateCourseDto.name ?? course.name,
      description: updateCourseDto.description ?? course.description,
      imageUrl: nextImageUrl,
    }).save();
  }

  async delete(id: string): Promise<string> {
    const course = await this.findById(id);

    await this.deleteCourseImage(course.imageUrl);
    await CourseEnrollment.delete({ courseId: id });
    await UserFavorite.delete({ courseId: id });
    await Course.delete(course);

    return id;
  }

  async count(): Promise<number> {
    return await Course.count();
  }

  async enroll(courseId: string, userId: string): Promise<CourseEnrollment> {
    await this.findById(courseId);

    const existingEnrollment = await CourseEnrollment.findOne({
      where: { courseId, userId },
    });

    if (existingEnrollment) {
      return existingEnrollment;
    }

    return await CourseEnrollment.create({
      courseId,
      userId,
    }).save();
  }

  async unenroll(courseId: string, userId: string): Promise<void> {
    await this.findById(courseId);
    await CourseEnrollment.delete({ courseId, userId });
  }

  async favorite(courseId: string, userId: string): Promise<UserFavorite> {
    await this.findById(courseId);

    const existingFavorite = await UserFavorite.findOne({
      where: { courseId, userId },
    });

    if (existingFavorite) {
      return existingFavorite;
    }

    return await UserFavorite.create({
      courseId,
      userId,
    }).save();
  }

  async unfavorite(courseId: string, userId: string): Promise<void> {
    await this.findById(courseId);
    await UserFavorite.delete({ courseId, userId });
  }

  private async findEnrollmentCountByCourseIds(
    courseIds: string[],
  ): Promise<Map<string, number>> {
    if (courseIds.length < 1) {
      return new Map();
    }

    const rawCounts = await CourseEnrollment.createQueryBuilder('enrollment')
      .select('enrollment.courseId', 'courseId')
      .addSelect('COUNT(*)', 'count')
      .where('enrollment.courseId IN (:...courseIds)', { courseIds })
      .groupBy('enrollment.courseId')
      .getRawMany<{ courseId: string; count: string }>();

    const countByCourseId = new Map<string, number>();

    for (const row of rawCounts) {
      countByCourseId.set(row.courseId, Number(row.count));
    }

    return countByCourseId;
  }

  private async findFavoriteCourseIdsByUser(
    userId: string,
    courseIds?: string[],
  ): Promise<Set<string>> {
    if (!userId) {
      return new Set();
    }

    const where: any = { userId };

    if (courseIds && courseIds.length > 0) {
      where.courseId = In(courseIds);
    }

    const favorites = await UserFavorite.find({ where });
    return new Set(favorites.map((favorite) => favorite.courseId));
  }

  private async storeCourseImage(file: CourseImageFile): Promise<string> {
    this.validateCourseImage(file);

    const uploadsDir = this.getCourseUploadsDir();
    await mkdir(uploadsDir, { recursive: true });

    const imageExtension = this.resolveImageExtension(file);
    const filename = `${Date.now()}-${randomUUID()}${imageExtension}`;
    const absolutePath = join(uploadsDir, filename);

    await writeFile(absolutePath, file.buffer);

    return `/api/uploads/courses/${filename}`;
  }

  private async deleteCourseImage(imageUrl?: string): Promise<void> {
    if (!imageUrl) {
      return;
    }

    const cleanImageUrl = imageUrl.split('?')[0];
    const filename = basename(cleanImageUrl);

    if (!filename) {
      return;
    }

    const absolutePath = join(this.getCourseUploadsDir(), filename);

    try {
      await unlink(absolutePath);
    } catch (error) {
      // Ignore file-not-found and continue with business flow.
    }
  }

  private validateCourseImage(file: CourseImageFile): void {
    if (!file?.buffer) {
      throw new HttpException(
        'Course image file is invalid',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      throw new HttpException(
        'Only JPG, PNG and WEBP images are allowed',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new HttpException(
        'Course image must be 5MB or less',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private resolveImageExtension(file: CourseImageFile): string {
    if (file.mimetype === 'image/jpeg') {
      return '.jpg';
    }

    if (file.mimetype === 'image/png') {
      return '.png';
    }

    if (file.mimetype === 'image/webp') {
      return '.webp';
    }

    const extension = extname(file.originalname).toLowerCase();

    return extension || '.jpg';
  }

  private getCourseUploadsDir(): string {
    return join(process.cwd(), 'uploads', 'courses');
  }
}
