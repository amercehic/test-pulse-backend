import { createHash } from 'crypto';

export function generateTestIdentifier(
  suite: string | null | undefined,
  name: string,
): string {
  const suitePrefix = suite ? `${suite}:` : '';
  return createHash('md5').update(`${suitePrefix}${name}`).digest('hex');
}
