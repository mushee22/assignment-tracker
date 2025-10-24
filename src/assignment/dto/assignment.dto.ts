import { AssignmentStatus, Priority } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class AssigneFindQuery {
  @IsOptional()
  @IsString()
  q?: string;

  @IsEnum(AssignmentStatus)
  @IsOptional()
  status?: AssignmentStatus;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsOptional()
  @IsString()
  start?: string;

  @IsOptional()
  @IsString()
  end?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  subject_id?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page_size?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  cursor?: number;

  @IsOptional()
  @IsString()
  sort?: string | string[];
}
