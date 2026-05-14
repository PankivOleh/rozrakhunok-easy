import { Star } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export function FavoriteToggle({ groupId, className = "" }: { groupId: string; className?: string }) {
  const { user, toggleFavorite } = useAuth();
  const isFav = (user?.favoriteGroups ?? []).includes(groupId);

  return (
    <button
      type="button"
      aria-label={isFav ? "Прибрати з обраного" : "Додати в обране"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(groupId);
        toast.success(isFav ? "Прибрано з обраного" : "Додано в обране");
      }}
      className={`size-8 rounded-full flex items-center justify-center transition ${
        isFav ? "text-yellow-400" : "text-muted-foreground hover:text-yellow-400"
      } ${className}`}
    >
      <Star className={`size-4 ${isFav ? "fill-yellow-400" : ""}`} />
    </button>
  );
}
