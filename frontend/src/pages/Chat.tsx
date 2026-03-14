import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Bot, User } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { chatAsk, fetchMe, type ChatPayload } from "@/lib/api";
import { useRole } from "@/App";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };

const CHAT_SESSION_KEY = "breach_chat_session_id";

function getOrCreateSessionId(): string {
  let id = localStorage.getItem(CHAT_SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? `session-${Date.now()}`;
    localStorage.setItem(CHAT_SESSION_KEY, id);
  }
  return id;
}

const Chat = () => {
  const { role } = useRole();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>("0");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMe()
      .then((me) => setUserId(String(me.id)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const payload: ChatPayload = {
        session_id: getOrCreateSessionId(),
        role,
        user_id: userId,
        query: text,
      };
      const { response } = await chatAsk(payload);
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, the assistant is unavailable. Please try again later." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg glass-strong border border-primary/20">
          <MessageCircle className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display">Security Awareness Assistant</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Ask about phishing, safe links, and reporting</p>
        </div>
      </div>

      <GlassCard glow="cyan" className="flex flex-col p-0 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-20rem)] min-h-[320px] px-4">
          <div className="py-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Bot className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Ask anything about phishing, suspicious emails, or security best practices.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3",
                  m.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {m.role === "assistant" && (
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-4 py-2.5 text-sm",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "glass-strong border border-border"
                  )}
                >
                  {m.content}
                </div>
                {m.role === "user" && (
                  <div className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary animate-pulse" />
                </div>
                <div className="rounded-lg px-4 py-2.5 text-sm glass-strong border border-border text-muted-foreground">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
        <div className="border-t border-border p-4 flex gap-2">
          <Input
            placeholder="Ask about phishing, links, passwords..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            className="flex-1"
            disabled={loading}
          />
          <Button onClick={sendMessage} disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </GlassCard>
    </div>
  );
};

export default Chat;
