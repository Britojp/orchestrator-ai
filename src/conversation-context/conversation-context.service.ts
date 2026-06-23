import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationContextService {
  private readonly logger = new Logger(ConversationContextService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getConversationContext(conversationId: string) {
    this.logger.log(`Recuperando contexto da conversa: ${conversationId}`);
    return this.prisma.message.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'asc' }
    });
  }

  async buildPromptContext(conversationId: string) {
    this.logger.log(`Construindo prompt context para a conversa: ${conversationId}`);
    const messages = await this.getConversationContext(conversationId);

    // Futuro: adicionar contexto do projeto, memória, RAG, etc.
    return {
      history: messages.map(msg => ({ role: msg.role, content: msg.content }))
    };
  }
}
