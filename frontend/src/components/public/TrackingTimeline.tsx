import { useState } from "react";
import type { PublicTrackingEvent } from "../../lib/types/public-tracking";

type Props = {
  events: PublicTrackingEvent[];
};

const timeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatTime(value: string) {
  return timeFormatter.format(new Date(value));
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function optionalText(value: string | null | undefined) {
  return value && value.trim() ? value : "-";
}

function eventTitle(event: PublicTrackingEvent) {
  return event.status || event.description || event.buyerDescription || event.trackingName || event.trackingCode;
}

export function TrackingTimeline({ events }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (!events.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
        Không có lịch sử chi tiết cho vận đơn này.
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-gray-950">Hành trình vận đơn</h2>
          <p className="mt-0.5 text-sm text-gray-500">{events.length} sự kiện tracking</p>
        </div>
        <div className="text-xs font-medium text-gray-500">Mới nhất ở trên</div>
      </div>

      <div className="divide-y divide-gray-100">
        {events.map((event, index) => {
          const key = `${event.trackingCode}-${event.eventTime}-${index}`;
          const isOpen = openKey === key;

          return (
            <div key={key} className="grid grid-cols-[84px_28px_minmax(0,1fr)] px-4 py-4 sm:grid-cols-[110px_32px_minmax(0,1fr)] sm:px-5">
              <div className="pt-0.5 text-right">
                <div className="font-mono text-sm font-semibold text-gray-950">{formatTime(event.eventTime)}</div>
                <div className="mt-0.5 text-[11px] text-gray-500">{formatDate(event.eventTime)}</div>
              </div>

              <div className="relative flex justify-center">
                <div className="absolute top-0 bottom-0 w-px bg-gray-200" />
                <span className="relative mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-gray-900 bg-white" />
              </div>

              <div className="min-w-0">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  className="group w-full rounded-md text-left focus:outline-none focus:ring-2 focus:ring-gray-900"
                  onClick={() => setOpenKey(isOpen ? null : key)}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold leading-6 text-gray-950">{eventTitle(event)}</div>
                      {(event.location || event.nextLocation) && (
                        <div className="mt-1 text-sm text-gray-500">
                          {event.location && <span>{event.location}</span>}
                          {event.location && event.nextLocation && <span> - </span>}
                          {event.nextLocation && <span>{event.nextLocation}</span>}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 pt-1 text-xs font-medium text-gray-400 group-hover:text-gray-700">
                      {isOpen ? "Thu gọn" : "Chi tiết"}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="mt-3 grid gap-x-5 gap-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 sm:grid-cols-2">
                    <div>
                      <div className="text-xs font-semibold uppercase text-gray-500">Trạng thái</div>
                      <div className="mt-1">{optionalText(event.status)}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase text-gray-500">Mã trạng thái</div>
                      <div className="mt-1 font-mono text-xs">{optionalText(event.trackingCode)}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase text-gray-500">Vị trí hiện tại</div>
                      <div className="mt-1">{optionalText(event.location)}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase text-gray-500">Vị trí tiếp theo</div>
                      <div className="mt-1">{optionalText(event.nextLocation)}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase text-gray-500">Giai đoạn</div>
                      <div className="mt-1">{optionalText(event.milestoneName || event.milestoneCode)}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase text-gray-500">Thời gian</div>
                      <div className="mt-1">{`${formatTime(event.eventTime)} ${formatDate(event.eventTime)}`}</div>
                    </div>
                    {(event.description || event.buyerDescription || event.sellerDescription) && (
                      <div className="sm:col-span-2">
                        <div className="text-xs font-semibold uppercase text-gray-500">Mô tả</div>
                        <div className="mt-1">
                          {optionalText(event.description || event.buyerDescription || event.sellerDescription)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
