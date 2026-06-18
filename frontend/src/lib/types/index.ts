export type Product = {
  id: string;
  name: string;
  description: string | null;
  itemFormat: string | null;
  note: string | null;
  price: number;
  stockCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductStock = {
  id: string;
  status: "AVAILABLE" | "SOLD";
  content: string;
  createdAt: string;
};

export type Order = {
  id: string;
  orderCode: string;
  userId: string;
  productId: string;
  productName: string;
  price: number;
  status: "PAID" | "CANCELLED" | "REFUNDED";
  createdAt: string;
  user?: { telegramId: string; username: string | null };
};

export type Deposit = {
  id: string;
  code: string;
  userId: string;
  telegramId: string;
  amount: number;
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
  bankTransactionId: string | null;
  rawTransaction: unknown;
  expiredAt: string;
  paidAt: string | null;
  createdAt: string;
  user?: {
    telegramId: string;
    username: string | null;
    firstName: string | null;
  };
};

export type User = {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  balance: number;
  role: "USER" | "ADMIN";
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminLog = {
  id: string;
  adminId: string;
  action: string;
  targetId: string | null;
  detail: unknown;
  createdAt: string;
  admin?: {
    telegramId: string;
    username: string | null;
    firstName: string | null;
  };
};

export type Broadcast = {
  id: string;
  adminId: string;
  targetType: string;
  message: string;
  parseMode: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  admin?: {
    telegramId: string;
    username: string | null;
    firstName: string | null;
  };
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type DashboardStats = {
  totalUsers: number;
  newUsers: number;
  totalProducts: number;
  activeProducts: number;
  availableStock: number;
  lowStockProducts: number;
  orderCount: number;
  paidOrderCount: number;
  refundedOrderCount: number;
  revenue: number;
  refundAmount: number;
  netRevenue: number;
  depositCount: number;
  pendingDepositCount: number;
  paidDepositCount: number;
  depositAmount: number;
};

export type DailyData = {
  date: string;
  orders: number;
  revenue: number;
  deposits: number;
  depositAmount: number;
};

export type TopProduct = {
  productId: string;
  productName: string;
  orderCount: number;
  quantity: number;
  revenue: number;
};

export type LowStockProduct = {
  id: string;
  name: string;
  stockCount: number;
  isActive: boolean;
};

export type DashboardData = {
  range: { from: string; to: string; label: string };
  stats: DashboardStats;
  daily: DailyData[];
  topProducts: TopProduct[];
  lowStock: LowStockProduct[];
  recentOrders: Order[];
  recentDeposits: Deposit[];
  recentAdminLogs: AdminLog[];
};

export type AdminUser = {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
};
