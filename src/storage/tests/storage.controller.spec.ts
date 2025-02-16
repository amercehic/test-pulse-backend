import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { EitherAuthGuard } from '@/common/guards/either-auth.guard';
import { StorageController } from '@/storage/controllers/storage.controller';
import { StorageService } from '@/storage/services/storage.service';
import { ExtendedRequest } from '@/test-run/types/extended-request.type';

describe('StorageController', () => {
  let controller: StorageController;
  let storageService: StorageService;

  const mockStorageService = {
    uploadFile: jest.fn(),
    getFileUrl: jest.fn(),
  };

  const dummyOrgId = 'org-123';

  const createExtendedRequest = (orgId?: string, user?: any): ExtendedRequest =>
    ({
      organizationId: orgId,
      user: user || (orgId ? { organizationId: orgId } : undefined),
    }) as ExtendedRequest;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageController],
      providers: [{ provide: StorageService, useValue: mockStorageService }],
    })
      .overrideGuard(EitherAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<StorageController>(StorageController);
    storageService = module.get<StorageService>(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should throw UnauthorizedException if organization ID is not found', async () => {
      const req = createExtendedRequest(undefined);
      const file = {} as Express.Multer.File;
      await expect(controller.uploadFile(file, req)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should use "videos" subfolder for video mimetype', async () => {
      const file: Express.Multer.File = {
        originalname: 'video.mp4',
        buffer: Buffer.from('dummy'),
        mimetype: 'video/mp4',
        size: 100,
        fieldname: 'file',
        encoding: '7bit',
        stream: {} as any,
        destination: '',
        filename: '',
        path: '',
      };
      const req = createExtendedRequest(dummyOrgId);
      const expectedFolder = `${dummyOrgId}/videos`;
      mockStorageService.uploadFile.mockResolvedValue('file-key-video');

      const result = await controller.uploadFile(file, req);

      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
        file,
        expectedFolder,
      );
      expect(result).toEqual({ fileKey: 'file-key-video' });
    });

    it('should use "images" subfolder for image mimetype', async () => {
      const file: Express.Multer.File = {
        originalname: 'image.png',
        buffer: Buffer.from('dummy'),
        mimetype: 'image/png',
        size: 100,
        fieldname: 'file',
        encoding: '7bit',
        stream: {} as any,
        destination: '',
        filename: '',
        path: '',
      };
      const req = createExtendedRequest(dummyOrgId);
      const expectedFolder = `${dummyOrgId}/images`;
      mockStorageService.uploadFile.mockResolvedValue('file-key-image');

      const result = await controller.uploadFile(file, req);

      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
        file,
        expectedFolder,
      );
      expect(result).toEqual({ fileKey: 'file-key-image' });
    });

    it('should use "others" subfolder for non-image/video mimetype', async () => {
      const file: Express.Multer.File = {
        originalname: 'doc.pdf',
        buffer: Buffer.from('dummy'),
        mimetype: 'application/pdf',
        size: 100,
        fieldname: 'file',
        encoding: '7bit',
        stream: {} as any,
        destination: '',
        filename: '',
        path: '',
      };
      const req = createExtendedRequest(dummyOrgId);
      const expectedFolder = `${dummyOrgId}/others`;
      mockStorageService.uploadFile.mockResolvedValue('file-key-pdf');

      const result = await controller.uploadFile(file, req);

      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
        file,
        expectedFolder,
      );
      expect(result).toEqual({ fileKey: 'file-key-pdf' });
    });
  });

  describe('downloadFile', () => {
    it('should throw UnauthorizedException if organization ID is not found', async () => {
      const req = createExtendedRequest(undefined);
      await expect(controller.downloadFile('any-key', req)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if fileKey does not start with organization folder', async () => {
      const req = createExtendedRequest(dummyOrgId);
      const fileKey = 'other-org/file.png';
      await expect(controller.downloadFile(fileKey, req)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should generate a signed URL if fileKey belongs to the organization', async () => {
      const req = createExtendedRequest(dummyOrgId);
      const fileKey = `${dummyOrgId}/images/file.png`;
      mockStorageService.getFileUrl.mockResolvedValue('signed-url');

      const result = await controller.downloadFile(fileKey, req);

      expect(mockStorageService.getFileUrl).toHaveBeenCalledWith(fileKey);
      expect(result).toEqual({ url: 'signed-url' });
    });
  });
});
