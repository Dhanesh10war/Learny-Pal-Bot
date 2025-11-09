import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ConversationList from "@/components/ConversationList";
import NavLink from "@/components/NavLink";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadConversationMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const formattedMessages = data.map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

      setMessages(formattedMessages);
    } catch (error: any) {
      toast.error("Failed to load messages");
    }
  };

  const createNewConversation = async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, title: "New Conversation" })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error: any) {
      toast.error("Failed to create conversation");
      return null;
    }
  };

  const saveMessage = async (conversationId: string, role: "user" | "assistant", content: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          role,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error("Failed to save message:", error);
      return null;
    }
  };

  const updateConversationTitle = async (conversationId: string, firstMessage: string) => {
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
    try {
      await supabase
        .from("conversations")
        .update({ title })
        .eq("id", conversationId);
    } catch (error) {
      console.error("Failed to update title:", error);
    }
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setIsSidebarOpen(false);
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
    loadConversationMessages(id);
    setIsSidebarOpen(false);
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !user) return;

    let conversationId = currentConversationId;

    if (!conversationId) {
      conversationId = await createNewConversation();
      if (!conversationId) return;
      setCurrentConversationId(conversationId);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    await saveMessage(conversationId, "user", userMessage.content);

    if (messages.length === 0) {
      updateConversationTitle(conversationId, userMessage.content);
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let assistantMessage = "";
      const assistantMessageId = (Date.now() + 1).toString();

      setMessages((prev) => [
        ...prev,
        { id: assistantMessageId, role: "assistant", content: "" },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantMessage += content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: assistantMessage }
                      : msg
                  )
                );
              }
            } catch (e) {
              console.error("Error parsing chunk:", e);
            }
          }
        }
      }

      if (assistantMessage && conversationId) {
        await saveMessage(conversationId, "assistant", assistantMessage);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to send message. Please try again.");
      setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/20 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 border-r border-border/40 bg-background/80 backdrop-blur-sm flex-col">
        <div className="p-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">EduBot</h1>
              <p className="text-xs text-muted-foreground">Learning Assistant</p>
            </div>
          </div>
        </div>
        <ConversationList
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
        />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <div className="p-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">EduBot</h1>
                <p className="text-xs text-muted-foreground">Learning Assistant</p>
              </div>
            </div>
          </div>
          <ConversationList
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-10">
          <div className="px-4 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {currentConversationId ? "Chat" : "New Conversation"}
            </h2>
            <NavLink onMenuClick={() => setIsSidebarOpen(true)} />
          </div>
        </header>

        {/* Chat Container */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold mb-2 text-foreground">
                  Welcome to EduBot!
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  I'm here to help you learn. Ask me anything about your studies,
                  and I'll do my best to assist you!
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <ChatMessage key={message.id} role={message.role} content={message.content} />
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-sm">EduBot is thinking...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Container */}
        <div className="border-t border-border/40 backdrop-blur-sm bg-background/80 sticky bottom-0">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <ChatInput onSend={handleSendMessage} disabled={isLoading} />
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-border/40 backdrop-blur-sm bg-background/80 py-3">
          <p className="text-center text-sm text-muted-foreground">
            © 2025 EduBot – Built with 💡 for students
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
