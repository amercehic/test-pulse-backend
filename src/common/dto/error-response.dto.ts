export class ErrorResponseDto {
  statusCode: number;
  error: string;
  messages: string[];
  timestamp: string;
  path: string;
  stack?: string;
}
