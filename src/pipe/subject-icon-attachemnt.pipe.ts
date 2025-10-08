import {
  PipeTransform,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Injectable()
export class SubjectIconPipe implements PipeTransform {
  transform(value: any) {
    if (!value) return true;

    const size = process.env.MAX_FILE_SIZE || 1024 * 1024;
    const fileSize = (value as Express.Multer.File)?.size;
    if (fileSize > Number(size)) {
      throw new HttpException(
        `File size must be less than ${size} bytes`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const mimeType = (value as Express.Multer.File)?.mimetype;

    if (mimeType !== 'image/png' && mimeType !== 'image/jpeg') {
      throw new HttpException(
        'File type must be png or jpeg',
        HttpStatus.BAD_REQUEST,
      );
    }

    return true;
  }
}
