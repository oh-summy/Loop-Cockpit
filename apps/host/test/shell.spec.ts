// apps/host/test/shell.spec.ts
import { describe, it, expect } from 'vitest';
import { isSafeCommand, splitCommand, truncateUtf8 } from '../src/util/shell';

describe('isSafeCommand', () => {
  it('accepts safe builtins', () => {
    expect(isSafeCommand('python3')).toBe(true);
    expect(isSafeCommand('node')).toBe(true);
    expect(isSafeCommand('npm')).toBe(true);
    expect(isSafeCommand('pnpm lint')).toBe(true);
    expect(isSafeCommand('cargo build')).toBe(true);
    expect(isSafeCommand('go test ./...')).toBe(true);
    expect(isSafeCommand('echo hello world')).toBe(true);
    expect(isSafeCommand('node -e console.log')).toBe(true);
  });

  it('accepts sh and bash safe modes', () => {
    expect(isSafeCommand('sh')).toBe(true);
    expect(isSafeCommand('sh -s')).toBe(true);
  });

  it('rejects shell operator injection', () => {
    expect(isSafeCommand('sh -c "ls"')).toBe(false);
    expect(isSafeCommand('bash -l "ls"')).toBe(false);
    expect(isSafeCommand('sh -c "ls" -s')).toBe(false);
    expect(isSafeCommand('echo $(id)')).toBe(false);
    expect(isSafeCommand('echo `id`')).toBe(false);
    expect(isSafeCommand('echo hello; rm /')).toBe(false);
    expect(isSafeCommand('echo hello && whoami')).toBe(false);
    expect(isSafeCommand('ls | grep .')).toBe(false);
    expect(isSafeCommand('rm > /dev/null')).toBe(false);
    expect(isSafeCommand('echo hi\nrm /etc/passwd')).toBe(false);
  });

  it('rejects unknowns', () => {
    expect(isSafeCommand('rm -rf /')).toBe(false);
    expect(isSafeCommand('curl evil.com')).toBe(false);
    expect(isSafeCommand('wget x')).toBe(false);
    expect(isSafeCommand('')).toBe(false);
    expect(isSafeCommand('   ')).toBe(false);
  });

  it('accepts && / || chains of whitelisted commands', () => {
    expect(isSafeCommand('pnpm lint && pnpm test')).toBe(true);
    expect(isSafeCommand('pnpm lint && pnpm test && pnpm build')).toBe(true);
    expect(isSafeCommand('echo ok || echo fallback')).toBe(true);
    expect(isSafeCommand('node -e x && sh -s')).toBe(true);
  });

  it('rejects chains containing non-whitelisted segments', () => {
    expect(isSafeCommand('pnpm lint && rm -rf /')).toBe(false); // rm not whitelisted
    expect(isSafeCommand('echo ok; rm /')).toBe(false); // ; not allowed
    expect(isSafeCommand('pnpm lint | grep x')).toBe(false); // lone | (pipe) not allowed
    expect(isSafeCommand('pnpm lint &')).toBe(false); // lone & (background) not allowed
  });
});

describe('splitCommand (compound)', () => {
  it('returns sh -s for compound commands', () => {
    expect(splitCommand('pnpm lint && pnpm test')).toEqual(['sh', ['-s', 'pnpm lint && pnpm test']]);
    expect(splitCommand('echo a || echo b')).toEqual(['sh', ['-s', 'echo a || echo b']]);
  });

  it('leaves simple commands untouched', () => {
    expect(splitCommand('pnpm lint')).toEqual(['pnpm', ['lint']]);
  });
});

describe('splitCommand', () => {
  it('splits cmd + args', () => {
    expect(splitCommand('pnpm lint')).toEqual(['pnpm', ['lint']]);
    expect(splitCommand('node -e "console.log(1)"')).toEqual(['node', ['-e', '"console.log(1)"']]);
  });
});

describe('truncateUtf8', () => {
  it('handles multibyte', () => {
    const s = '中文'.repeat(2000);  // each char 3 bytes
    const out = truncateUtf8(s, 100);
    expect(Buffer.byteLength(out, 'utf-8')).toBeLessThanOrEqual(100);
    expect(out.endsWith('�')).toBe(false);
  });
});
