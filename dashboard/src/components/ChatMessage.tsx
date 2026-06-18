export interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system' | 'execution';
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user';
  const isSystem = role === 'system';
  const isExecution = role === 'execution';

  let bgColor = 'bg-white';
  let textColor = 'text-gray-900';
  let border = 'border border-gray-200';
  let align = 'mr-auto';

  if (isUser) {
    bgColor = 'bg-primary-600';
    textColor = 'text-white';
    border = '';
    align = 'ml-auto';
  } else if (isSystem) {
    bgColor = 'bg-gray-100';
    textColor = 'text-gray-500';
    align = 'mx-auto';
    border = 'border-dashed border-gray-300';
  } else if (isExecution) {
    bgColor = 'bg-slate-800';
    textColor = 'text-green-400 font-mono text-sm';
    align = 'mx-auto w-full';
  }

  return (
    <div className={`flex w-full mb-4 ${align === 'ml-auto' ? 'justify-end' : align === 'mx-auto' ? 'justify-center' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${bgColor} ${textColor} ${border} ${isExecution ? 'w-full max-w-full rounded-md p-4' : ''}`}>
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  );
}
