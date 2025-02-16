import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';

import { StorageService } from '@/storage/services/storage.service';

const configValues: Record<string, string> = {
  DO_SPACES_KEY: 'dummyKey',
  DO_SPACES_SECRET: 'dummySecret',
  DO_SPACES_ENDPOINT: 'https://dummy.endpoint',
  DO_SPACES_REGION: 'dummy-region',
  DO_SPACES_BUCKET: 'dummy-bucket',
};

const configServiceMock = {
  get: jest.fn((key: string, _defaultValue?: any) => {
    return configValues[key];
  }),
};

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('StorageService', () => {
  let service: StorageService;
  let configService: ConfigService;
  let s3SendSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    configService = module.get<ConfigService>(ConfigService);
    s3SendSpy = jest.spyOn((service as any).s3, 'send');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload file and return a file key', async () => {
      (uuidv4 as jest.Mock).mockReturnValue('1234');
      const folder = 'org/images';
      const file: Express.Multer.File = {
        originalname: 'test.png',
        buffer: Buffer.from('dummy'),
        mimetype: 'image/png',
        size: 100,
        fieldname: 'file',
        encoding: '7bit',
        stream: new Readable({
          read() {
            /* no-op */
          },
        }),
        destination: '',
        filename: '',
        path: '',
      };

      s3SendSpy.mockResolvedValue({});

      const result = await service.uploadFile(file, folder);

      expect(uuidv4).toHaveBeenCalled();
      expect(s3SendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'dummy-bucket',
            Key: expect.stringContaining(`${folder}/1234-test.png`),
            Body: file.buffer,
            ContentType: file.mimetype,
          }),
        }),
      );
      expect(result).toContain(`${folder}/1234-test.png`);
    });

    it('should throw InternalServerErrorException when s3.send fails', async () => {
      (uuidv4 as jest.Mock).mockReturnValue('1234');
      const folder = 'org/images';
      const file: Express.Multer.File = {
        originalname: 'test.png',
        buffer: Buffer.from('dummy'),
        mimetype: 'image/png',
        size: 100,
        fieldname: 'file',
        encoding: '7bit',
        stream: new Readable({
          read() {},
        }),
        destination: '',
        filename: '',
        path: '',
      };

      s3SendSpy.mockRejectedValue(new Error('S3 error'));

      await expect(service.uploadFile(file, folder)).rejects.toThrow(
        new InternalServerErrorException('File upload failed'),
      );
    });
  });

  describe('getFileUrl', () => {
    it('should generate a signed URL for the given file key', async () => {
      const fileKey = 'org/images/1234-test.png';
      const expectedSignedUrl = 'https://dummy.endpoint/signed-url';
      (getSignedUrl as jest.Mock).mockResolvedValue(expectedSignedUrl);

      const result = await service.getFileUrl(fileKey);

      expect(getSignedUrl).toHaveBeenCalledWith(
        (service as any).s3,
        expect.any(GetObjectCommand),
        { expiresIn: 3600 },
      );
      expect(result).toEqual(expectedSignedUrl);
    });

    it('should throw InternalServerErrorException when getSignedUrl fails', async () => {
      const fileKey = 'org/images/1234-test.png';
      (getSignedUrl as jest.Mock).mockRejectedValue(new Error('Sign error'));

      await expect(service.getFileUrl(fileKey)).rejects.toThrow(
        new InternalServerErrorException('Could not generate signed URL'),
      );
    });
  });

  describe('constructor', () => {
    it('should throw InternalServerErrorException if required config is missing', async () => {
      (configService.get as jest.Mock).mockImplementation(
        (key: string, _defaultValue?: any) => {
          if (key === 'DO_SPACES_KEY') {
            return '';
          }
          return 'dummy';
        },
      );
      expect(() => new StorageService(configService)).toThrow(
        new InternalServerErrorException(
          'Missing DigitalOcean Spaces credentials',
        ),
      );
    });
  });
});
