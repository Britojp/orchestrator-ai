import { Module } from '@nestjs/common';
import { ConversationContextService } from './conversation-context.service';
import { ChatController } from './chat.controller';
import { MessageService } from './message.service';

@Module({
  providers: [ConversationContextService, MessageService],
  controllers: [ChatController],
  exports: [ConversationContextService, MessageService]
})
export class ConversationContextModule {}
