import { IsString } from 'class-validator';

export class CreateSubjectDto {
  @IsString({
    message: 'Name must be a string',
  })
  name: string;

  @IsString({
    message: 'Color must be a string',
  })
  color?: string;
}
