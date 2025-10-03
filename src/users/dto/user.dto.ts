import { Role } from '@prisma/client';

export class UserCreateDto {
  email: string;
  hashed_password: string;
  name: string;
  phone: string;
  is_verified: boolean;
  role: Role;
}

export class UserDeviceTokenDto {
  device_token: string;
  device_type: string;
  device_id?: string;
  device_model?: string;
}
