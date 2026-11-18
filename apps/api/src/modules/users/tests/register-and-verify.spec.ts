import { RegisterUserUseCase } from '../application/register-user.use-case';
import { VerifyCredentialsUseCase } from '../application/verify-credentials.use-case';
import { InMemoryUserRepository } from '../infrastructure/in-memory-user.repository';
import { PasswordHasher } from '../infrastructure/password-hasher';

describe('users: register + verify credentials', () => {
  it('registers a user and never leaks the password hash', async () => {
    const repo = new InMemoryUserRepository();
    const hasher = new PasswordHasher();
    const register = new RegisterUserUseCase(repo, hasher);

    const result = await register.execute({ email: 'a@example.com', password: 'correct-horse' });

    expect(result.email).toBe('a@example.com');
    expect((result as any).passwordHash).toBeUndefined();
    expect((result as any).password).toBeUndefined();
  });

  it('rejects duplicate email registration', async () => {
    const repo = new InMemoryUserRepository();
    const hasher = new PasswordHasher();
    const register = new RegisterUserUseCase(repo, hasher);

    await register.execute({ email: 'dup@example.com', password: 'x' });
    await expect(register.execute({ email: 'dup@example.com', password: 'y' })).rejects.toThrow();
  });

  it('verifies correct credentials and rejects wrong ones', async () => {
    const repo = new InMemoryUserRepository();
    const hasher = new PasswordHasher();
    const register = new RegisterUserUseCase(repo, hasher);
    const verify = new VerifyCredentialsUseCase(repo, hasher);

    await register.execute({ email: 'b@example.com', password: 'correct-horse' });

    const user = await verify.execute({ email: 'b@example.com', password: 'correct-horse' });
    expect(user.email).toBe('b@example.com');

    await expect(verify.execute({ email: 'b@example.com', password: 'wrong' })).rejects.toThrow();
  });
});
