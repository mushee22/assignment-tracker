import { StorageType } from '@prisma/client';

export interface UploadResult {
  file_name: string;
  file_type: string;
  file_size: number;
  storage_type: StorageType;
  storage_path?: string;
  storage_key?: string;
}
