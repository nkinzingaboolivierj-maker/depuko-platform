import { AuthenticateUserUseCase } from '../application/authenticate-user.use-case';
import { InMemorySessionRepository } from '../infrastructure/in-memory-session.repository';
import { RegisterUserUseCase } from '../../users/application/register-user.use-case';
import { VerifyCredentialsUseCase } from '../../users/application/verify-credentials.use-case';
import { InMemoryUserRepository } from '../../users/infrastructure/in-memory-user.repository';
import { PasswordHasher } from '../../users/infrastructure/password-hasher';

describe('AuthenticateUserUseCase', () => {
  function setup() {
    const userRepo = new InMemoryUserRepository();
    const hasher = new PasswordHasher();
    const register = new RegisterUserUseCase(userRepo, hasher);
    const verify = new VerifyCredentialsUseCase(userRepo, hasher);
    const sessions = new InMemorySessionRepository();
    const auth = new AuthenticateUserUseCase(sessions, verify);
    return { register, auth };
  }

  it('issues a session for a registered user with correct credentials', async () => {
    const { register, auth } = setup();
    await register.execute({ email: 'a@example.com', password: 'correct-horse' });

    const session = await auth.execute({ email: 'a@example.com', password: 'correct-horse' });
    expect(session.isExpired()).toBe(false);
  });

  it('rejects an unregistered email', async () => {
    const { auth } = setup();
    await expect(auth.execute({ email: 'nobody@example.com', password: 'x' })).rejects.toThrow();
  });

  it('rejects a wrong password', async () => {
    const { register, auth } = setup();
    await register.execute({ email: 'c@example.com', password: 'correct-horse' });
    await expect(auth.execute({ email: 'c@example.com', password: 'wrong' })).rejects.toThrow();
  });
});
