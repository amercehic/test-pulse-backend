export class CreateTestResultDto {
  framework: string; // "playwright", "cypress", etc.
  status: string; // "passed", "failed"
  logs?: string[]; // optional logs or additional info
}
