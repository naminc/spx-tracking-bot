import { useState, useEffect, useCallback } from "react";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";
import type { ShopSettings } from "../hooks/useSettings";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Button } from "../components/ui/Button";
import { ErrorState } from "../components/ui/ErrorState";

type FormData = Omit<ShopSettings, "id" | "updatedAt">;

function toForm(s: ShopSettings): FormData {
  return {
    shopName: s.shopName,
    shopTitle: s.shopTitle,
    shopChannelUrl: s.shopChannelUrl ?? "",
    shopWelcomeText: s.shopWelcomeText,
    shopSupportText: s.shopSupportText,
    shopStartCta: s.shopStartCta,
    supportContact: s.supportContact,
    adminContact: s.adminContact ?? "",
    bankName: s.bankName,
    bankBin: s.bankBin,
    bankAccountNumber: s.bankAccountNumber,
    bankAccountName: s.bankAccountName,
    vietqrTemplate: s.vietqrTemplate,
    depositMinAmount: s.depositMinAmount,
    depositMaxAmount: s.depositMaxAmount,
    depositDescription: s.depositDescription,
    depositPrefix: s.depositPrefix,
    depositExpireMinutes: s.depositExpireMinutes,
    broadcastBatchSize: s.broadcastBatchSize,
    broadcastDelayMs: s.broadcastDelayMs,
    maintenanceEnabled: s.maintenanceEnabled,
    maintenanceMessage: s.maintenanceMessage
  };
}

function Section({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">
        {title}
      </h2>
      {children}
    </div>
  );
}

export function SettingsPage() {
  const { data, isLoading, error, refetch } = useSettings();
  const updateMut = useUpdateSettings();
  const [form, setForm] = useState<FormData | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data && !form) {
      setForm(toForm(data));
    }
  }, [data, form]);

  const set = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
      setDirty(true);
    },
    []
  );

  const handleSave = () => {
    if (!form) return;
    updateMut.mutate(form, {
      onSuccess: () => setDirty(false)
    });
  };

  const handleReset = () => {
    if (data) {
      setForm(toForm(data));
      setDirty(false);
    }
  };

  if (isLoading) return null;
  if (error)
    return (
      <ErrorState
        message={(error as Error).message}
        onRetry={() => refetch()}
      />
    );
  if (!form) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Shop">
          <Input
            label="Shop Name"
            value={form.shopName}
            onChange={(e) => set("shopName", e.target.value)}
            required
          />
          <Input
            label="Shop Title"
            value={form.shopTitle}
            onChange={(e) => set("shopTitle", e.target.value)}
            required
          />
          <Input
            label="Channel URL"
            value={form.shopChannelUrl ?? ""}
            onChange={(e) => set("shopChannelUrl", e.target.value || null)}
            placeholder="https://t.me/yourchannel"
          />
        </Section>

        <Section title="Support Contact">
          <Input
            label="Support Contact"
            value={form.supportContact}
            onChange={(e) => set("supportContact", e.target.value)}
            required
            placeholder="@username"
          />
          <Input
            label="Admin Contact"
            value={form.adminContact ?? ""}
            onChange={(e) => set("adminContact", e.target.value || null)}
            placeholder="@admin"
          />
        </Section>

        <Section title="Welcome Texts">
          <Textarea
            label="Welcome Text"
            value={form.shopWelcomeText}
            onChange={(e) => set("shopWelcomeText", e.target.value)}
            rows={2}
          />
          <Textarea
            label="Support Text"
            value={form.shopSupportText}
            onChange={(e) => set("shopSupportText", e.target.value)}
            rows={2}
          />
          <Input
            label="Start CTA"
            value={form.shopStartCta}
            onChange={(e) => set("shopStartCta", e.target.value)}
            required
          />
        </Section>

        <Section title="Bank / VietQR">
          <Input
            label="Bank Name"
            value={form.bankName}
            onChange={(e) => set("bankName", e.target.value)}
            required
          />
          <Input
            label="Bank BIN"
            value={form.bankBin}
            onChange={(e) => set("bankBin", e.target.value)}
            required
          />
          <Input
            label="Account Number"
            value={form.bankAccountNumber}
            onChange={(e) => set("bankAccountNumber", e.target.value)}
            required
          />
          <Input
            label="Account Name"
            value={form.bankAccountName}
            onChange={(e) => set("bankAccountName", e.target.value)}
            required
          />
          <Input
            label="VietQR Template"
            value={form.vietqrTemplate}
            onChange={(e) => set("vietqrTemplate", e.target.value)}
            required
          />
        </Section>

        <Section title="Deposit Rules">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Amount (VND)"
              type="number"
              value={String(form.depositMinAmount)}
              onChange={(e) => set("depositMinAmount", Number(e.target.value))}
              required
            />
            <Input
              label="Max Amount (VND)"
              type="number"
              value={String(form.depositMaxAmount)}
              onChange={(e) => set("depositMaxAmount", Number(e.target.value))}
              required
            />
            <Input
              label="Expire (minutes)"
              type="number"
              value={String(form.depositExpireMinutes)}
              onChange={(e) =>
                set("depositExpireMinutes", Number(e.target.value))
              }
              required
            />
            <Input
              label="Deposit Prefix"
              value={form.depositPrefix}
              onChange={(e) => set("depositPrefix", e.target.value)}
              required
            />
          </div>
          <Textarea
            label="Deposit Description"
            value={form.depositDescription}
            onChange={(e) => set("depositDescription", e.target.value)}
            rows={3}
          />
        </Section>

        <Section title="Broadcast Defaults">
          <Input
            label="Batch Size (1-100)"
            type="number"
            value={String(form.broadcastBatchSize)}
            onChange={(e) => set("broadcastBatchSize", Number(e.target.value))}
            required
          />
          <Input
            label="Delay Between Batches (ms)"
            type="number"
            value={String(form.broadcastDelayMs)}
            onChange={(e) => set("broadcastDelayMs", Number(e.target.value))}
            required
          />
        </Section>

        <Section title="Bot Maintenance">
          <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
            <input
              type="checkbox"
              checked={form.maintenanceEnabled}
              onChange={(e) => set("maintenanceEnabled", e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              <span className="block text-sm font-medium text-gray-900">
                Enable maintenance mode
              </span>
              <span className="block text-xs text-gray-500">
                Regular users will only see the maintenance message. Admins can
                still use admin tools.
              </span>
            </span>
          </label>
          <Textarea
            label="Maintenance Message"
            value={form.maintenanceMessage}
            onChange={(e) => set("maintenanceMessage", e.target.value)}
            rows={3}
            maxLength={500}
          />
        </Section>
      </div>

      <div className="flex justify-end gap-2 pb-6">
        <Button variant="secondary" onClick={handleReset} disabled={!dirty}>
          Reset
        </Button>
        <Button
          onClick={handleSave}
          loading={updateMut.isPending}
          disabled={!dirty}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
