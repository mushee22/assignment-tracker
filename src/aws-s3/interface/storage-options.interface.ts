import { StorageType } from '@prisma/client';

export type StorageModuleOptions = {
  location: StorageType;
  s3_bucket_name?: string;
  s3_region?: string;
  s3_access_key_id?: string;
  s3_secret_access_key?: string;
  s3_endpoint?: string;
  base_url?: string;
  local_storage_location?: string;
};
