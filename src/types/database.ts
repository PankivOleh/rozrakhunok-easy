/**
 * Firestore data models for "Pay & Split".
 * All timestamps are stored as ISO strings on the client and converted
 * to Firestore Timestamps in service layer when needed.
 */

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
  fcmToken?: string;
}

export type SplitType = "equal" | "unequal" | "shares";

export interface Group {
  id: string;
  name: string;
  emoji?: string;
  creatorId: string;
  members: string[]; // user ids
  qrCode?: string; // join URL or QR payload
  createdAt: string;
}

export interface Expense {
  id: string;
  groupId: string;
  payerId: string;
  amount: number;
  description: string;
  splitType: SplitType;
  participants: string[]; // user ids that participate in the split
  shares?: Record<string, number>; // for unequal/shares
  recurring?: boolean;
  timestamp: string;
}

export interface Transaction {
  from: string; // user id (debtor)
  to: string; // user id (creditor)
  amount: number;
  isSettled: boolean;
  timestamp: string;
}

export interface MemberBalance {
  userId: string;
  balance: number; // positive = is owed, negative = owes
}
