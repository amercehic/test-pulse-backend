import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { EitherAuthGuard } from '@/common/guards/either-auth.guard';
import { StorageService } from '@/storage/services/storage.service';
import { ExtendedRequest } from '@/test-run/types/extended-request.type';

@ApiTags('Storage')
@ApiBearerAuth()
@Controller('storage')
@UseGuards(EitherAuthGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file to storage' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: ExtendedRequest,
  ): Promise<{ fileKey: string }> {
    const organizationId =
      (req.user && (req.user as any).organizationId) || req.organizationId;
    if (!organizationId) {
      throw new UnauthorizedException('Organization ID not found');
    }

    let subfolder = 'others';
    if (file.mimetype.startsWith('video/')) {
      subfolder = 'videos';
    } else if (file.mimetype.startsWith('image/')) {
      subfolder = 'images';
    }

    const folder = `${organizationId}/${subfolder}`;
    const fileKey = await this.storageService.uploadFile(file, folder);
    return { fileKey };
  }

  /**
   * Generates a signed URL to download a file.
   * Validates that the file key belongs to the authenticated user's organization.
   */
  @Get('download')
  @ApiOperation({ summary: 'Generate a signed URL for file download' })
  @ApiQuery({
    name: 'fileKey',
    description: 'The key/path of the file in the bucket',
  })
  async downloadFile(
    @Query('fileKey') fileKey: string,
    @Req() req: ExtendedRequest,
  ): Promise<{ url: string }> {
    const organizationId =
      (req.user && (req.user as any).organizationId) || req.organizationId;
    if (!organizationId) {
      throw new UnauthorizedException('Organization ID not found');
    }

    if (!fileKey.startsWith(`${organizationId}/`)) {
      throw new UnauthorizedException('Access to this file is not allowed');
    }

    const url = await this.storageService.getFileUrl(fileKey);
    return { url };
  }
}
