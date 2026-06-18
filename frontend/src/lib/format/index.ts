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
};
