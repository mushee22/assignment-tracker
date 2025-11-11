import { Injectable } from '@nestjs/common';
import { Attachment } from '@prisma/client';
import { AwsS3Service } from 'src/aws-s3/aws-s3.service';
import { UploadResult } from 'src/aws-s3/interface/upload-interface';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AttachmentService {
  constructor(
    private readonly awsS3Service: AwsS3Service,
    private readonly prismaService: PrismaService,
  ) {}
  async uploadAttachent(
    file: Express.Multer.File[],
    referanceId: number,
    referanceModel: string,
    folderName: string,
  ) {
    try {
      const uploadedFiles = await this.awsS3Service.uploadFiles(
        file,
        folderName,
      );
      const savedFiles = await this.saveUploadedFilesInDb(
        uploadedFiles,
        referanceId,
        referanceModel,
      );
      return savedFiles;
    } catch (error) {
      console.log(error);
    }
  }

  async deleteAttachementByIds(ids: number[]) {
    try {
      const attachement = await this.prismaService.attachment.findMany({
        where: {
          id: {
            in: ids,
          },
        },
      });
      const deleteStorageKeys = attachement
        .filter((attachment) => attachment.storage_key !== null)
        .map((attachment) => attachment.storage_key!);
      this.awsS3Service.deleteFile(deleteStorageKeys);
      await this.prismaService.attachment.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });
    } catch (error) {
      console.log(error);
    }
  }

  async deleteAttachmentsByModelFromDb(
    referenceIds: number[],
    referanceModel: string,
  ) {
    try {
      const attachemntTodelete = await this.prismaService.attachment.findMany({
        where: {
          reference_id: {
            in: referenceIds,
          },
          reference_model: referanceModel,
        },
      });

      const deleteStorageKeys = attachemntTodelete
        .filter((attachment) => attachment.storage_key !== null)
        .map((attachment) => attachment.storage_key!);
      this.awsS3Service.deleteFile(deleteStorageKeys);

      await this.prismaService.attachment.deleteMany({
        where: {
          id: {
            in: referenceIds,
          },
        },
      });

      return attachemntTodelete.length;
    } catch (error) {
      console.log(error);
    }
  }

  async getAttachmentByReferanceId(
    referanceId: number,
    referanceModel: string,
  ) {
    const attachemnt = await this.prismaService.attachment.findMany({
      where: {
        reference_id: referanceId,
        reference_model: referanceModel,
      },
    });

    const attachmentWithPresignedUrl =
      await this.getAttachmentWithPresignedUrl(attachemnt);

    return attachmentWithPresignedUrl;
  }

  private async getAttachmentWithPresignedUrl(attachements: Attachment[]) {
    for (const attachment of attachements) {
      if (attachment.storage_key) {
        const presignedUrl = await this.awsS3Service.getSignedUrl(
          attachment.storage_key,
          attachment.file_type,
        );
        attachment.storage_path = presignedUrl ?? '';
      }
    }
  }

  private async saveUploadedFilesInDb(
    uploadedFiles: UploadResult[],
    referanceId: number,
    referanceModel: string,
  ) {
    return await this.prismaService.attachment.createManyAndReturn({
      data: uploadedFiles.map((file) => ({
        reference_id: referanceId,
        reference_model: referanceModel,
        file_name: file.file_name ?? '',
        file_type: file.file_type,
        file_size: file.file_size,
        storage_type: file.storage_type,
        storage_path: (process.env.AWS_S3_BUCKET_URL ?? '') + file.storage_key,
        storage_key: file.storage_key,
      })),
    });
  }
}
