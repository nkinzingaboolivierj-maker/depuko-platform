import { Body, Controller, Post } from '@nestjs/common';
import { RegisterUserUseCase } from '../application/register-user.use-case';

@Controller('users')
export class UsersController {
  constructor(private readonly registerUser: RegisterUserUseCase) {}

  @Post()
  async register(@Body() body: { email: string; password: string }) {
    return this.registerUser.execute(body);
  }
}
