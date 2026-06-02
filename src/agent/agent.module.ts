import { Module } from '@nestjs/common';
import { ENV_CONFIG } from '../config/config.tokens';
import { EnvConfig } from '../config/env.schema';
import { ClaudeAgentService } from './providers/claude/claude-agent.service';
import { CursorAgentService } from './providers/cursor/cursor-agent.service';
import { OllamaAgentService } from './providers/ollama/ollama-agent.service';
import { AgentService } from './agent.service';
import { AGENT_PROVIDER } from './agent.tokens';

@Module({
  providers: [
    {
      provide: AGENT_PROVIDER,
      inject: [ENV_CONFIG],
      useFactory: (env: EnvConfig) => {
        if (env.AI_PROVIDER === 'claude') {
          return new ClaudeAgentService(env);
        }
        if (env.AI_PROVIDER === 'ollama') {
          return new OllamaAgentService(env);
        }
        return new CursorAgentService(env);
      },
    },
    AgentService,
  ],
  exports: [AgentService],
})
export class AgentModule {}
