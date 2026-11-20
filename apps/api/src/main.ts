import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  const allowedOrigins = (process.env.CORS_ORIGINS ?? process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // Production must never fall back to a wildcard/reflection-style CORS
  // policy. If no allow-list is configured, browsers cannot make cross-origin
  // requests; same-origin traffic remains unaffected.
  const corsOrigin: string[] | boolean = allowedOrigins.length
    ? allowedOrigins
    : process.env.NODE_ENV === 'production'
      ? false
      : true;

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
