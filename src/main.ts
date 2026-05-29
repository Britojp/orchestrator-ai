import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ensureCliPathsOnPath } from './config/cursor-cli-path';

ensureCliPathsOnPath();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  Logger.log(`Orquestrador orchestrator-ai em http://localhost:${port}`, 'Bootstrap');
  Logger.log(`Bull Board em http://localhost:${port}/queues`, 'Bootstrap');
}

bootstrap();
