import { IsNotEmpty, IsBoolean, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAssignmentScheduleDto {
  @IsNotEmpty()
  @ApiProperty({
    description: 'The status of the assignment schedule',
    example: true,
  })
  @IsBoolean()
  status: boolean;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The schedule of the assignment schedule',
    example: '24_HOURS',
    examples: [
      {
        value: '24_HOURS',
        description: '24 hours before the assignment is due',
      },
      {
        value: '48_HOURS',
      },
      {
        value: '7_DAYS',
        description: '7 days before the assignment is due',
      },
    ],
  })
  schedule: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The type of the assignment schedule',
    example: 'BEFORE',
  })
  type: 'BEFORE' | 'AFTER';
}

export class UpdateAssignmentScheduleDto {
  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({
    description: 'The status of the assignment schedule',
    example: true,
  })
  status: boolean;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The schedule of the assignment schedule',
    examples: [
      {
        value: '24_HOURS',
        description: '24 hours before the assignment is due',
      },
      {
        value: '48_HOURS',
      },
    ],
    example: '24_HOURS',
  })
  schedule: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The type of the assignment schedule',
    example: 'BEFORE',
  })
  type?: string;
}

export class RemoveReminderScheduleDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The schedule of the assignment schedule',
    example: '24_HOURS',
    examples: [
      {
        value: '24_HOURS',
        description: '24 hours before the assignment is due',
      },
      {
        value: '48_HOURS',
      },
    ],
  })
  schedule: string;
}
