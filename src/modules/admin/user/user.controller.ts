import type { Request, Response } from 'express';
import { successResponse } from '../../../shared/response/api-response';
import { UserRepository, userRepository } from './user.repository';

export class UserController {
  constructor(private readonly repository: UserRepository = userRepository) {}

  listUsers = async (_request: Request, response: Response): Promise<void> => {
    const users = await this.repository.listUsers();
    response.json(successResponse('Lấy danh sách người dùng thành công', users));
  };
}

export const userController = new UserController();
