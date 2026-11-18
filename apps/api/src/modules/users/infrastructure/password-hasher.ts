import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

/**
 * scrypt via Node's built-in crypto module — no external dependency, so
 * there is nothing here that isn't verifiable in a plain Node environment.
 * Stored format: "<salt-hex>:<derived-key-hex>".
 */
@Injectable()
export class PasswordHasher {
  private readonly keyLength = 64;

  async hash(plain: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derived = await scrypt(plain, salt, this.keyLength);
    return `${salt}:${derived.toString('hex')}`;
  }

  async compare(plain: string, stored: string): Promise<boolean> {
    const [salt, hashHex] = stored.split(':');
    if (!salt || !hashHex) return false;
    const derived = await scrypt(plain, salt, this.keyLength);
    const storedBuffer = Buffer.from(hashHex, 'hex');
    if (derived.length !== storedBuffer.length) return false;
    return timingSafeEqual(derived, storedBuffer);
  }
}
