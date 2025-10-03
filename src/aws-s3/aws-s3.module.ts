import { Global, Module } from '@nestjs/common';
import { AwsS3Service } from './aws-s3.service';
import type { StorageModuleOptions } from './interface/storage-options.interface';
import { STORAGE_OPTIONS } from 'src/constant';

@Global()
@Module({})
export class AwsS3Module {
  static forRoot(options: StorageModuleOptions) {
    return {
      module: AwsS3Module,
      providers: [
        {
          provide: STORAGE_OPTIONS,
          useValue: options,
        },
        AwsS3Service,
      ],
      exports: [AwsS3Service],
    };
  }
}
