import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { resolve } from 'path';
import { loadConfiguration } from './configuration';
import { ENV_CONFIG } from './config.tokens';
import { EnvConfig } from './env.schema';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), '.env.local'),
        resolve(process.cwd(), '.env'),
      ],
    }),
  ],
  providers: [
    {
      provide: ENV_CONFIG,
      useFactory: (): EnvConfig => loadConfiguration(),
    },
  ],
  exports: [ENV_CONFIG],
})
export class ConfigModule {}
