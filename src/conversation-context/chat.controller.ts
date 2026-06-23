import { Controller, Post, Param, Logger, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { ConversationContextService } from './conversation-context.service';
import { MessageService } from './message.service';

@Controller('conversations')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly contextService: ConversationContextService,
    private readonly messageService: MessageService,
  ) {}

  @Post(':id/messages')
  async streamMessage(
    @Param('id') id: string,
    @Body('message') userMessage: string,
    @Res() res: Response,
  ) {
    // 1. Persist User Message
    await this.messageService.persistMessage({
      conversationId: id,
      role: 'user',
      content: userMessage,
    });

    // 2. Setup Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // 3. Retrieve Context
    const context = await this.contextService.buildPromptContext(id);

    // Simulate streaming for the MVP / Architecture setup
    // In the future this will call ProviderFactory.stream()
    const mockResponse = `Entendi que você deseja: "${userMessage}".\n\n\`\`\`typescript\n// Aqui está um plano de implementação\nfunction plan() { return true; }\n\`\`\``;
    const tokens = mockResponse.split(' ');

    let fullResponse = '';

    for (const token of tokens) {
      fullResponse += token + ' ';
      res.write(`data: ${JSON.stringify({ content: token + ' ' })}\n\n`);
      await new Promise((resolve) => setTimeout(resolve, 50)); // simulate delay
    }

    res.write(`data: [DONE]\n\n`);
    res.end();

    // 4. Persist Assistant Response
    await this.messageService.persistMessage({
      conversationId: id,
      role: 'assistant',
      content: fullResponse.trim(),
      prompt: userMessage,
      provider: 'mock-provider',
      model: 'mock-model',
    });
  }

  @Post(':id/cancel')
  cancelStreaming(@Param('id') id: string) {
    this.logger.log(`Cancelando geração/streaming para a conversa: ${id}`);
    // Futuro: notificar o processo/worker responsável pelo stream para abortar
    return { status: 'cancelled', conversationId: id, message: 'Streaming cancelado com sucesso.' };
  }
}
