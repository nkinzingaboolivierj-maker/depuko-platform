# users module

**Status:** implemented (Phase 2 slice). Real password hashing (scrypt via
Node's built-in `crypto`, see `infrastructure/password-hasher.ts`), real
Postgres persistence, registration endpoint. `VerifyCredentialsUseCase` is
consumed by the `auth` module during login.

Not yet built: email verification, password reset, profile fields beyond
email — those belong to `customers`/`workforce` for their respective persona
data (§29), not here.
