import type { Request, Response } from 'express';
import { successResponse } from '../../shared/response/api-response';
import { TrackingService, trackingService } from './tracking.service';

export class TrackingController {
  constructor(private readonly service: TrackingService = trackingService) {}

  listOrders = async (request: Request, response: Response): Promise<void> => {
    const { trackingNumber, telegramChatId, userId, telegramUserId, includeCompleted } =
      request.query as unknown as {
      trackingNumber?: string;
      telegramChatId?: string;
      userId?: number;
      telegramUserId?: string;
      includeCompleted?: boolean;
    };

    const orders = await this.service.listOrders({
      trackingNumber,
      telegramChatId,
      userId,
      telegramUserId,
      includeCompleted,
    });
    response.json(successResponse('Lấy danh sách đơn hàng thành công', orders));
  };

  listHistories = async (request: Request, response: Response): Promise<void> => {
    const { trackingNumber, telegramChatId, userId, telegramUserId, limit } = request.query as unknown as {
      trackingNumber?: string;
      telegramChatId?: string;
      userId?: number;
      telegramUserId?: string;
      limit?: number;
    };

    const histories = await this.service.listHistories({
      trackingNumber,
      telegramChatId,
      userId,
      telegramUserId,
      limit,
    });
    response.json(successResponse('Lấy lịch sử tracking thành công', histories));
  };

  getOrder = async (request: Request, response: Response): Promise<void> => {
    const { trackingNumber } = request.params as { trackingNumber: string };
    const order = await this.service.getOrder(trackingNumber);
    response.json(successResponse('Lấy thông tin đơn hàng thành công', order));
  };

  createOrder = async (request: Request, response: Response): Promise<void> => {
    const { trackingNumber, telegramChatId, note } = request.body as {
      trackingNumber: string;
      telegramChatId: string;
      note?: string | null;
    };

    const result = await this.service.addOrder(trackingNumber, telegramChatId, note);
    response
      .status(result.alreadyExists ? 200 : 201)
      .json(
        successResponse(
          result.alreadyExists
            ? 'Đơn hàng đã tồn tại trong danh sách theo dõi'
            : 'Thêm đơn hàng thành công',
          {
            order: result.order,
            alreadyExists: result.alreadyExists,
            noteUpdated: result.noteUpdated,
          },
        ),
      );
  };

  deleteOrder = async (request: Request, response: Response): Promise<void> => {
    const { trackingNumber } = request.params as { trackingNumber: string };
    const { telegramChatId } = request.query as unknown as { telegramChatId: string };
    const deletedOrder = await this.service.removeOrder(trackingNumber, telegramChatId);
    response.json(successResponse('Xóa theo dõi đơn hàng thành công', deletedOrder));
  };

  getHistories = async (request: Request, response: Response): Promise<void> => {
    const { trackingNumber } = request.params as { trackingNumber: string };
    const histories = await this.service.getHistories(trackingNumber);
    response.json(successResponse('Lấy lịch sử đơn hàng thành công', histories));
  };
}

export const trackingController = new TrackingController();
