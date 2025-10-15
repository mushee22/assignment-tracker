import { Inject, Injectable } from '@nestjs/common';
import { STORAGE_OPTIONS } from 'src/constant';
import type { StorageModuleOptions } from './interface/storage-options.interface';
import AWS from 'aws-sdk';
import type { S3 } from 'aws-sdk';
import type { UploadResult } from './interface/upload-interface';
import { StorageType } from '@prisma/client';

@Injectable()
export class AwsS3Service {
  private s3: S3;

  constructor(
    @Inject(STORAGE_OPTIONS)
    private storageOptions: StorageModuleOptions,
  ) {
    if (this.storageOptions.location === 'S3_BUCKET') {
      this.initS3();
    }
  }

  private initS3() {
    this.s3 = new AWS.S3({
      accessKeyId: this.storageOptions.s3_access_key_id,
      secretAccessKey: this.storageOptions.s3_secret_access_key,
      region: this.storageOptions.s3_region,
    });
  }

  private generateUniqueFileName(fileName: string, folderName: string) {
    const defaultFolder = this.storageOptions.s3_default_folder
      ? `/${this.storageOptions.s3_default_folder}`
      : '';
    return `${defaultFolder}/${folderName}/${Date.now()}-${fileName}`;
  }

  private async generatePresignedUrl(data: Partial<S3.PutObjectRequest>) {
    const params = {
      Expires: 60 * 5,
      ...data,
      Bucket: this.storageOptions.s3_bucket_name,
    };
    return await this.s3.getSignedUrlPromise('putObject', params);
  }

  private async upLoadFilesToS3(
    files: Express.Multer.File[],
    folderName: string,
  ) {
    const presignedUrls: UploadResult[] = [];
    for (const file of files) {
      const filname = await this.putObjectToS3(
        file.buffer,
        file.originalname,
        file.mimetype,
        folderName,
      );
      presignedUrls.push({
        file_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        storage_type: StorageType.S3_BUCKET,
        storage_path: folderName,
        storage_key: filname,
      });
    }
    return presignedUrls;
  }

  private async putObjectToS3(
    file: Buffer,
    fileName: string,
    fileType: string,
    folderName: string,
  ) {
    const filname = this.generateUniqueFileName(fileName, folderName);
    const presignedUrl = await this.generatePresignedUrl({
      Key: filname,
      ContentType: fileType,
    });
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: file as BodyInit,
    });
    if (response.ok) {
      return filname;
    }
    throw new Error('Failed to upload file to S3');
  }

  private removeObjectFromS3(key: string[]) {
    return this.s3.deleteObjects({
      Bucket: this.storageOptions.s3_bucket_name ?? '',
      Delete: {
        Objects: key.map((k) => ({ Key: k })),
      },
    });
  }

  async uploadFiles(files: Express.Multer.File[], folderName: string) {
    let saveFileUrl: UploadResult[] = [];
    saveFileUrl = await this.upLoadFilesToS3(files, folderName);
    return saveFileUrl;
  }

  deleteFile(key: string[]) {
    switch (this.storageOptions.location) {
      case 'LOCAL':
        break;
      case 'S3_BUCKET':
        return this.removeObjectFromS3(key);
      default:
        break;
    }
  }
}
