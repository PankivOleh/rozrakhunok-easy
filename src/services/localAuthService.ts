/**
 * Local mock auth service. Same shape as `authService` (Firebase) so it can be
 * swapped 1:1 once Firebase keys are present. Uses localStorage for persistence.
 */
export type LocalUser = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
};

const USERS_KEY = "ps_users";
const SESSION_KEY = "ps_session";

type StoredUser = LocalUser & { passwordHash: string };

function readUsers(): StoredUser[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function writeUsers(u: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(u));
}
function hash(pw: string) {
  // toy hash — fine for local mock only
  let h = 0;
  for (let i = 0; i < pw.length; i++) h = (h * 31 + pw.charCodeAt(i)) | 0;
  return String(h);
}

type Listener = (u: LocalUser | null) => void;
const listeners = new Set<Listener>();
function emit(u: LocalUser | null) {
  listeners.forEach((l) => l(u));
}

export const localAuthService = {
  current(): LocalUser | null {
    if (typeof localStorage === "undefined") return null;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async signUp(email: string, password: string, displayName: string): Promise<LocalUser> {
    const users = readUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("Користувач з таким email вже існує");
    }
    const user: StoredUser = {
      id: `u_${Date.now()}`,
      email,
      displayName,
      createdAt: new Date().toISOString(),
      passwordHash: hash(password),
    };
    users.push(user);
    writeUsers(users);
    const { passwordHash: _ph, ...pub } = user;
    localStorage.setItem(SESSION_KEY, JSON.stringify(pub));
    emit(pub);
    return pub;
  },

  async signIn(email: string, password: string): Promise<LocalUser> {
    const users = readUsers();
    const u = users.find((x) => x.email.toLowerCase() === email.toLowerCase());
    if (!u || u.passwordHash !== hash(password)) {
      throw new Error("Невірний email або пароль");
    }
    const { passwordHash: _ph, ...pub } = u;
    localStorage.setItem(SESSION_KEY, JSON.stringify(pub));
    emit(pub);
    return pub;
  },

  async signOut() {
    localStorage.removeItem(SESSION_KEY);
    emit(null);
  },

  onAuthChange(cb: Listener) {
    listeners.add(cb);
    cb(this.current());
    return () => listeners.delete(cb);
  },
};
