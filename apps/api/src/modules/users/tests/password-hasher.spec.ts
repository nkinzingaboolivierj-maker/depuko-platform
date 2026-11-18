import { PasswordHasher } from '../infrastructure/password-hasher';

describe('PasswordHasher (scrypt)', () => {
  it('round-trips a correct password', async () => {
    const hasher = new PasswordHasher();
    const hash = await hasher.hash('correct-horse-battery-staple');
    expect(await hasher.compare('correct-horse-battery-staple', hash)).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hasher = new PasswordHasher();
    const hash = await hasher.hash('correct-horse-battery-staple');
    expect(await hasher.compare('wrong-password', hash)).toBe(false);
  });

  it('produces a different hash each time (random salt)', async () => {
    const hasher = new PasswordHasher();
    const h1 = await hasher.hash('same-password');
    const h2 = await hasher.hash('same-password');
    expect(h1).not.toBe(h2);
  });
});
