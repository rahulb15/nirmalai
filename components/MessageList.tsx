// components\MessageList.tsx
'use client';

import { Message } from '@/types';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { User, Bot, FileText } from 'lucide-react';

interface Props {
  messages: Message[];
}

export default function MessageList({ messages }: Props) {
  return (
    <div className="space-y-6">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex items-start gap-4 ${
            message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          {/* Avatar */}
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              message.role === 'user'
                ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                : 'bg-gradient-to-br from-blue-500 to-cyan-500'
            }`}
          >
            {message.role === 'user' ? (
              <User className="w-5 h-5 text-white" />
            ) : (
              <Bot className="w-5 h-5 text-white" />
            )}
          </div>

          {/* Message Content */}
          <div
            className={`flex-1 max-w-3xl ${
              message.role === 'user' ? 'text-right' : 'text-left'
            }`}
          >
            <div
              className={`inline-block rounded-2xl px-6 py-4 ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white'
                  : 'bg-white/90 text-gray-800'
              }`}
            >
              {/* Images */}
              {message.imageUrls && message.imageUrls.length > 0 && (
                <div className="mb-3 space-y-2">
                  {message.imageUrls.map((url, idx) => (
                    <div key={idx} className="relative rounded-lg overflow-hidden">
                      <img
                        src={url}
                        alt={`Uploaded image ${idx + 1}`}
                        className="max-w-full h-auto rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* File attachments */}
              {message.fileUrls && message.fileUrls.length > 0 && (
                <div className="mb-3 space-y-2">
                  {message.fileUrls.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm underline"
                    >
                      <FileText className="w-4 h-4" />
                      {url.split('/').pop()}
                    </a>
                  ))}
                </div>
              )}

              {/* Text Content */}
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>

            {/* Timestamp */}
            <div
              className={`text-xs text-white/60 mt-1 ${
                message.role === 'user' ? 'text-right' : 'text-left'
              }`}
            >
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}