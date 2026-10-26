import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Sparkles, Trash2, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Badge, Button, Card, PageHeader, Spinner } from '../../components/ui';
import { initials } from '../../utils/format';

const suggestions = [
  'Summarize attendance trends for this month',
  'What should I review before running payroll?',
  'Draft a short leave policy reminder for the team',
  'Explain what our pending leave requests mean'
];

export default function AIChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage = { role: 'user', content: text };
    const history = messages.slice(-4);
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await API.post('/ai/chat', { message: text, history });
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: res.data.response || 'I could not produce a response.' }
      ]);
    } catch {
      toast.error('Failed to reach the AI assistant');
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            'I could not reach the AI service right now. Check the AI configuration in the backend environment and try again.',
          error: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const applySuggestion = (suggestion) => {
    setInput(suggestion);
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[560px] flex-col">
      <PageHeader
        eyebrow="AI copilot"
        title="AI assistant"
        description="Ask questions about attendance, leave, payroll or people operations."
        actions={
          messages.length > 0 ? (
            <Button variant="secondary" icon={Trash2} onClick={() => setMessages([])}>
              Clear chat
            </Button>
          ) : null
        }
      />

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20">
              <Bot className="h-4 w-4" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">HCM Copilot</p>
              <p className="text-[11px] text-muted">Context-aware HR assistant</p>
            </div>
          </div>
          <Badge tone="emerald" dot>Ready</Badge>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {messages.length === 0 && !loading ? (
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center py-6 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/25">
                <Sparkles className="h-7 w-7" />
              </span>
              <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                How can I help, {user?.firstName || 'there'}?
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted">
                Ask about your HR data, draft a policy note or get a quick summary of what needs attention.
              </p>

              <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => applySuggestion(suggestion)}
                    className="rounded-xl border border-slate-200 bg-white/60 p-3 text-left text-xs font-medium leading-5 text-slate-600 transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/5 dark:hover:text-indigo-300"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5">
              {messages.map((message, index) => {
                const isUser = message.role === 'user';

                return (
                  <div key={index} className={isUser ? 'flex justify-end' : 'flex justify-start'}>
                    <div className={isUser ? 'flex max-w-[85%] items-start gap-2.5 sm:max-w-[75%]' : 'flex max-w-[90%] items-start gap-2.5 sm:max-w-[80%]'}>
                      {!isUser ? (
                        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-500/20">
                          <Bot className="h-4 w-4" />
                        </span>
                      ) : null}
                      <div
                        className={
                          isUser
                            ? 'rounded-2xl rounded-tr-md bg-indigo-600 px-4 py-2.5 text-sm leading-6 text-white shadow-sm shadow-indigo-500/20'
                            : message.error
                              ? 'rounded-2xl rounded-tl-md border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm leading-6 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200'
                              : 'rounded-2xl rounded-tl-md border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300'
                        }
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                      {isUser ? (
                        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-200 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {initials(user?.firstName, user?.lastName)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {loading ? (
                <div className="flex justify-start">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
                      <Bot className="h-4 w-4" />
                    </span>
                    <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                      <Spinner className="h-3.5 w-3.5 text-indigo-500" />
                      <span className="text-xs font-medium text-muted">Thinking through your question...</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:px-5">
          <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl items-end gap-2">
            <div className="relative flex-1">
              <UserRound className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about attendance, leave, payroll..."
                rows={1}
                disabled={loading}
                className="field min-h-11 max-h-32 resize-none py-3 pl-10 pr-4"
              />
            </div>
            <Button
              type="submit"
              size="icon"
              loading={loading}
              disabled={!input.trim()}
              aria-label="Send message"
              className="shrink-0"
            >
              {loading ? <Spinner /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-subtle">
            Enter to send · Shift + Enter for a new line. Always verify AI-generated people decisions.
          </p>
        </div>
      </Card>
    </div>
  );
}
