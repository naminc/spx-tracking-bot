export const formatVnd = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));

type StatusConfig = { color: string; label: string };

export const statusMap: Record<string, StatusConfig> = {
  // Order / Deposit
  PAID:      { color: "bg-green-100 text-green-800",   label: "Paid" },
  PENDING:   { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
  EXPIRED:   { color: "bg-amber-100 text-amber-700",   label: "Expired" },
  CANCELLED: { color: "bg-red-100 text-red-800",       label: "Cancelled" },
  REFUNDED:  { color: "bg-blue-100 text-blue-800",     label: "Refunded" },
  // Stock
  AVAILABLE: { color: "bg-green-100 text-green-800",   label: "Available" },
  SOLD:      { color: "bg-gray-100 text-gray-600",     label: "Sold" },
  // Broadcast
  RUNNING:   { color: "bg-blue-100 text-blue-800",     label: "Running" },
  COMPLETED: { color: "bg-green-100 text-green-800",   label: "Completed" },
  FAILED:    { color: "bg-red-100 text-red-800",       label: "Failed" },
  // Wallet transaction types
  DEPOSIT:        { color: "bg-green-100 text-green-800",   label: "Deposit" },
  PURCHASE:       { color: "bg-indigo-100 text-indigo-800", label: "Purchase" },
  REFUND:         { color: "bg-blue-100 text-blue-800",     label: "Refund" },
  ADMIN_ADD:      { color: "bg-emerald-100 text-emerald-800", label: "Admin Add" },
  ADMIN_SUBTRACT: { color: "bg-orange-100 text-orange-800",   label: "Admin Sub" },
  // User role
  USER:      { color: "bg-gray-100 text-gray-600",     label: "User" },
  ADMIN:     { color: "bg-indigo-100 text-indigo-800", label: "Admin" },
};

/** @deprecated use statusMap */
export const statusColors: Record<string, string> = Object.fromEntries(
  Object.entries(statusMap).map(([k, v]) => [k, v.color])
);
