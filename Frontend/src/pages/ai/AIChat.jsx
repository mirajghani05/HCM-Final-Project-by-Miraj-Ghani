import { useState } from 'react';
import API from '../../services/api';
import { Send, Bot } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AIChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    
    try {
      const res = await API.post('/ai/chat', { message: input, history: messages.slice(-4) });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
    } catch (error) {
      toast.error('Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <h1 className="text-2xl font-bold mb-4">AI Assistant</h1>
      <div className="flex-1 bg-white rounded-lg shadow overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                <div className="flex items-start gap-2">
                  {msg.role === 'assistant' && <Bot className="w-5 h-5 mt-1" />}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 p-3 rounded-lg">
                <p>Thinking...</p>
              </div>
            </div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about HR..."
            className="flex-1 px-4 py-2 border rounded-lg"
            disabled={loading}
          />
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
