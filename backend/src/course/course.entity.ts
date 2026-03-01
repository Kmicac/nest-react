import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Content } from '../content/content.entity';

@Entity()
export class Course extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ nullable: true })
  imageUrl?: string;

  isEnrolled?: boolean;

  isFavorite?: boolean;

  enrolledUsersCount?: number;

  @Column()
  dateCreated: Date;

  @OneToMany(() => Content, (content) => content.course)
  contents: Content[];
}
