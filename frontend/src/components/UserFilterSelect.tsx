import { useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useUserOptions } from "../hooks/useUserOptions";
import type { User } from "../lib/types/user";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onUserSelect?: (user: User | null) => void;
};

function formatUserOption(user: User) {
  const name = user.username
    ? `@${user.username}`
    : [user.firstName, user.lastName].filter(Boolean).join(" ") || `User #${user.id}`;

  return `${name} | ID ${user.id} | TG ${user.telegramUserId}`;
}

export function UserFilterSelect({
  label,
  value,
  onChange,
  placeholder = "All users",
  disabled,
  onUserSelect,
}: Props) {
  const selectId = label.toLowerCase().replace(/\s+/g, "-");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const debouncedSearch = useDebouncedValue(inputValue, 200);
  const usersQuery = useUserOptions({
    search: debouncedSearch,
    selectedUserId: value || undefined,
    limit: 30,
    enabled: !disabled,
  });
  const users = usersQuery.data ?? [];
  const selectedUser = useMemo(
    () => users.find((user) => String(user.id) === value) ?? null,
    [users, value],
  );

  useEffect(() => {
    const handleDocumentMouseDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => document.removeEventListener("mousedown", handleDocumentMouseDown);
  }, []);

  useEffect(() => {
    if (isOpen) return;

    if (!value) {
      setInputValue("");
      return;
    }

    setInputValue(selectedUser ? formatUserOption(selectedUser) : `User #${value}`);
  }, [isOpen, selectedUser, value]);

  const handleSelect = (user: User | null) => {
    onChange(user ? String(user.id) : "");
    onUserSelect?.(user);
    setInputValue(user ? formatUserOption(user) : "");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={selectId} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={selectId}
        value={inputValue}
        onChange={(event) => {
          const nextValue = event.target.value;
          setInputValue(nextValue);
          setIsOpen(true);

          if (!nextValue.trim()) {
            onChange("");
            onUserSelect?.(null);
          }
        }}
        onFocus={(event) => {
          setIsOpen(true);
          event.currentTarget.select();
        }}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-70"
      />

      {isOpen && !disabled ? (
        <div className="absolute left-0 right-0 z-40 mt-1 max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg">
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-gray-600 hover:bg-gray-50"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => handleSelect(null)}
          >
            {placeholder}
          </button>
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              className={`block w-full px-3 py-2 text-left hover:bg-indigo-50 ${
                String(user.id) === value ? "bg-indigo-600 text-white hover:bg-indigo-600" : "text-gray-900"
              }`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelect(user)}
            >
              <span className="block truncate">{formatUserOption(user)}</span>
              <span className={`block text-xs ${String(user.id) === value ? "text-indigo-100" : "text-gray-500"}`}>
                {user.ordersCount} order{user.ordersCount === 1 ? "" : "s"}
                {user.isBlocked ? " | Blocked" : ""}
              </span>
            </button>
          ))}
          {users.length === 0 ? (
            <div className="px-3 py-2 text-gray-500">
              {usersQuery.isFetching ? "Searching users..." : "No users found"}
            </div>
          ) : null}
          {usersQuery.isFetching && users.length > 0 ? (
            <div className="border-t border-gray-100 px-3 py-2 text-xs text-gray-500">
              Updating results...
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
