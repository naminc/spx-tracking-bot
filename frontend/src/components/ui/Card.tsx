import type { ReactNode } from "react";

type Props = {
  title: string;
  value: string | number;
  icon?: ReactNode;
  className?: string;
};

export function Card({ title, value, icon, className = "" }: Props) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-5 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
        </div>
        {icon && <div className="text-indigo-500 text-2xl">{icon}</div>}
      </div>
    </div>
  );
}
