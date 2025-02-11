import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for handling file storage operations using DigitalOcean Spaces (S3-compatible storage)
 */
@Injectable()
export class StorageService {
  private s3: S3Client;
  private bucketName: string;

  /**
   * Creates an instance of StorageService.
   * Initializes the S3 client with DigitalOcean Spaces credentials from configuration.
   * @param configService - The NestJS ConfigService for accessing environment variables
   * @throws {InternalServerErrorException} When required DigitalOcean Spaces credentials are missing
   */
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
   * Uploads a file to DigitalOcean Spaces storage.
   * @param file - The file to upload (Multer file object)
   * @param folder - The folder path where the file should be stored
   * @returns Promise<string> - The public URL of the uploaded file
   * @throws {InternalServerErrorException} When file upload fails
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
