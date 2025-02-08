import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private s3: S3Client;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('DO_SPACES_KEY', '');
    const secretAccessKey = this.configService.get<string>(
      'DO_SPACES_SECRET',
      '',
    );
    const endpoint = this.configService.get<string>('DO_SPACES_ENDPOINT', '');
    const region = this.configService.get<string>('DO_SPACES_REGION', 'fra1');
    const bucket = this.configService.get<string>('DO_SPACES_BUCKET', '');

    if (!accessKeyId || !secretAccessKey || !endpoint || !bucket) {
      throw new InternalServerErrorException(
        'Missing DigitalOcean Spaces credentials',
      );
    }

    this.s3 = new S3Client({
      region,
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });

    this.bucketName = bucket;
  }

  /**
   * ✅ Upload a file to DigitalOcean Spaces
   */
  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    try {
      const fileKey = `${folder}/${uuidv4()}-${file.originalname}`;

      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: fileKey,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read',
        }),
      );

      return `${this.configService.get<string>('DO_SPACES_ENDPOINT')}/${fileKey}`;
    } catch (error) {
      throw new InternalServerErrorException('File upload failed');
    }
  }
}
