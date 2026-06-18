import type { Request, Response } from 'express';
import { successResponse } from '../../../shared/response/api-response';
import {
  BroadcastService,
  broadcastService,
} from './broadcast.service';
import type { CreateBroadcastInput } from './broadcast.schema';

export class BroadcastController {
  constructor(private readonly service: BroadcastService = broadcastService) {}

  listBroadcasts = async (_request: Request, response: Response): Promise<void> => {
    const broadcasts = await this.service.listBroadcasts();
    response.json(successResponse('Lấy danh sách broadcast thành công', broadcasts));
  };

  getBroadcast = async (request: Request, response: Response): Promise<void> => {
    const { id } = request.params as unknown as { id: number };
    const broadcast = await this.service.getBroadcast(id);
    response.json(successResponse('Lấy chi tiết broadcast thành công', broadcast));
  };

  createBroadcast = async (request: Request, response: Response): Promise<void> => {
    const broadcast = await this.service.createBroadcast(
      request.body as CreateBroadcastInput,
    );
    response
      .status(201)
      .json(successResponse('Tạo broadcast thành công', broadcast));
  };

  sendBroadcast = async (request: Request, response: Response): Promise<void> => {
    const { id } = request.params as unknown as { id: number };
    const broadcast = await this.service.sendBroadcast(id);
    response.json(successResponse('Gửi broadcast hoàn tất', broadcast));
  };
}

export const broadcastController = new BroadcastController();
