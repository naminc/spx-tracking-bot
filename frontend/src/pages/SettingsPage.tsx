import { useEffect, useState } from "react";
import { formatDate } from "../lib/format";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";
import { Button } from "../components/ui/Button";
import { ErrorState } from "../components/ui/ErrorState";
import { Input } from "../components/ui/Input";

export function SettingsPage() {
  const { data, isLoading, error, refetch } = useSettings();
  const updateSettings = useUpdateSettings();
  const [adminContact, setAdminContact] = useState("");
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [showSaving, setShowSaving] = useState(false);
  const saveLoading = updateSettings.isPending || showSaving;

  useEffect(() => {
    if (data) {
      setAdminContact(data.adminContact);
      setMaintenanceEnabled(data.maintenanceEnabled);
    }
  }, [data]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const minimumSpinnerTime = new Promise((resolve) => {
      window.setTimeout(resolve, 450);
    });

    setShowSaving(true);
    try {
      await updateSettings.mutateAsync({
        adminContact,
        maintenanceEnabled,
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
    <div className="max-w-2xl space-y-4">
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
              Khi bật, bot sẽ tạm ngưng nhận đơn mới từ lệnh /add.
            </span>
          </span>
        </label>

        {data && (
          <p className="text-xs text-gray-500">
            Last updated: {formatDate(data.updatedAt)}
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" loading={saveLoading}>
            {saveLoading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
