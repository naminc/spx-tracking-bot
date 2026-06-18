import { statusMap } from "../../lib/format";

type Props = { status: string };

export function Badge({ status }: Props) {
  const cfg = statusMap[status];
  const color = cfg?.color ?? "bg-gray-100 text-gray-600";
  const label = cfg?.label ?? status;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
