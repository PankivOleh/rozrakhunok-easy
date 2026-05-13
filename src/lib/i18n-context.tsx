import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "uk" | "en";
const KEY = "ps_lang";

const dict: Record<Lang, Record<string, string>> = {
  uk: {
    "app.title": "Оплата та Поділ",
    "app.greeting": "Привіт",
    "balance.net": "Чистий баланс",
    "balance.owedToMe": "Вам винні",
    "balance.iOwe": "Ви винні",
    "budget.monthly": "Місячний бюджет",
    "groups.active": "Активні групи",
    "groups.all": "Усі",
    "groups.new": "Нова група",
    "groups.members": "учасників",
    "activity.recent": "Остання активність",
    "activity.empty": "Поки немає активності",
    "expense.add": "Додати витрату",
    "expense.amount": "Сума, ₴",
    "expense.description": "Опис",
    "expense.payer": "Хто заплатив",
    "expense.equal": "Порівну",
    "expense.unequal": "Нерівномірно",
    "expense.recurring": "Регулярний платіж",
    "tabs.split": "Поділ чека",
    "tabs.debts": "Загальні борги",
    "smart.title": "Смарт-розрахунки",
    "smart.allClear": "Усі розраховані ✨",
    "invite.title": "Запросити в групу",
    "invite.subtitle": "Скануйте QR код, щоб приєднатися",
    "notif.title": "Сповіщення",
    "notif.empty": "Немає нових сповіщень",
    "lang.title": "Мова",
    "profile.title": "Профіль",
    "profile.logout": "Вийти",
    "profile.email": "Email",
    "profile.name": "Імʼя",
    "profile.delete": "Видалити акаунт",
    "auth.login": "Вхід",
    "auth.register": "Реєстрація",
    "auth.email": "Email",
    "auth.password": "Пароль",
    "auth.name": "Імʼя",
    "auth.submitLogin": "Увійти",
    "auth.submitRegister": "Створити акаунт",
    "auth.toRegister": "Немає акаунту? Зареєструватись",
    "auth.toLogin": "Вже маєте акаунт? Увійти",
    "common.cancel": "Скасувати",
    "common.save": "Зберегти",
    "common.add": "Додати",
    "common.empty": "Поки немає даних",
  },
  en: {
    "app.title": "Pay & Split",
    "app.greeting": "Hi",
    "balance.net": "Net balance",
    "balance.owedToMe": "Owed to you",
    "balance.iOwe": "You owe",
    "budget.monthly": "Monthly budget",
    "groups.active": "Active groups",
    "groups.all": "All",
    "groups.new": "New group",
    "groups.members": "members",
    "activity.recent": "Recent activity",
    "activity.empty": "No activity yet",
    "expense.add": "Add expense",
    "expense.amount": "Amount, ₴",
    "expense.description": "Description",
    "expense.payer": "Who paid",
    "expense.equal": "Equal",
    "expense.unequal": "Unequal",
    "expense.recurring": "Recurring",
    "tabs.split": "Split bill",
    "tabs.debts": "Total debts",
    "smart.title": "Smart settlements",
    "smart.allClear": "All settled ✨",
    "invite.title": "Invite to group",
    "invite.subtitle": "Scan the QR code to join",
    "notif.title": "Notifications",
    "notif.empty": "No new notifications",
    "lang.title": "Language",
    "profile.title": "Profile",
    "profile.logout": "Log out",
    "profile.email": "Email",
    "profile.name": "Name",
    "profile.delete": "Delete account",
    "auth.login": "Sign in",
    "auth.register": "Sign up",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.name": "Name",
    "auth.submitLogin": "Sign in",
    "auth.submitRegister": "Create account",
    "auth.toRegister": "No account? Sign up",
    "auth.toLogin": "Already have an account? Sign in",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.add": "Add",
    "common.empty": "No data yet",
  },
};

const I18nCtx = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
} | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("uk");

  useEffect(() => {
    const saved = (typeof localStorage !== "undefined" && (localStorage.getItem(KEY) as Lang | null)) || "uk";
    setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(KEY, l);
  };

  const t = (key: string) => dict[lang][key] ?? key;

  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useI18n must be used within I18nProvider");
  return c;
}
