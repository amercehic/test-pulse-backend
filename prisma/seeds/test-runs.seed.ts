import {
  PrismaClient,
  TestRunStatus,
  TestExecutionStatus,
} from '@prisma/client';
import { generateTestIdentifier } from '../../src/test-run/utils';

export default async function seedTestRuns(prisma: PrismaClient) {
  try {
    // Get both organizations
    const organizations = await prisma.organization.findMany({
      where: {
        name: {
          in: ['Example Organization', 'Second Organization'],
        },
      },
    });

    // Common test suites
    const suites = [
      'Authentication',
      'User Profile',
      'Dashboard',
      'API Integration',
      'Payment Processing',
    ];

    // Create test runs for each organization
    for (const organization of organizations) {
      const testRunsData = [
        {
          name: `Regression Test Suite - Chrome - ${organization.name}`,
          status: 'completed' as TestRunStatus,
          duration: 1250.45,
          commit: '8f62d46a',
          branch: 'main',
          framework: 'Cypress',
          browser: 'Chrome',
          browserVersion: '120.0.0',
          platform: 'Windows',
          triggeredBy:
            organization.name === 'Example Organization'
              ? 'user@example.com'
              : 'user2@example.com',
        },
        {
          name: 'Smoke Test Suite - Firefox',
          status: 'completed' as TestRunStatus,
          duration: 450.3,
          commit: '9a62c42b',
          branch: 'feature/new-auth',
          framework: 'Playwright',
          browser: 'Firefox',
          browserVersion: '115.0.0',
          platform: 'Linux',
          triggeredBy: 'user@example.com',
        },
        {
          name: 'Failed Test Run - Safari',
          status: 'failed' as TestRunStatus,
          duration: 892.15,
          commit: '7d52b39c',
          branch: 'fix/payment-issue',
          framework: 'WebdriverIO',
          browser: 'Safari',
          browserVersion: '16.0.0',
          platform: 'MacOS',
          triggeredBy: 'user@example.com',
        },
      ];

      for (const testRunData of testRunsData) {
        const testRun = await prisma.testRun.create({
          data: {
            ...testRunData,
            organizationId: organization.id,
          },
        });

        // Create test executions for each test run
        const testExecutionsData: any[] = [];

        // Generate varied test executions
        suites.forEach((suite) => {
          // Add multiple tests per suite with different statuses
          const testsPerSuite = Math.floor(Math.random() * 5) + 3; // 3-7 tests per suite

          for (let i = 0; i < testsPerSuite; i++) {
            const statusOptions = getStatusOptionsForTestRun(
              testRunData.status as TestRunStatus,
            );
            const status =
              statusOptions[Math.floor(Math.random() * statusOptions.length)];

            const testExecution = {
              testRunId: testRun.id,
              name: `${suite} Test ${i + 1}`,
              suite: suite,
              description: `Automated test for ${suite.toLowerCase()} functionality`,
              identifier: generateTestIdentifier(
                suite,
                `Test ${i + 1}`,
                organization.id,
              ),
              attempt: 1,
              status: status,
              duration: status === 'failed' ? null : Math.random() * 60 + 10, // 10-70 seconds
              startedAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
              completedAt: status !== 'running' ? new Date() : null,
              errorMessage: status === 'failed' ? generateErrorMessage() : null,
              stackTrace: status === 'failed' ? generateStackTrace() : null,
              logs: generateLogs(status),
            };

            testExecutionsData.push(testExecution);
          }
        });

        // Create all test executions for this run
        await prisma.testExecution.createMany({
          data: testExecutionsData,
        });
      }
    }

    console.log(
      '✅ Test runs and executions seeded successfully for all organizations',
    );
  } catch (error) {
    console.error('❌ Error seeding test runs:', error);
    process.exit(1);
  }
}

// Helper functions
function getStatusOptionsForTestRun(
  testRunStatus: TestRunStatus,
): TestExecutionStatus[] {
  switch (testRunStatus) {
    case 'completed':
      return ['passed', 'skipped', 'flaky'] as TestExecutionStatus[];
    case 'failed':
      return ['failed', 'error', 'timeout'] as TestExecutionStatus[];
    default:
      return ['passed', 'failed'] as TestExecutionStatus[];
  }
}

function generateErrorMessage(): string {
  const errors = [
    'Element not found in DOM',
    'Timeout waiting for selector ".submit-button"',
    'Network request failed',
    'Expected "success" but received "error"',
    'Cannot read property "value" of undefined',
  ];
  return errors[Math.floor(Math.random() * errors.length)];
}

function generateStackTrace(): string {
  return `Error: Test Failed
    at Object.executeTest (/tests/auth/login.spec.ts:42:12)
    at runTest (/framework/runner.ts:123:45)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)`;
}

function generateLogs(status: TestExecutionStatus): string {
  const logs = [
    '[info] Starting test execution',
    '[debug] Setting up test environment',
    '[info] Navigating to test page',
  ];

  if (status === 'failed') {
    logs.push(
      '[error] Failed to find element',
      '[debug] Current DOM state:',
      '[error] Test execution failed',
    );
  } else if (status === 'passed') {
    logs.push(
      '[info] Test assertions completed',
      '[debug] Cleaning up test environment',
      '[info] Test passed successfully',
    );
  }

  return logs.join('\n');
}
