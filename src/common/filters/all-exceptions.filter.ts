import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { ErrorResponseDto } from '@/common/dto/error-response.dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse: ErrorResponseDto = {
      statusCode: status,
      error: 'Internal Server Error',
      messages: [],
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      errorResponse.statusCode = status;

      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        errorResponse.error = exception.name;
        errorResponse.messages = [exceptionResponse];
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const res = exceptionResponse as any;
        errorResponse.error = res.error || exception.name;
        if (Array.isArray(res.message)) {
          errorResponse.messages = res.message;
        } else if (typeof res.message === 'string') {
          errorResponse.messages = [res.message];
        } else {
          errorResponse.messages = [JSON.stringify(res)];
        }
      }
    } else if (exception instanceof Error) {
      errorResponse.error = exception.name;
      errorResponse.messages = [exception.message];
    } else {
      errorResponse.messages = [String(exception)];
    }

    if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
      errorResponse.stack = exception.stack;
    }

    response.status(status).json(errorResponse);
  }
}
