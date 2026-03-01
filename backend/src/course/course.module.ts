import { forwardRef, Module } from '@nestjs/common';

import { AuditLogModule } from '../audit-log/audit-log.module';
import { ContentModule } from '../content/content.module';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';

@Module({
  imports: [forwardRef(() => ContentModule), AuditLogModule],
  controllers: [CourseController],
  providers: [CourseService],
  exports: [CourseService],
})
export class CourseModule {}
