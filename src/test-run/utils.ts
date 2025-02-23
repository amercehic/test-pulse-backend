import { createHash } from 'crypto';

export function generateTestIdentifier(
  suite: string | null | undefined,
  name: string,
  organizationId: string,
): string {
  const suitePrefix = suite ? `${suite}:` : '';
  return createHash('md5')
    .update(`${organizationId}:${suitePrefix}${name}`)
    .digest('hex');
}
