import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCourseDto {
  @ApiProperty({
    example: 'Docker Fundamentals',
    description: 'Course display name',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Hands-on containerization course for beginners',
    description: 'Course short description',
  })
  @IsNotEmpty()
  @IsString()
  description: string;
}

export class UpdateCourseDto {
  @ApiPropertyOptional({
    example: 'Docker Fundamentals - Updated',
    description: 'Updated course display name',
  })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated course description',
    description: 'Updated course short description',
  })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Set true to remove the current course image when no new image is uploaded',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  removeImage?: boolean;
}
