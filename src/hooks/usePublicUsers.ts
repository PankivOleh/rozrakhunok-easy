import { useEffect, useState } from "react";
import { authService } from "@/services/authService";
import type { PublicUser } from "@/types/database";

export function usePublicUsers(ids: string[]) {
  const [users, setUsers] = useState<Record<string, PublicUser>>({});

  useEffect(() => {
    const unique = [...new Set(ids)].filter(Boolean);
    if (!unique.length) {
      setUsers({});
      return;
    }
    let cancelled = false;
    authService.getPublicUsersByIds(unique)
      .then((result) => { if (!cancelled) setUsers(result); })
      .catch(() => { if (!cancelled) setUsers({}); });
    return () => { cancelled = true; };
  }, [ids.join("|")]);

  return users;
}
