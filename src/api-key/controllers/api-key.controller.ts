import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '@/auth/types/user-with-roles';

import { CreateApiKeyDto } from '../dto/create-api-key.dto';
import { ApiKeyService } from '../services/api-key.service';

@ApiTags('API Keys')
@ApiBearerAuth()
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new API key' })
  create(@Body() createApiKeyDto: CreateApiKeyDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.apiKeyService.create(createApiKeyDto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List API keys for the organization' })
  findAll(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.apiKeyService.findAll(user.userId);
  }

  @Patch(':id/regenerate')
  @ApiOperation({ summary: 'Regenerate an API key' })
  regenerate(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.apiKeyService.regenerate(id, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an API key' })
  remove(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.apiKeyService.remove(id, user.userId);
  }
}
