import React from 'react';
import { Message } from '@/types/message';
import { UserMessage } from './UserMessage';
import { AiMessage } from './AiMessage';
import { TypingIndicator } from './TypingIndicator';

interface Props {
  message: Message;
  isLast: boolean;
  isFirstAiMessage?: boolean;
}

export function MessageRow({ message, isLast, isFirstAiMessage }: Props) {
  if (message.role === 'user') {
    return <UserMessage message={message} />;
  }

  if (message.status === 'streaming' && message.content.length === 0) {
    return <TypingIndicator />;
  }

  return <AiMessage message={message} isLast={isLast} isFirstAiMessage={!!isFirstAiMessage} />;
}
