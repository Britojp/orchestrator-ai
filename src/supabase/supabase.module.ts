import { Module } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';
import { ENV_CONFIG } from '../config/config.tokens';
import { EnvConfig } from '../config/env.schema';
import { SUPABASE_CLIENT } from './supabase.tokens';
import { TasksRepository } from './tasks.repository';

@Module({
  providers: [
    {
      provide: SUPABASE_CLIENT,
      inject: [ENV_CONFIG],
      useFactory: (env: EnvConfig): SupabaseClient =>
        createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
          realtime: { transport: ws as unknown as typeof WebSocket },
        }),
    },
    TasksRepository,
  ],
  exports: [TasksRepository, SUPABASE_CLIENT],
})
export class SupabaseModule {}
