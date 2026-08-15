import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TrackingTimeline } from "../components/public/TrackingTimeline";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { formatDate } from "../lib/format";
import type { PublicTrackingCarrierInput, PublicTrackingResult } from "../lib/types/public-tracking";
import { usePublicTracking } from "../hooks/usePublicTracking";

const numericJntTrackingNumberPattern = /^[0-9]{6,32}$/;
const jntPhoneLast4Pattern = /^\d{4}$/;

const finalStatusMap = {
  PENDING: { label: "Đang xử lý", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  DELIVERED: { label: "Đã giao", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  FAILED: { label: "Thất bại", className: "bg-red-50 text-red-700 ring-red-200" },
  CANCELLED: { label: "Đã huỷ", className: "bg-red-50 text-red-700 ring-red-200" },
};

function carrierLabel(carrier: string) {
  return carrier === "JNT" ? "J&T" : carrier;
}

function optionalText(value: string | null | undefined) {
  return value && value.trim() ? value : "-";
}

function StatusPill({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${className}`}>
      {label}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-gray-100 py-3 first:border-t-0">
      <div className="text-xs font-medium uppercase text-gray-500">{label}</div>
      <div className="mt-1 break-words text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}

function ResultSummary({ result, telegramBotUrl }: { result: PublicTrackingResult; telegramBotUrl?: string }) {
  const finalStatus = finalStatusMap[result.finalStatus];

  return (
    <section className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="self-start rounded-lg border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-5">
        <div className="flex flex-wrap gap-2">
          <StatusPill label={carrierLabel(result.carrier)} className="bg-slate-50 text-slate-700 ring-slate-200" />
          <StatusPill label={finalStatus.label} className={finalStatus.className} />
        </div>

        <div className="mt-4">
          <div className="text-xs font-medium uppercase text-gray-500">Mã vận đơn</div>
          <h2 className="mt-1 break-all font-mono text-lg font-semibold text-gray-950">{result.trackingNumber}</h2>
        </div>

        <div className="mt-5">
          <InfoRow label="Trạng thái mới nhất" value={optionalText(result.latest.status)} />
          <InfoRow label="Vị trí hiện tại" value={optionalText(result.latest.location)} />
          <InfoRow label="Vị trí tiếp theo" value={optionalText(result.latest.nextLocation)} />
          <InfoRow
            label="Cập nhật lúc"
            value={result.latest.eventTime ? formatDate(result.latest.eventTime) : "-"}
          />
        </div>

        {telegramBotUrl && (
          <a
            href={telegramBotUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
          >
            Theo dõi tự động trên Telegram
          </a>
        )}
      </aside>

      <TrackingTimeline events={result.events.length ? result.events : [result.latest]} />
    </section>
  );
}

export function PublicTrackingPage() {
  const [carrier, setCarrier] = useState<PublicTrackingCarrierInput>("AUTO");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingCredential, setTrackingCredential] = useState("");
  const [result, setResult] = useState<PublicTrackingResult | null>(null);
  const trackMutation = usePublicTracking();
  const telegramBotUrl = import.meta.env.VITE_TELEGRAM_BOT_URL as string | undefined;
  const normalizedTrackingNumber = trackingNumber.trim().toUpperCase();
  const shouldShowJntCredential =
    carrier === "JNT" || (carrier === "AUTO" && numericJntTrackingNumberPattern.test(normalizedTrackingNumber));

  const helperText = useMemo(() => {
    if (shouldShowJntCredential) {
      return "J&T cần 4 số cuối SĐT để tra cứu.";
    }

    return "SPX và GHN có thể tra cứu trực tiếp bằng mã vận đơn.";
  }, [shouldShowJntCredential]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!normalizedTrackingNumber) {
      toast.error("Vui lòng nhập mã vận đơn");
      return;
    }

    const normalizedCredential = trackingCredential.trim();

    if (shouldShowJntCredential && !jntPhoneLast4Pattern.test(normalizedCredential)) {
      toast.error("J&T cần đúng 4 số cuối SĐT");
      return;
    }

    try {
      const nextResult = await trackMutation.mutateAsync({
        carrier,
        trackingNumber: normalizedTrackingNumber,
        trackingCredential: shouldShowJntCredential ? normalizedCredential : undefined,
      });
      setResult(nextResult);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tra cứu vận đơn");
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div>
            <div className="text-base font-bold text-gray-950">Express Tracking</div>
            <div className="text-xs text-gray-500">SPX, GHN, J&T</div>
          </div>
          {telegramBotUrl && (
            <a
              href={telegramBotUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Telegram Bot
            </a>
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-gray-950">Tra cứu vận đơn</h1>
          <p className="mt-1 text-sm text-gray-500">Xem hành trình đơn hàng từ dữ liệu tracking nội bộ.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div
            className={
              shouldShowJntCredential
                ? "grid gap-3 md:grid-cols-[170px_minmax(0,1fr)_180px_auto] md:items-end"
                : "grid gap-3 md:grid-cols-[170px_minmax(0,1fr)_auto] md:items-end"
            }
          >
            <div>
              <label htmlFor="public-carrier" className="mb-1 block text-sm font-medium text-gray-700">
                Đơn vị vận chuyển
              </label>
              <select
                id="public-carrier"
                value={carrier}
                onChange={(event) => setCarrier(event.target.value as PublicTrackingCarrierInput)}
                className="block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm shadow-sm transition focus:outline-none focus:ring-1 focus:ring-gray-900"
              >
                <option value="AUTO">Tự động</option>
                <option value="SPX">SPX</option>
                <option value="GHN">GHN</option>
                <option value="JNT">J&amp;T</option>
              </select>
            </div>
            <Input
              label="Mã vận đơn"
              placeholder="SPXVN063015366786, VN260473135399R, VNGH80667097209, 862195772225"
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              autoComplete="off"
            />
            {shouldShowJntCredential && (
              <Input
                label="4 số cuối SĐT"
                placeholder="9613"
                value={trackingCredential}
                onChange={(event) => setTrackingCredential(event.target.value.replace(/\D/g, "").slice(0, 4))}
                maxLength={4}
                inputMode="numeric"
              />
            )}
            <Button type="submit" loading={trackMutation.isPending} className="h-10 px-5">
              Tra cứu
            </Button>
          </div>
          <p className="mt-3 text-sm text-gray-500">{helperText}</p>
        </form>

        <div className="mt-5">
          {result ? (
            <ResultSummary result={result} telegramBotUrl={telegramBotUrl} />
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white px-5 py-12 text-center">
              <div className="text-sm font-medium text-gray-900">Nhập mã vận đơn để bắt đầu tra cứu</div>
              <div className="mt-1 text-sm text-gray-500">Kết quả sẽ hiển thị theo dạng timeline mới nhất ở trên.</div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
