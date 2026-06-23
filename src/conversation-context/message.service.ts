import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateMessageDto {
  conversationId: string;
  role: string;
  content: string;
  prompt?: string;
  provider?: string;
  model?: string;
}

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async persistMessage(dto: CreateMessageDto) {
    this.logger.log(`Persisting message for conversation: ${dto.conversationId}`);
    return this.prisma.message.create({
      data: {
        conversation_id: dto.conversationId,
        role: dto.role,
        content: dto.content,
        prompt: dto.prompt,
        provider: dto.provider,
        model: dto.model,
      },
    });
  }
}
