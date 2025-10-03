import {
  PipeTransform,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Injectable()
export class AssignmentAttachmentPipe implements PipeTransform {
  transform(value: any) {
    if (!value) return true;

    if (!Array.isArray(value)) {
      const size = process.env.MAX_FILE_SIZE || 20 * 1024 * 1024; //20MB
      const fileSize = (value as Express.Multer.File)?.size;
      if (fileSize > Number(size)) {
        throw new HttpException(
          `File size must be less than ${size} bytes`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    for (const file of value as Array<Express.Multer.File>) {
      const size = process.env.MAX_FILE_SIZE || 20 * 1024 * 1024; //20MB
      const fileSize = file?.size;
      if (fileSize > Number(size)) {
        throw new HttpException(
          `File size must be less than ${size} bytes`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    return true;
  }
}
