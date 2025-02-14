import { PrismaService } from '@db/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search<T, K extends keyof PrismaService>(options: {
    model: K;
    searchFields: string[];
    searchTerm: string;
    where?: Record<string, any>;
    include?: Record<string, any>;
    limit?: number;
  }): Promise<T[]> {
    const {
      model,
      searchFields,
      searchTerm,
      where = {},
      include,
      limit = 10,
    } = options;

    const searchConditions = searchFields.map((field) => ({
      [field]: { contains: searchTerm, mode: 'insensitive' as const },
    }));

    const results = await (this.prisma[model] as any).findMany({
      where: {
        AND: [
          where,
          {
            OR: searchConditions,
          },
        ],
      },
      include,
      take: limit,
    });

    return results as T[];
  }
}
