import React, { useEffect, useState } from 'react';
import axios from 'axios';

const createConversationId = () => `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createWelcomeMessage = (conversationId, text = "Welcome to the Atelier. How may I guide your olfactive journey today?") => ({
  role: 'agent',
  text,
  conversationId,
});

const Advisor = ({ currentUser }) => {
  const [activeConversationId, setActiveConversationId] = useState(() => createConversationId());
  const [messages, setMessages] = useState([
    createWelcomeMessage(activeConversationId)
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [deletingConversationId, setDeletingConversationId] = useState(null);

  const conversationEntries = messages.reduce((acc, message, index) => {
    const conversationId = message.conversationId || 'default-chat';
    const existing = acc.find((entry) => entry.id === conversationId);

    if (existing) {
      existing.messages.push(message);
      existing.lastIndex = index;
      if (message.conversationTitle && !existing.title) {
        existing.title = message.conversationTitle;
      }
      if (message.role === 'user') {
        existing.hasUserMessage = true;
      }
      if (!existing.preview && message.role === 'user') {
        existing.preview = message.text;
      }
      return acc;
    }

    acc.push({
      id: conversationId,
      preview: message.role === 'user' ? message.text : '',
      title: message.conversationTitle || '',
      hasUserMessage: message.role === 'user',
      messages: [message],
      lastIndex: index,
    });

    return acc;
  }, [])
    .filter((entry) => entry.hasUserMessage)
    .map((entry) => ({
      ...entry,
      preview: entry.title || entry.preview || entry.messages[0]?.text || 'New conversation',
    }))
    .sort((a, b) => b.lastIndex - a.lastIndex);

  const displayedMessages = messages.filter(
    (message) => (message.conversationId || 'default-chat') === activeConversationId
  );

  const handleNewChat = () => {
    const newConversationId = createConversationId();
    setActiveConversationId(newConversationId);
    setMessages((prev) => [
      ...prev,
      createWelcomeMessage(
        newConversationId,
        'Welcome to your Personal Fragrance Advisor. Tell me the occasion, mood, or season and I will tailor suggestions, or if you have questions, feel free to ask!'
      ),
    ]);
    setInput('');
  };

  const hydrateMessagesWithFreshChat = (history = []) => {
    const freshConversationId = createConversationId();
    const normalized = history.map((message) => ({
      ...message,
      conversationId: message.conversationId || 'default-chat',
    }));

    setMessages([
      ...normalized,
      createWelcomeMessage(
        freshConversationId,
        'Welcome to your Personal Fragrance Advisor. Tell me the occasion, mood, or season and I will tailor suggestions, or if you have questions, feel free to ask!'
      ),
    ]);
    setActiveConversationId(freshConversationId);
    setInput('');
  };

  const handleDeleteConversation = async (conversationId) => {
    if (!conversationId || deletingConversationId === conversationId) return;

    setDeletingConversationId(conversationId);

    try {
      if (currentUser?.id) {
        const res = await axios.delete(
          `http://localhost:5000/api/ai/history/${currentUser.id}/${encodeURIComponent(conversationId)}`
        );
        const history = Array.isArray(res.data?.history) ? res.data.history : [];

        if (history.length === 0) {
          hydrateMessagesWithFreshChat([]);
        } else {
          const normalized = history.map((message) => ({
            ...message,
            conversationId: message.conversationId || 'default-chat',
          }));

          setMessages(normalized);

          if (activeConversationId === conversationId) {
            const nextConversationId = normalized[normalized.length - 1]?.conversationId;
            setActiveConversationId(nextConversationId || createConversationId());
          }
        }
      } else {
        const remaining = messages.filter(
          (message) => (message.conversationId || 'default-chat') !== conversationId
        );

        if (remaining.length === 0) {
          hydrateMessagesWithFreshChat([]);
        } else {
          setMessages(remaining);
          if (activeConversationId === conversationId) {
            setActiveConversationId(remaining[remaining.length - 1]?.conversationId || createConversationId());
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingConversationId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      if (!currentUser?.id) return;

      try {
        const res = await axios.get(`http://localhost:5000/api/ai/history/${currentUser.id}`);
        const history = Array.isArray(res.data?.history) ? res.data.history : [];

        if (!cancelled) {
          hydrateMessagesWithFreshChat(history);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const currentInput = input.trim();
    if (!currentInput) return;
    setInput("");

    const currentConversationId = activeConversationId || createConversationId();
    if (!activeConversationId) {
      setActiveConversationId(currentConversationId);
    }

    if (!currentUser?.id) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          text: "Please sign in first so I can personalize recommendations with your profile and collection.",
          conversationId: currentConversationId,
        },
      ]);
      return;
    }

    const priorHistory = messages.filter(
      (m) =>
        (m.role === 'user' || m.role === 'agent') &&
        (m.conversationId || 'default-chat') === currentConversationId
    );
    const isFirstUserMessage = priorHistory.filter((m) => m.role === 'user').length === 0;
    const conversationTitle = isFirstUserMessage ? currentInput : '';

    const userMessage = {
      role: 'user',
      text: currentInput,
      conversationId: currentConversationId,
      conversationTitle: conversationTitle || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const res = await axios.post('http://localhost:5000/api/ai/chat', {
        userId: currentUser.id,
        message: currentInput,
        conversationId: currentConversationId,
        conversationTitle: conversationTitle || undefined,
        history: priorHistory,
      });

      setMessages(prev => [...prev, {
        role: 'agent',
        text: res.data.reply,
        conversationId: currentConversationId,
        conversationTitle: conversationTitle || undefined,
      }]);
    } catch (err) {
      const backendMessage = err?.response?.data?.error || err?.response?.data?.message;
      setMessages(prev => [...prev, {
        role: 'agent',
        text: backendMessage || "I apologize, the Advisor is currently unavailable.",
        conversationId: currentConversationId,
        conversationTitle: conversationTitle || undefined,
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-black/75 flex items-center justify-center p-6">
      <div className="bg-black border border-white/10 rounded-none w-full max-w-5xl shadow-2xl flex h-[620px] overflow-hidden">
        <aside className="w-72 border-r border-white/10 p-4 flex flex-col">
          <p className="text-perfume-gold uppercase tracking-[0.25em] font-serif text-[11px] mb-4">
            Conversations
          </p>
          <button
            type="button"
            onClick={handleNewChat}
            className="mb-3 text-left text-xs px-3 py-2 rounded-md border border-white/10 text-gray-300 hover:border-perfume-gold/50 hover:text-white transition-colors"
          >
            + New Chat
          </button>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {conversationEntries.length === 0 ? (
              <p className="text-gray-500 text-xs">No conversation history yet.</p>
            ) : (
              conversationEntries
                .map((entry) => {
                  return (
                  <div
                    key={entry.id}
                    className={`w-full rounded-md px-2 py-2 border transition-colors flex items-start justify-between gap-2 ${
                      activeConversationId === entry.id
                        ? 'bg-perfume-gold/10 border-perfume-gold text-white'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:border-perfume-gold/50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveConversationId(entry.id)}
                      className="text-left flex-1"
                    >
                      <p className="text-xs leading-snug line-clamp-3">
                        {entry.preview}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteConversation(entry.id)}
                      disabled={deletingConversationId === entry.id}
                      className="text-xs text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed px-1"
                      aria-label="Delete conversation"
                      title="Delete conversation"
                    >
                      {deletingConversationId === entry.id ? '...' : '×'}
                    </button>
                  </div>
                )})
            )}
          </div>
        </aside>

        <div className="flex-1 p-8 flex flex-col">
          <h2 className="text-perfume-gold uppercase tracking-[0.3em] text-center mb-8 font-serif text-sm">
            The Scent Advisor
          </h2>

          <div className="flex-1 overflow-y-auto mb-6 space-y-6 pr-4 px-2 custom-scrollbar">
            {displayedMessages.map((m, i) => (
              <div key={`${m.conversationId || 'default-chat'}-${i}`} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <p className={`inline-block w-fit max-w-[85%] px-4 py-3 break-words whitespace-pre-wrap ${
                  m.role === 'user' 
                  ? 'bg-perfume-gold text-black' 
                  : 'bg-white/5 text-gray-300 border border-white/5'
                } rounded-md text-sm leading-relaxed font-serif`}>
                  {m.role === 'agent'
                    ? m.text
                        .split(/\n+/)
                        .filter(Boolean)
                        .map((paragraph, index) => (
                          <span key={index} className="block mb-2 last:mb-0">
                            {paragraph}
                          </span>
                        ))
                    : m.text}
                </p>

              </div>
            ))}
            {isTyping && (
              <div className="text-left">
                <p className="text-perfume-gold animate-pulse text-xs tracking-widest uppercase">The Advisor is thinking...</p>
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} className="flex gap-4 border-t border-white/10 pt-6">
            <input 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-transparent border-b border-white/20 p-2 text-white focus:outline-none focus:border-perfume-gold font-serif transition-colors"
              placeholder="Describe an occasion or a mood..."
            />
            <button type="submit" className="bg-white text-black px-6 py-2 uppercase text-[10px] tracking-[0.2em] font-bold hover:bg-perfume-gold hover:text-white transition-all rounded-md">
              Consult
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Advisor;