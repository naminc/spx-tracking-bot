import type { AddTrackingResult } from '../tracking/tracking.service';
import type { TrackingCarrier } from '../tracking/tracking-carrier';
import { FinalStatus } from '../tracking/final-status';

type OrderListItem = {
  carrier: TrackingCarrier;
  trackingNumber: string;
  currentStatus: string;
  lastEventTime: Date;
  note?: string | null;
};

type TrackingMessageInput = {
  carrier: TrackingCarrier;
  trackingNumber: string;
  status: string;
  location?: string;
  nextLocation?: string;
  eventTime: Date;
  note?: string | null;
};

type UpdateMessageInput = TrackingMessageInput & {
  trackingCode: string;
  location?: string;
  nextLocation?: string;
  milestoneName?: string;
};

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);

const removeCommandIcon = '<tg-emoji emoji-id="5089513980649538387">❎</tg-emoji>';
const contactCommandIcon = '<tg-emoji emoji-id="5443038326535759644">☎️</tg-emoji>';
const addCommandIcon = '<tg-emoji emoji-id="5305460950562777340">➕</tg-emoji>';
const startCommandIcon = '<tg-emoji emoji-id="6203791465471022369">ℹ️</tg-emoji>';
const listCommandIcon = '<tg-emoji emoji-id="5265132878395621818">📋</tg-emoji>';
const truckCommandIcon = '<tg-emoji emoji-id="6314504740130525114">🚚</tg-emoji>';
const helloCommandIcon = '<tg-emoji emoji-id="6143364153244390082">👋</tg-emoji>';
const exampleCommandIcon = '<tg-emoji emoji-id="6138429248706188838">🧾</tg-emoji>';
const noteCommandIcon = '<tg-emoji emoji-id="5298742255912235479">❌</tg-emoji>';
const adminCommandIcon = '<tg-emoji emoji-id="6287130615745615050">👮</tg-emoji>';
const callCommandIcon = '<tg-emoji emoji-id="5847950190887046211">☎️</tg-emoji>';
const robotCommandIcon = '<tg-emoji emoji-id="5352899869369446268">📌</tg-emoji>';
const successCommandIcon = '<tg-emoji emoji-id="6113738224750826011">✅</tg-emoji>';
const codeCommandIcon = '<tg-emoji emoji-id="5913410302841458295">💻</tg-emoji>';
const chartCommandIcon = '<tg-emoji emoji-id="5246762912428603768">📊</tg-emoji>';
const timeCommandIcon = '🕒';
const statusCommandIcon = '📌';

const buildLocationLines = (input: { location?: string; nextLocation?: string }): string => {
  const lines = [
    input.location ? `📍 <b>Vị trí hiện tại:</b> ${escapeHtml(input.location)}` : undefined,
    input.nextLocation ? `🚚 <b>Vị trí tiếp theo:</b> ${escapeHtml(input.nextLocation)}` : undefined,
  ]
    .filter(Boolean)
    .join('\n');

  return lines ? `\n${lines}` : '';
};

const buildNoteLine = (note?: string | null): string => {
  const trimmedNote = note?.trim();
  return trimmedNote ? `\n📝 <b>Ghi chú:</b> ${escapeHtml(trimmedNote)}` : '';
};

const carrierLabels: Record<string, string> = {
  SPX: 'SPX',
  GHN: 'GHN',
  JNT: 'J&T',
};

const formatCarrier = (carrier: TrackingCarrier): string => carrierLabels[carrier] ?? carrier;

const buildCarrierLine = (carrier: TrackingCarrier): string =>
  `\n🚚 <b>Đơn vị:</b> ${escapeHtml(formatCarrier(carrier))}`;

const buildCompletedMessage = (title: string, input: TrackingMessageInput): string => `<b>${title}</b>
━━━━━━━━━━━━━━━━

📦 <b>Mã vận đơn:</b> <code>${escapeHtml(input.trackingNumber)}</code>${buildCarrierLine(input.carrier)}${buildNoteLine(input.note)}
📌 <b>Trạng thái:</b> ${escapeHtml(input.status)}${buildLocationLines(input)}
${timeCommandIcon} <b>Thời gian:</b> ${escapeHtml(formatDate(input.eventTime))}
⛔ <b>Theo dõi:</b> Bot đã tự động ngừng theo dõi đơn này.`;

const getCompletedTitle = (finalStatus: FinalStatus): string => {
  if (finalStatus === FinalStatus.DELIVERED) {
    return '🎉 Đơn hàng đã giao thành công!';
  }

  if (finalStatus === FinalStatus.FAILED) {
    return '❌ Giao hàng thất bại';
  }

  if (finalStatus === FinalStatus.CANCELLED) {
    return '🚫 Đơn hàng đã bị huỷ';
  }

  return 'ℹ️ Đơn này đã hoàn tất';
};

export const telegramMessageBuilder = {
  start(): string {
    return `<b>${truckCommandIcon} EXPRESS TRACKING BOT</b>
━━━━━━━━━━━━━━━━

${helloCommandIcon} Xin chào! Mình có thể giúp bạn theo dõi trạng thái đơn hàng <b>SPX/GHN/J&T</b> tự động.

<b>${robotCommandIcon} Lệnh hỗ trợ</b>
━━━━━━━━━━━━━━━━
${addCommandIcon} <b>/add &lt;mã vận đơn&gt; &lt;ghi chú&gt;</b> - Thêm đơn hàng cần theo dõi
${addCommandIcon} <b>/add jnt &lt;mã vận đơn&gt; &lt;4 số cuối SĐT&gt; &lt;ghi chú&gt;</b> - Thêm đơn <b>J&T</b>
${listCommandIcon} <b>/list</b> - Xem danh sách đơn đang theo dõi
${removeCommandIcon} <b>/remove &lt;mã vận đơn&gt;</b> - Xoá đơn khỏi danh sách
${removeCommandIcon} <b>/remove jnt &lt;mã vận đơn&gt;</b> - Xoá đơn <b>J&T</b>
${truckCommandIcon} <b>/carriers</b> - Xem đơn vị vận chuyển hỗ trợ
${contactCommandIcon} <b>/contact</b> - Liên hệ admin
${startCommandIcon} <b>/help</b> - Xem hướng dẫn chi tiết

${exampleCommandIcon} <b>Ví dụ SPX:</b> <code>/add SPXVN063015366786 iPhone 17</code>
${exampleCommandIcon} <b>Ví dụ GHN:</b> <code>/add GYH9PRA6 Macbook Pro</code>
${exampleCommandIcon} <b>Ví dụ J&T:</b> <code>/add jnt 862195772225 9613 Hàng khách A</code>
${noteCommandIcon} <b>Lưu ý:</b> Ghi chú có thể để trống`;
  },

  help(): string {
    return `<b>${startCommandIcon} Hướng dẫn chi tiết</b>
━━━━━━━━━━━━━━━━

<b>1. Thêm đơn theo dõi</b>
${codeCommandIcon} <b>Cú pháp:</b> <code>/add &lt;mã_vận_đơn&gt; &lt;ghi_chú&gt;</code>
${codeCommandIcon} <b>Cú pháp J&T:</b> <code>/add jnt &lt;mã_vận_đơn&gt; &lt;4_số_cuối_SĐT&gt; &lt;ghi_chú&gt;</code>
${noteCommandIcon} <b>Chú ý:</b> <b>&lt;ghi_chú&gt;</b> có thể để trống. Bot tự nhận diện <b>SPX/GHN</b> theo mã vận đơn. <b>J&T</b> cần thêm 4 số cuối SĐT.
${exampleCommandIcon} <b>SPX:</b> <code>/add SPXVN063015366786 iPhone 17</code>
${exampleCommandIcon} <b>GHN:</b> <code>/add GYH9PRA6 Macbook Pro</code>
${exampleCommandIcon} <b>J&T:</b> <code>/add jnt 862195772225 9613 Hàng khách A</code>

<b>2. Xem danh sách đang theo dõi</b>
${listCommandIcon} <code>/list</code>

<b>3. Xoá đơn khỏi danh sách</b>
${codeCommandIcon} <b>Cú pháp:</b> <code>/remove &lt;mã_vận_đơn&gt;</code>
${exampleCommandIcon} <b>Ví dụ:</b> <code>/remove SPXVN063015366786</code>
${exampleCommandIcon} <b>Ví dụ J&T:</b> <code>/remove jnt 862195772225</code>

<b>4. Xem đơn vị vận chuyển hỗ trợ</b>
${truckCommandIcon} <code>/carriers</code>

<b>5. Liên hệ admin</b>
${contactCommandIcon} <code>/contact</code>`;
  },

  supportedCarriers(): string {
    return `<b>${truckCommandIcon} Đơn vị vận chuyển hỗ trợ</b>
━━━━━━━━━━━━━━━━

<b>SPX Express</b>
🧾 <b>Định dạng:</b> <code>SPXVN...</code>
${exampleCommandIcon} <b>Ví dụ:</b> <code>SPXVN063015366786</code>

<b>Giao Hàng Nhanh - GHN</b>
🧾 <b>Định dạng:</b> Mã chữ/số, 6-32 ký tự
${exampleCommandIcon} <b>Ví dụ:</b> <code>GYH9PRA6</code>

<b>J&T Express</b>
🧾 <b>Định dạng:</b> Mã chữ/số, 6-32 ký tự
${exampleCommandIcon} <b>Ví dụ:</b> <code>862195772225</code>
${noteCommandIcon} <b>Lưu ý:</b> <b>J&T</b> cần 4 số cuối SĐT để tra cứu.

${startCommandIcon} <b>Cách dùng:</b> <b>SPX/GHN</b> dùng <code>/add &lt;mã_vận_đơn&gt; &lt;ghi_chú&gt;</code>. <b>J&T</b> dùng <code>/add jnt &lt;mã_vận_đơn&gt; &lt;4_số_cuối_SĐT&gt; &lt;ghi_chú&gt;</code>.`;
  },

  contact(adminUsername: string): string {
    return `<b> ${callCommandIcon} Liên hệ admin</b>
━━━━━━━━━━━━━━━━

💬 <b>Hỗ trợ:</b> Nếu bạn cần hỗ trợ, vui lòng liên hệ:
${adminCommandIcon} <b>Admin Telegram:</b> ${escapeHtml(adminUsername)}`;
  },

  maintenance(): string {
    return `<b>⚠️ Bot đang bảo trì</b>
━━━━━━━━━━━━━━━━

Hiện tại bot đang tạm ngưng nhận đơn mới. Vui lòng thử lại sau hoặc dùng <b>/contact</b> để liên hệ admin.`;
  },

  blockedUser(): string {
    return `<b>🚫 Tài khoản bị hạn chế</b>
━━━━━━━━━━━━━━━━

Tài khoản của bạn hiện không thể sử dụng chức năng theo dõi. Vui lòng liên hệ admin nếu cần hỗ trợ.`;
  },

  addInstruction(): string {
    return `<b>${addCommandIcon} Thêm đơn tracking</b>
━━━━━━━━━━━━━━━━

${startCommandIcon} <b>Hướng dẫn:</b> Vui lòng nhập mã vận đơn ngay sau lệnh <b>/add</b>.
${codeCommandIcon} <b>Cú pháp: <code>/add &lt;mã_vận_đơn&gt; &lt;ghi_chú&gt;</code></b>
${codeCommandIcon} <b>J&T: <code>/add jnt &lt;mã_vận_đơn&gt; &lt;4_số_cuối_SĐT&gt; &lt;ghi_chú&gt;</code></b>
${noteCommandIcon} <b>Lưu ý:</b> Ghi chú có thể để trống
${exampleCommandIcon} <b>Ví dụ SPX:</b> <code>/add SPXVN063015366786 iPhone 17</code>
${exampleCommandIcon} <b>Ví dụ GHN:</b> <code>/add GYH9PRA6 Macbook Pro</code>
${exampleCommandIcon} <b>Ví dụ J&T:</b> <code>/add jnt 862195772225 9613 Hàng khách A</code>`;
  },

  directTrackingNumberNotAllowed(trackingNumber: string): string {
    return `<b>➕ Vui lòng dùng lệnh /add</b>
━━━━━━━━━━━━━━━━

⚠️ <b>Lý do:</b> Bot chỉ thêm đơn khi bạn gửi đúng cú pháp.
${codeCommandIcon} <b>Cú pháp:</b> <code>/add ${escapeHtml(trackingNumber)} &lt;ghi_chú&gt;</code>`;
  },

  checking(trackingNumber: string): string {
    return `<b>🔍 Đang kiểm tra đơn hàng</b>
━━━━━━━━━━━━━━━━

📦 <b>Mã vận đơn:</b> <code>${escapeHtml(trackingNumber)}</code>
⏳ <b>Xử lý:</b> Vui lòng chờ trong giây lát...`;
  },

  addSuccess(result: AddTrackingResult): string {
    return `<b>${successCommandIcon} Đã thêm đơn tracking thành công!</b>
━━━━━━━━━━━━━━━━

📦 <b>Mã vận đơn:</b> <code>${escapeHtml(result.order.trackingNumber)}</code>${buildCarrierLine(result.order.carrier)}${buildNoteLine(result.order.note)}
${statusCommandIcon} <b>Trạng thái hiện tại:</b> ${escapeHtml(result.order.currentStatus)}${buildLocationLines(result.latestRecord)}
${timeCommandIcon} <b>Thời gian cập nhật:</b> ${escapeHtml(formatDate(result.order.lastEventTime))}
🔔 <b>Theo dõi:</b> Bot sẽ tự động kiểm tra và gửi thông báo khi có trạng thái mới.`;
  },

  alreadyExists(result: AddTrackingResult): string {
    return `<b>ℹ️ Đơn này đang được theo dõi</b>
━━━━━━━━━━━━━━━━

📦 <b>Mã vận đơn:</b> <code>${escapeHtml(result.order.trackingNumber)}</code>${buildCarrierLine(result.order.carrier)}${buildNoteLine(result.order.note)}
${result.noteUpdated ? `${successCommandIcon} <b>Cập nhật:</b> Đã lưu ghi chú mới cho đơn này.\n` : ''}ℹ️ <b>Gợi ý:</b> Bạn có thể dùng <b>/list</b> để xem danh sách đơn đang theo dõi.`;
  },

  alreadyCompleted(result: AddTrackingResult): string {
    const completedMessage = buildCompletedMessage(getCompletedTitle(result.order.finalStatus), {
      carrier: result.order.carrier,
      trackingNumber: result.order.trackingNumber,
      status: result.order.currentStatus,
      location: result.order.currentLocation ?? undefined,
      nextLocation: result.order.nextLocation ?? undefined,
      eventTime: result.order.lastEventTime,
      note: result.order.note,
    });

    return `${completedMessage}
${result.noteUpdated ? `\n${successCommandIcon} <b>Cập nhật:</b> Đã lưu ghi chú mới cho đơn này.` : ''}
ℹ️ <b>Gợi ý:</b> Nếu muốn thêm lại từ đầu, hãy dùng <code>/remove ${escapeHtml(result.order.trackingNumber)}</code> rồi <code>/add</code> lại.`;
  },

  update(input: UpdateMessageInput): string {
    return `<b>🔔 ${escapeHtml(formatCarrier(input.carrier))} Update:</b> ${escapeHtml(input.status)}
━━━━━━━━━━━━━━━━

📦 <b>Mã vận đơn:</b> <code>${escapeHtml(input.trackingNumber)}</code>${buildCarrierLine(input.carrier)}${buildNoteLine(input.note)}
${statusCommandIcon} <b>Trạng thái:</b> ${escapeHtml(input.status)}
🏷️ <b>Mã trạng thái:</b> <code>${escapeHtml(input.trackingCode)}</code>
🚚 <b>Giai đoạn:</b> ${escapeHtml(input.milestoneName || 'Không có dữ liệu')}${buildLocationLines(input)}
${timeCommandIcon} <b>Thời gian:</b> ${escapeHtml(formatDate(input.eventTime))}`;
  },

  list(orders: OrderListItem[]): string {
    const orderItems = orders
      .map(
        (order, index) => `<b>${index + 1}. 📦 <code>${escapeHtml(order.trackingNumber)}</code></b>${buildCarrierLine(order.carrier)}${buildNoteLine(order.note)}
${statusCommandIcon} <b>Trạng thái:</b> ${escapeHtml(order.currentStatus)}
${timeCommandIcon} <b>Thời gian:</b> ${escapeHtml(formatDate(order.lastEventTime))}`,
      )
      .join('\n\n');

    return `<b>${listCommandIcon} Danh sách đơn đang theo dõi</b>
━━━━━━━━━━━━━━━━

${orderItems}

${chartCommandIcon} <b>Tổng cộng:</b> ${escapeHtml(orders.length)} đơn`;
  },

  emptyList(): string {
    return `<b>📭 Chưa có đơn nào đang theo dõi</b>
━━━━━━━━━━━━━━━━

${codeCommandIcon} <b>Lệnh mẫu:</b> <code>/add SPXVN063015366786</code>
${codeCommandIcon} <b>Lệnh mẫu GHN:</b> <code>/add GYH9PRA6</code>
${codeCommandIcon} <b>Lệnh mẫu J&T:</b> <code>/add jnt 862195772225 9613</code>`;
  },

  removeSuccess(trackingNumber: string, carrier: TrackingCarrier): string {
    return `<b>🗑️ Đã xoá đơn khỏi danh sách theo dõi</b>
━━━━━━━━━━━━━━━━

📦 <b>Mã vận đơn:</b> <code>${escapeHtml(trackingNumber)}</code>${buildCarrierLine(carrier)}`;
  },

  removeMissingTrackingNumber(): string {
    return `<b>${removeCommandIcon} Xoá đơn theo dõi</b>
━━━━━━━━━━━━━━━━

${startCommandIcon} <b>Hướng dẫn:</b> Vui lòng nhập mã vận đơn cần xoá sau lệnh <b>/remove</b>.
${codeCommandIcon} <b>Cú pháp: <code>/remove &lt;mã_vận_đơn&gt;</code></b>
${codeCommandIcon} <b>J&T: <code>/remove jnt &lt;mã_vận_đơn&gt;</code></b>
 ${exampleCommandIcon} <b>Ví dụ:</b> <code>/remove SPXVN063015366786</code>
${exampleCommandIcon} <b>Ví dụ J&T:</b> <code>/remove jnt 862195772225</code>`;
  },

  invalidTrackingNumber(): string {
    return `<b>❌ Mã vận đơn không hợp lệ</b>
━━━━━━━━━━━━━━━━

🧾 <b>Định dạng SPX:</b> <code>SPXVN063015366786</code>
🧾 <b>Định dạng GHN:</b> <code>GYH9PRA6</code>
🧾 <b>Định dạng J&T:</b> <code>/add jnt 862195772225 9613</code>
🔁 <b>Gợi ý:</b> Vui lòng kiểm tra lại và gửi lại mã đúng.`;
  },

  invalidJntCredential(): string {
    return `<b>❌ Thiếu 4 số cuối SĐT J&T</b>
━━━━━━━━━━━━━━━━

🧾 <b>Cú pháp J&T:</b> <code>/add jnt &lt;mã_vận_đơn&gt; &lt;4_số_cuối_SĐT&gt; &lt;ghi_chú&gt;</code>
${exampleCommandIcon} <b>Ví dụ:</b> <code>/add jnt 862195772225 9613 Hàng khách A</code>`;
  },

  noteTooLong(maxLength: number): string {
    return `<b>❌ Ghi chú quá dài</b>
━━━━━━━━━━━━━━━━

📝 <b>Giới hạn:</b> Ghi chú tối đa ${escapeHtml(maxLength)} ký tự.
🔁 <b>Gợi ý:</b> Vui lòng rút gọn ghi chú rồi gửi lại.`;
  },

  delivered(input: TrackingMessageInput): string {
    return buildCompletedMessage('🎉 Đơn hàng đã giao thành công!', input);
  },

  failed(input: TrackingMessageInput): string {
    return buildCompletedMessage('❌ Giao hàng thất bại', input);
  },

  cancelled(input: TrackingMessageInput): string {
    return buildCompletedMessage('🚫 Đơn hàng đã bị huỷ', input);
  },

  spxError(trackingNumber: string): string {
    return `<b>⚠️ Không thể kiểm tra đơn hàng</b>
━━━━━━━━━━━━━━━━

📦 <b>Mã vận đơn:</b> <code>${escapeHtml(trackingNumber)}</code>
⚠️ <b>Lý do:</b> Đơn vị vận chuyển chưa trả về dữ liệu hoặc API đang lỗi.
🔁 <b>Gợi ý:</b> Vui lòng thử lại sau.`;
  },

  unknownCommand(): string {
    return this.start();
  },
};
