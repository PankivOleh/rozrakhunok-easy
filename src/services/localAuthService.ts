/**
 * Local mock auth + users service. Mirrors a Firebase shape so it can be
 * swapped 1:1 once Firebase keys are present. Uses localStorage + a simple
 * pub/sub to give the UI "onSnapshot"-like reactivity.
 */
export type LocalUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  createdAt: string;
  contacts: string[];
  favoriteGroups: string[];
};

const USERS_KEY = "ps_users";
const SESSION_KEY = "ps_session";

type StoredUser = LocalUser & { passwordHash: string };

function readUsers(): StoredUser[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const arr = JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]") as StoredUser[];
    return arr.map((u) => ({
      ...u,
      username: u.username ?? u.email.split("@")[0],
      contacts: u.contacts ?? [],
      favoriteGroups: u.favoriteGroups ?? [],
    }));
  } catch {
    return [];
  }
}
function writeUsers(u: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(u));
}
function strip(u: StoredUser): LocalUser {
  const { passwordHash: _ph, ...pub } = u;
  return pub;
}
function hash(pw: string) {
  let h = 0;
  for (let i = 0; i < pw.length; i++) h = (h * 31 + pw.charCodeAt(i)) | 0;
  return String(h);
}

type Listener = (u: LocalUser | null) => void;
const authListeners = new Set<Listener>();
function emitAuth(u: LocalUser | null) {
  authListeners.forEach((l) => l(u));
}

type UsersListener = (users: LocalUser[]) => void;
const usersListeners = new Set<UsersListener>();
function emitUsers() {
  const all = readUsers().map(strip);
  usersListeners.forEach((l) => l(all));
}

// cross-tab sync
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === SESSION_KEY) emitAuth(localAuthService.current());
    if (e.key === USERS_KEY) emitUsers();
  });
}

export const localAuthService = {
  current(): LocalUser | null {
    if (typeof localStorage === "undefined") return null;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw) as LocalUser;
      // refresh from store to pick up latest contacts/favorites
      const fresh = readUsers().find((u) => u.id === session.id);
      return fresh ? strip(fresh) : session;
    } catch {
      return null;
    }
  },

  async signUp(email: string, password: string, displayName: string, username: string): Promise<LocalUser> {
    const users = readUsers();
    const uname = username.trim().toLowerCase();
    if (!uname || !/^[a-z0-9_.]{3,20}$/.test(uname)) {
      throw new Error("Username: 3–20 символів (a-z, 0-9, _ .)");
    }
    if (password.length < 6) throw new Error("Пароль має містити мінімум 6 символів");
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("Користувач з таким email вже існує");
    }
    if (users.some((u) => u.username.toLowerCase() === uname)) {
      throw new Error("Цей username вже зайнятий");
    }
    const user: StoredUser = {
      id: `u_${Date.now()}`,
      email,
      username: uname,
      displayName,
      createdAt: new Date().toISOString(),
      contacts: [],
      favoriteGroups: [],
      passwordHash: hash(password),
    };
    users.push(user);
    writeUsers(users);
    const pub = strip(user);
    localStorage.setItem(SESSION_KEY, JSON.stringify(pub));
    emitAuth(pub);
    emitUsers();
    return pub;
  },

  async signIn(email: string, password: string): Promise<LocalUser> {
    const users = readUsers();
    const u = users.find((x) => x.email.toLowerCase() === email.toLowerCase());
    if (!u || u.passwordHash !== hash(password)) {
      throw new Error("Невірний email або пароль");
    }
    const pub = strip(u);
    localStorage.setItem(SESSION_KEY, JSON.stringify(pub));
    emitAuth(pub);
    return pub;
  },

  async signOut() {
    localStorage.removeItem(SESSION_KEY);
    emitAuth(null);
  },

  async updateUser(uid: string, patch: Partial<LocalUser>): Promise<LocalUser> {
    const users = readUsers();
    const idx = users.findIndex((u) => u.id === uid);
    if (idx === -1) throw new Error("Користувача не знайдено");
    users[idx] = { ...users[idx], ...patch };
    writeUsers(users);
    const pub = strip(users[idx]);
    if (this.current()?.id === uid) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(pub));
      emitAuth(pub);
    }
    emitUsers();
    return pub;
  },

  searchByUsername(query: string): LocalUser[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return readUsers()
      .filter((u) => u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q))
      .map(strip);
  },

  getById(id: string): LocalUser | null {
    const u = readUsers().find((x) => x.id === id);
    return u ? strip(u) : null;
  },

  listAll(): LocalUser[] {
    return readUsers().map(strip);
  },

  onAuthChange(cb: Listener) {
    authListeners.add(cb);
    cb(this.current());
    return () => authListeners.delete(cb);
  },

  onUsersChange(cb: UsersListener) {
    usersListeners.add(cb);
    cb(this.listAll());
    return () => usersListeners.delete(cb);
  },
};
