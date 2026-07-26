// apps/host/src/audit/redact.ts
/**
 * Redact sensitive information from audit event strings before DB write.
 *
 * 模式：
 *  - 所有以 env:xxx 引用的 secret 字段（不再出现明文）都要覆写
 *  - 兜底：在日志/审计输出中对形如 env:... 的背后可能出现的实际值仍按关键词扫描
 *  - SMTP_PASSWORD / ANTHROPIC_AUTH_TOKEN / TELEGRAM_BOT_TOKEN / LARK_WEBHOOK_URL 等常见 env 名模式
 */

const REDACT_PATTERNS: RegExp[] = [
  // API key patterns
  /(?:api[_-]?key|apikey)\s*[:=]\s*['"]?([A-Za-z0-9_\-]{16,})['"]?/gi,
  // Bearer tokens
  /Bearer\s+([A-Za-z0-9_\-\.~\/\+]{20,})/g,
  // SMTP / credentials
  /(?:password|passwd|pass|secret|token|auth|apikey|api_key)\s*[:=]\s*['"]?([A-Za-z0-9_\-\.~\/\+=]{8,})['"]?/gi,
  // Authorization headers
  /Authorization:\s*Bearer\s+([A-Za-z0-9_\-\.~\/\+]{20,})/g,
  // URLs with embedded credentials
  /\w+:\/\/[^:\s]+:([^@\s]+)@[^\s]+/g,
  // env var names that carried secret values (e.g. "ANTHROPIC_AUTH_TOKEN=sk-...")
  /(?:ANTHROPIC_AUTH_TOKEN|SMTP_PASS|TELEGRAM_BOT_TOKEN|LARK_WEBHOOK_URL|SLACK_WEBHOOK_URL|DISCORD_WEBHOOK_URL|[A-Z0-9_]*SECRET[A-Z0-9_]*)\s*[:=]\s*['"]?([A-Za-z0-9_\-\.~\/\+=]{8,})['"]?/g,
  // sk-* (Anthropic API key) / 其他常见 token 前缀
  /(?:sk-[A-Za-z0-9]{20,})\b/g,
];

/**
 * Redact sensitive data from a string.
 * Returns the sanitized string.
 */
export function redact(input: string): string {
  if (!input) return input;
  let result = String(input);
  for (const pattern of REDACT_PATTERNS) {
    result = result.replace(pattern, (match, p1) => {
      if (p1) {
        return match.replace(p1, '[REDACTED]');
      }
      return '[REDACTED]';
    });
  }
  return result;
}

/** Redact all sensitive fields in an audit event object */
export function redactEvent(event: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = { ...event };
  for (const key of ['toolResult', 'prompt', 'response', 'error', 'toolArgs']) {
    if (typeof result[key] === 'string') {
      result[key] = redact(result[key]);
    }
    if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = redact(JSON.stringify(result[key]));
    }
  }
  return result;
}

/** UTF-8 安全的字节截断 */
export function truncateBytesUtf8(str: string, maxBytes: number): string {
  if (Buffer.byteLength(str, 'utf-8') <= maxBytes) return str;
  const buf = Buffer.from(str, 'utf-8').slice(0, maxBytes);
  let out = buf.toString('utf-8');
  if (out.endsWith('�')) out = out.slice(0, -1);
  return out;
}
