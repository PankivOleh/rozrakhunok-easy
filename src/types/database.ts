/** Firestore data models for Pay & Split. */

export interface User {
  id: string;
  email?: string;
  emailVerified?: boolean;
  username: string;
  usernameLower: string;
  displayName: string;
  displayNameLower: string;
  photoURL?: string;
  createdAt: string;
  updatedAt?: string;
  contacts: string[];
  favoriteGroups: string[];
  monthlyBudget?: number;
  budgetResetAt?: string;
  fcmToken?: string;
}

export interface PublicUser {
  id: string;
  username: string;
  usernameLower: string;
  displayName: string;
  displayNameLower: string;
  photoURL?: string;
  createdAt: string;
}

export type SplitType = "equal" | "unequal" | "shares";

export interface Group {
  id: string;
  name: string;
  emoji?: string;
  creatorId: string;
  members: string[];
  qrCode?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  groupId: string;
  payerId: string;
  amount: number;
  description: string;
  splitType: SplitType;
  participants: string[];
  shares?: Record<string, number>;
  recurring?: boolean;
  timestamp: string;
  createdBy: string;
}

export interface Transaction {
  id: string;
  groupId: string;
  fromId: string;
  toId: string;
  amount: number;
  isSettled: boolean;
  timestamp: string;
  createdBy: string;
}

export interface DebtReminder {
  id: string;
  groupId: string;
  creditorId: string;
  debtorId: string;
  amount: number;
  reminderFrequency: "daily" | "weekly" | "monthly";
  lastRemindedAt: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface InAppNotification {
  id: string;
  toUserId: string;
  fromUserId: string;
  groupId?: string;
  debtId?: string;
  type: "remind" | "settle" | "expense";
  message: string;
  amount?: number;
  read: boolean;
  createdAt: string;
}

export interface MemberBalance {
  userId: string;
  balance: number;
}
