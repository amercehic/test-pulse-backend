export class ErrorResponseDto {
  statusCode: number;
  error: string;
  messages: string[]; // Array to support multiple error messages
  timestamp: string;
  path: string;
  stack?: string; // Optional field for stack trace in non-production environments
}
