import type { Request, Response } from 'express';
import { successResponse } from '../../../shared/response/api-response';
import { UserRepository, userRepository } from './user.repository';
import type { ListUsersQuery } from './user.schema';

export class UserController {
  constructor(private readonly repository: UserRepository = userRepository) {}

  listUsers = async (request: Request, response: Response): Promise<void> => {
    const users = await this.repository.listUsers(request.query as unknown as ListUsersQuery);
    response.json(successResponse('Lấy danh sách người dùng thành công', users));
  };
}

export const userController = new UserController();
