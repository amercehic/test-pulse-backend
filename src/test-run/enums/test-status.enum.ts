export enum TestRunStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  ERROR = 'error',
}

export enum TestExecutionStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  CANCELLED = 'cancelled',
  BLOCKED = 'blocked',
  TIMEOUT = 'timeout',
  ERROR = 'error',
  FLAKY = 'flaky',
  QUARANTINED = 'quarantined',
}
