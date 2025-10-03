import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SaveDeviceTokenDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  @IsString()
  device_id: string;

  @IsOptional()
  @IsString()
  device_model?: string;

  @IsOptional()
  @IsString()
  device_type?: string;
}
