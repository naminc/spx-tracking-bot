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
  PENDING: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
  DELIVERED: { color: "bg-green-100 text-green-800", label: "Delivered" },
  FAILED: { color: "bg-red-100 text-red-800", label: "Failed" },
  CANCELLED: { color: "bg-red-100 text-red-800", label: "Cancelled" },
  DRAFT: { color: "bg-gray-100 text-gray-700", label: "Draft" },
  SENDING: { color: "bg-blue-100 text-blue-800", label: "Sending" },
  SENT: { color: "bg-green-100 text-green-800", label: "Sent" },
  ADD: { color: "bg-green-100 text-green-800", label: "Add" },
  REMOVE: { color: "bg-red-100 text-red-800", label: "Remove" },
  PUBLIC_TRACK: { color: "bg-violet-100 text-violet-800", label: "Public Track" },
  TELEGRAM: { color: "bg-sky-100 text-sky-800", label: "Telegram" },
  ADMIN: { color: "bg-indigo-100 text-indigo-800", label: "Admin" },
  PUBLIC_WEB: { color: "bg-gray-100 text-gray-700", label: "Guest" },
  SPX: { color: "bg-orange-100 text-orange-800", label: "SPX" },
  GHN: { color: "bg-emerald-100 text-emerald-800", label: "GHN" },
  JNT: { color: "bg-red-100 text-red-800", label: "J&T" },
};
