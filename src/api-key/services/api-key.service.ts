import { PrismaService } from '@db/prisma.service';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

import { CreateApiKeyDto } from '@/api-key/dto/create-api-key.dto';

@Injectable()
export class ApiKeyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateApiKeyDto, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      throw new UnauthorizedException('User must belong to an organization');
    }

    const apiKey = `tp_${randomUUID().replace(/-/g, '')}`;
    const hashedKey = await bcrypt.hash(apiKey, 10);

    const created = await this.prisma.apiKey.create({
      data: {
        name: dto.name,
        key: hashedKey,
        organizationId: user.organizationId,
        createdBy: userId,
      },
    });

    return {
      id: created.id,
      name: created.name,
      key: apiKey,
      createdAt: created.createdAt,
    };
  }

  async findAll(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      throw new UnauthorizedException('User must belong to an organization');
    }

    return this.prisma.apiKey.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastUsedAt: true,
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async regenerate(id: string, userId: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id },
      include: { user: { select: { organizationId: true } } },
    });

    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (user?.organizationId !== apiKey.user.organizationId) {
      throw new UnauthorizedException(
        'Cannot modify API key from another organization',
      );
    }

    const newKey = `tp_${randomUUID().replace(/-/g, '')}`;
    const hashedKey = await bcrypt.hash(newKey, 10);

    const updated = await this.prisma.apiKey.update({
      where: { id },
      data: { key: hashedKey },
    });

    return {
      id: updated.id,
      name: updated.name,
      key: newKey,
      createdAt: updated.createdAt,
    };
  }

  async remove(id: string, userId: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id },
      include: { user: { select: { organizationId: true } } },
    });

    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (user?.organizationId !== apiKey.user.organizationId) {
      throw new UnauthorizedException(
        'Cannot delete API key from another organization',
      );
    }

    await this.prisma.apiKey.delete({ where: { id } });

    return { message: `API key ${apiKey.name} deleted successfully` };
  }

  async validateApiKey(key: string) {
    const apiKeys = await this.prisma.apiKey.findMany({
      select: {
        key: true,
        organizationId: true,
      },
    });

    for (const apiKey of apiKeys) {
      const isValid = await bcrypt.compare(key, apiKey.key);
      if (isValid) {
        await this.prisma.apiKey.updateMany({
          where: { key: apiKey.key },
          data: { lastUsedAt: new Date() },
        });
        return { organizationId: apiKey.organizationId };
      }
    }

    return null;
  }
}
