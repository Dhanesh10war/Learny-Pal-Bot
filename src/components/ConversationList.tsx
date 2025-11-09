import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  favorited: boolean;
}

interface ConversationListProps {
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
}

const ConversationList = ({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationListProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error: any) {
      toast.error("Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (id: string, currentFavorited: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ favorited: !currentFavorited })
        .eq("id", id);

      if (error) throw error;
      
      setConversations(conversations.map((c) => 
        c.id === id ? { ...c, favorited: !currentFavorited } : c
      ));
      toast.success(currentFavorited ? "Removed from favorites" : "Added to favorites");
    } catch (error: any) {
      toast.error("Failed to update favorite");
    }
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setConversations(conversations.filter((c) => c.id !== id));
      if (currentConversationId === id) {
        onNewConversation();
      }
      toast.success("Conversation deleted");
    } catch (error: any) {
      toast.error("Failed to delete conversation");
    }
  };

  const filteredConversations = showFavoritesOnly 
    ? conversations.filter(c => c.favorited)
    : conversations;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border space-y-2">
        <Button
          onClick={onNewConversation}
          className="w-full"
          variant="default"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
        <Button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className="w-full"
          variant="outline"
          size="sm"
        >
          <Star className={cn("h-4 w-4 mr-2", showFavoritesOnly && "fill-current")} />
          {showFavoritesOnly ? "Show All" : "Favorites"}
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-4">
              Loading...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center text-muted-foreground py-4 text-sm">
              {showFavoritesOnly ? "No favorites yet" : "No conversations yet"}
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors group",
                  currentConversationId === conversation.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="text-sm truncate">{conversation.title}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-6 w-6 transition-opacity",
                      conversation.favorited ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                    onClick={(e) => toggleFavorite(conversation.id, conversation.favorited, e)}
                  >
                    <Star className={cn("h-3 w-3", conversation.favorited && "fill-current text-yellow-500")} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => deleteConversation(conversation.id, e)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConversationList;
