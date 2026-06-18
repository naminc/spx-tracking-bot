import type { User } from "../lib/types/user";

type Props = {
  label: string;
  users: User[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

function formatUserOption(user: User) {
  const name = user.username
    ? `@${user.username}`
    : [user.firstName, user.lastName].filter(Boolean).join(" ") || `User #${user.id}`;

  return `${name} | ID ${user.id} | TG ${user.telegramUserId}`;
}

export function UserFilterSelect({ label, users, value, onChange, placeholder = "All users", disabled }: Props) {
  const selectId = label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div>
      <label htmlFor={selectId} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-70"
      >
        <option value="">{placeholder}</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {formatUserOption(user)}
          </option>
        ))}
      </select>
    </div>
  );
}
