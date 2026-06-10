import type { Request, Response } from 'express';
import { successResponse } from '../../shared/response/api-response';
import { TrackingService, trackingService } from './tracking.service';

export class TrackingController {
  constructor(private readonly service: TrackingService = trackingService) {}

  listOrders = async (request: Request, response: Response): Promise<void> => {
    const { telegramChatId, includeCompleted } = request.query as unknown as {
      telegramChatId?: string;
      includeCompleted?: boolean;
    };

    const orders = await this.service.listOrders(telegramChatId, includeCompleted);
    response.json(successResponse('Lấy danh sách đơn hàng thành công', orders));
  };

  getOrder = async (request: Request, response: Response): Promise<void> => {
    const { trackingNumber } = request.params as { trackingNumber: string };
    const order = await this.service.getOrder(trackingNumber);
    response.json(successResponse('Lấy thông tin đơn hàng thành công', order));
  };

  createOrder = async (request: Request, response: Response): Promise<void> => {
    const { trackingNumber, telegramChatId } = request.body as {
      trackingNumber: string;
      telegramChatId: string;
    };

    const result = await this.service.addOrder(trackingNumber, telegramChatId);
    response
      .status(result.alreadyExists ? 200 : 201)
      .json(
        successResponse(
          result.alreadyExists ? 'Đơn hàng đã tồn tại trong danh sách theo dõi' : 'Thêm đơn hàng thành công',
          result.order,
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
