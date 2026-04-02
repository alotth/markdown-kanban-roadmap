import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

export function readUtf8(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

export function writeUtf8(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, 'utf8');
}

export function resolvePath(baseDir: string, inputPath: string): string {
  if (path.isAbsolute(inputPath)) return inputPath;
  return path.resolve(baseDir, inputPath);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function parseArray(value: string): string[] {
  const match = value.trim().match(/^\[(.*)\]$/);
  if (!match) return [];
  const inner = match[1].trim();
  if (!inner) return [];
  return inner.split(',').map((item) => item.trim()).filter(Boolean);
}

export function toArrayString(items?: string[]): string {
  if (!items || items.length === 0) return '[]';
  return `[${items.join(', ')}]`;
}

export function parseExternalIssueNumber(externalId: string | null): number | null {
  if (!externalId) return null;
  const m = externalId.match(/^github:issue:(\d+)$/);
  if (!m) return null;
  return Number(m[1]);
}

export function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}
