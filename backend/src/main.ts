import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);
      const allowed = [
        process.env.FRONTEND_URL,
        'http://localhost:3000',
        'http://localhost:3001',
      ].filter(Boolean);

      if (
        allowed.includes(origin) ||
        origin.endsWith('.onrender.com') ||
        origin.endsWith('.netlify.app') ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 Dhaka Tesla Pool API is running on http://localhost:${port}/api`);

  // Auto Keep-Awake for Render Free Tier (Pings every 10 mins so service never sleeps)
  const selfUrl = process.env.RENDER_EXTERNAL_URL || process.env.KEEP_AWAKE_URL;
  if (selfUrl) {
    const pingIntervalMs = 10 * 60 * 1000;
    setInterval(() => {
      const pingTarget = selfUrl.endsWith('/api/ping') ? selfUrl : `${selfUrl}/api/ping`;
      fetch(pingTarget).catch(() => {});
    }, pingIntervalMs);
  }
}
bootstrap();

