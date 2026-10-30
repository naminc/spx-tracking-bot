import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { formatDate } from "../lib/format";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";
import { Button } from "../components/ui/Button";
import { ErrorState } from "../components/ui/ErrorState";
import { Input } from "../components/ui/Input";

const maxRestrictionMessageLength = 2048;

function parseTelegramUserIds(value: string) {
  const tokens = value
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  const validIds = [
    ...new Set(tokens.filter((token) => /^[1-9]\d{0,63}$/.test(token))),
  ];
  const invalidTokens = [
    ...new Set(tokens.filter((token) => !/^[1-9]\d{0,63}$/.test(token))),
  ];

  return { validIds, invalidTokens };
}

export function SettingsPage() {
  const { data, isLoading, error, refetch } = useSettings();
  const updateSettings = useUpdateSettings();
  const hydrated = useRef(false);
  const [adminContact, setAdminContact] = useState("");
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [restrictModeEnabled, setRestrictModeEnabled] = useState(false);
  const [restrictModeMessage, setRestrictModeMessage] = useState("");
  const [restrictAllowListInput, setRestrictAllowListInput] = useState("");
  const [showSaving, setShowSaving] = useState(false);
  const saveLoading = updateSettings.isPending || showSaving;
  const parsedAllowList = useMemo(
    () => parseTelegramUserIds(restrictAllowListInput),
    [restrictAllowListInput],
  );
  const hasInvalidAllowListTokens = parsedAllowList.invalidTokens.length > 0;
  const allowListTooLarge = parsedAllowList.validIds.length > 5000;

  useEffect(() => {
    if (!data || hydrated.current) {
      return;
    }

    setAdminContact(data.adminContact);
    setMaintenanceEnabled(data.maintenanceEnabled);
    setRestrictModeEnabled(data.restrictModeEnabled);
    setRestrictModeMessage(data.restrictModeMessage ?? "");
    setRestrictAllowListInput(
      data.restrictAllowList.map((entry) => entry.telegramUserId).join("\n"),
    );
    hydrated.current = true;
  }, [data]);

  const removeAllowedTelegramUserId = (telegramUserId: string) => {
    setRestrictAllowListInput(
      parsedAllowList.validIds
        .filter((id) => id !== telegramUserId)
        .join("\n"),
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (hasInvalidAllowListTokens) {
      toast.error("Remove invalid Telegram User IDs before saving");
      return;
    }

    if (allowListTooLarge) {
      toast.error("Restrict allow list cannot exceed 5000 users");
      return;
    }

    if (restrictModeEnabled && !restrictModeMessage.trim()) {
      toast.error("Restriction message is required when Restrict Mode is enabled");
      return;
    }

    const minimumSpinnerTime = new Promise((resolve) => {
      window.setTimeout(resolve, 450);
    });

    setShowSaving(true);
    try {
      await updateSettings.mutateAsync({
        adminContact,
        maintenanceEnabled,
        restrictModeEnabled,
        restrictModeMessage: restrictModeMessage.trim() || null,
        restrictAllowedTelegramUserIds: parsedAllowList.validIds,
      });
    } catch {
      /* error handled by toast */
    } finally {
      await minimumSpinnerTime;
      setShowSaving(false);
    }
  };

  if (isLoading) return null;
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <Input
          label="Admin Contact"
          value={adminContact}
          onChange={(event) => setAdminContact(event.target.value)}
          placeholder="@naminc"
          disabled={saveLoading}
          required
        />

        <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
          <input
            type="checkbox"
            checked={maintenanceEnabled}
            onChange={(event) => setMaintenanceEnabled(event.target.checked)}
            disabled={saveLoading}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span>
            <span className="block text-sm font-medium text-gray-900">Maintenance Mode</span>
            <span className="mt-1 block text-sm text-gray-500">
              When enabled, the bot will temporarily stop accepting new orders from the /add command.
            </span>
          </span>
        </label>

        <section className="space-y-4 rounded-lg border border-gray-200 p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={restrictModeEnabled}
              onChange={(event) => setRestrictModeEnabled(event.target.checked)}
              disabled={saveLoading}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <span>
              <span className="block text-sm font-medium text-gray-900">Enable Restrict Mode</span>
              <span className="mt-1 block text-sm text-gray-500">
                Users outside the allow list will only receive the restriction message.
              </span>
            </span>
          </label>

          {restrictModeEnabled ? (
            <div className="space-y-4 border-t border-gray-200 pt-4">
              <div>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <label htmlFor="restrict-mode-message" className="block text-sm font-medium text-gray-700">
                    Restriction message
                  </label>
                  <span className="text-xs text-gray-500">
                    {restrictModeMessage.length}/{maxRestrictionMessageLength}
                  </span>
                </div>
                <textarea
                  id="restrict-mode-message"
                  rows={5}
                  value={restrictModeMessage}
                  onChange={(event) => setRestrictModeMessage(event.target.value)}
                  maxLength={maxRestrictionMessageLength}
                  disabled={saveLoading}
                  placeholder="Bot is no longer available. Please contact the administrator for more information."
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-50"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  This message is sent as escaped plain text, so HTML characters are safe.
                </p>
              </div>

              <div>
                <label htmlFor="restrict-allow-list" className="mb-1 block text-sm font-medium text-gray-700">
                  Allowed Telegram User IDs
                </label>
                <textarea
                  id="restrict-allow-list"
                  rows={5}
                  value={restrictAllowListInput}
                  onChange={(event) => setRestrictAllowListInput(event.target.value)}
                  disabled={saveLoading}
                  placeholder={"6142403832\n8999690536"}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm transition focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-50"
                />
                <div className="mt-1 space-y-1 text-xs">
                  <p className="text-gray-500">
                    {parsedAllowList.validIds.length} user{parsedAllowList.validIds.length === 1 ? "" : "s"} allowed. Separate IDs with commas, spaces, or new lines.
                  </p>
                  <p className="text-gray-500">
                    Only these Telegram users can use the bot while Restrict Mode is enabled.
                  </p>
                  <p className="text-gray-500">
                    Configured admin Telegram IDs are always allowed.
                  </p>
                  {hasInvalidAllowListTokens ? (
                    <p className="text-red-600">
                      Invalid Telegram IDs: {parsedAllowList.invalidTokens.join(", ")}
                    </p>
                  ) : null}
                  {allowListTooLarge ? (
                    <p className="text-red-600">
                      Restrict allow list cannot exceed 5000 users.
                    </p>
                  ) : null}
                </div>

                {parsedAllowList.validIds.length > 0 ? (
                  <div className="mt-3 max-h-64 divide-y divide-gray-100 overflow-auto rounded-lg border border-gray-200">
                    {parsedAllowList.validIds.map((telegramUserId) => (
                      <div
                        key={telegramUserId}
                        className="flex items-center justify-between gap-3 px-3 py-2"
                      >
                        <span className="font-mono text-sm text-gray-800">{telegramUserId}</span>
                        <button
                          type="button"
                          onClick={() => removeAllowedTelegramUserId(telegramUserId)}
                          disabled={saveLoading}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-gray-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Remove Telegram User ID ${telegramUserId}`}
                          title="Remove"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        {data && (
          <p className="text-xs text-gray-500">
            Last updated: {formatDate(data.updatedAt)}
          </p>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            loading={saveLoading}
            disabled={hasInvalidAllowListTokens || allowListTooLarge}
          >
            {saveLoading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
