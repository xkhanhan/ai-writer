// ID 生成器
import { randomUUID } from 'crypto';

export function generateId(): string {
  return randomUUID();
}
