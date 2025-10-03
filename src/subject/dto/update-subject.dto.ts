import { IsString, IsOptional } from 'class-validator';

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  color?: string;
}
