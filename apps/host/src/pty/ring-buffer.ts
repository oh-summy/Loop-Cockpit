// apps/host/src/pty/ring-buffer.ts
/**
 * Fixed-capacity ring buffer for PTY output. Keeps the last `maxBytes` bytes.
 * Used as errorSnippet source — when PTY exits with non-zero, the last 8KB
 * of stdout/stderr is what we surface in audit + UI.
 */
export class RingBuffer {
  private readonly buf: Buffer;
  private readonly maxSize: number;
  /** Index of the oldest byte (read start). */
  private head = 0;
  /** Number of valid bytes currently stored. */
  private size = 0;

  constructor(maxBytes = 8192) {
    if (maxBytes <= 0) throw new RangeError('maxBytes must be > 0');
    this.maxSize = maxBytes;
    this.buf = Buffer.allocUnsafe(maxBytes);
  }

  push(chunk: Buffer | string): void {
    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    if (data.length === 0) return;

    // Case 1: incoming chunk alone exceeds capacity — keep only its tail.
    if (data.length >= this.maxSize) {
      data.copy(this.buf, 0, data.length - this.maxSize);
      this.head = 0;
      this.size = this.maxSize;
      return;
    }

    // Case 2: fits without evicting.
    const available = this.maxSize - this.size;
    if (data.length <= available) {
      const writePos = (this.head + this.size) % this.maxSize;
      this.copyWrap(data, writePos);
      this.size += data.length;
      return;
    }

    // Case 3: needs to evict the oldest `removeCount` bytes.
    const removeCount = data.length - available;
    this.head = (this.head + removeCount) % this.maxSize;
    this.size -= removeCount;

    const writePos = (this.head + this.size) % this.maxSize;
    this.copyWrap(data, writePos);
    this.size += data.length;
  }

  /** Copy `src` into the ring buffer starting at `writePos`, wrapping if needed. */
  private copyWrap(src: Buffer, writePos: number): void {
    const spaceInFirst = this.maxSize - writePos;
    if (src.length <= spaceInFirst) {
      src.copy(this.buf, writePos, 0, src.length);
    } else {
      src.copy(this.buf, writePos, 0, spaceInFirst);
      src.copy(this.buf, 0, spaceInFirst, src.length);
    }
  }

  toString(): string {
    if (this.size === 0) return '';
    const end = this.head + this.size;
    if (end <= this.maxSize) {
      return this.buf.toString('utf-8', this.head, end);
    }
    // wrapped
    const first = this.buf.toString('utf-8', this.head, this.maxSize);
    const second = this.buf.toString('utf-8', 0, end - this.maxSize);
    return first + second;
  }

  get length(): number {
    return this.size;
  }
}
