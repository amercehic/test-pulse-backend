import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponseDto } from '../dto/error-response.dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Extract the HTTP context
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Default to 500 if not an HttpException
    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    // Initialize the error response
    const errorResponse: ErrorResponseDto = {
      statusCode: status,
      error: 'Internal Server Error',
      messages: [],
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (exception instanceof HttpException) {
      // Use the status provided by the HttpException
      status = exception.getStatus();
      errorResponse.statusCode = status;

      // Get the response body from the exception
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        // If it's a string, use it directly as the error and wrap it in an array
        errorResponse.error = exception.name;
        errorResponse.messages = [exceptionResponse];
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        // If it's an object, look for properties like "message" and "error"
        const res = exceptionResponse as any;
        errorResponse.error = res.error || exception.name;
        // Make sure messages is an array (it might already be, or a single string)
        if (Array.isArray(res.message)) {
          errorResponse.messages = res.message;
        } else if (typeof res.message === 'string') {
          errorResponse.messages = [res.message];
        } else {
          // Fallback in case there’s no clear message property
          errorResponse.messages = [JSON.stringify(res)];
        }
      }
    } else if (exception instanceof Error) {
      // For non-HttpException errors (regular Errors), use their name and message
      errorResponse.error = exception.name;
      errorResponse.messages = [exception.message];
    } else {
      // Fallback for unknown error shapes
      errorResponse.messages = [String(exception)];
    }

    // Optionally include stack trace details when not in production
    if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
      errorResponse.stack = exception.stack;
    }

    // Return the JSON response with the proper HTTP status code
    response.status(status).json(errorResponse);
  }
}
