import { Request } from 'express';

export interface ExtendedRequest extends Request {
  organizationId?: string;
}
