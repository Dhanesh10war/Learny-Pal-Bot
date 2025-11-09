import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Menu } from "lucide-react";
import { toast } from "sonner";

interface NavLinkProps {
  onMenuClick: () => void;
}

const NavLink = ({ onMenuClick }: NavLinkProps) => {
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to logout");
    } else {
      toast.success("Logged out successfully");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        title="Logout"
      >
        <LogOut className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default NavLink;
