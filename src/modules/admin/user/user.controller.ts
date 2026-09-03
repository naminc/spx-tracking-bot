import type { Request, Response } from 'express';
import { AppError } from '../../../shared/errors/app-error';
import { getPaginationMeta } from '../../../shared/pagination/pagination';
import { paginatedResponse, successResponse } from '../../../shared/response/api-response';
import { authService } from '../auth/auth.service';
import { UserRepository, userRepository } from './user.repository';
import type {
  BlockUserBody,
  BulkDeleteUsersBody,
  ListUsersQuery,
  UserIdParams,
} from './user.schema';

export class UserController {
  constructor(private readonly repository: UserRepository = userRepository) {}

  listUsers = async (request: Request, response: Response): Promise<void> => {
    const result = await this.repository.listUsers(request.query as unknown as ListUsersQuery);
    response.json(
      paginatedResponse(
        'Fetched users successfully',
        result.data,
        getPaginationMeta(result),
      ),
    );
  };

  previewZeroOrderUsers = async (_request: Request, response: Response): Promise<void> => {
    const result = await this.repository.previewZeroOrderUsers();
    response.json(successResponse('Fetched zero-order users successfully', result));
  };

  clearZeroOrderUsers = async (_request: Request, response: Response): Promise<void> => {
    const result = await this.repository.clearZeroOrderUsers();
    response.json(successResponse('Cleared zero-order users successfully', result));
  };

  blockUser = async (request: Request, response: Response): Promise<void> => {
    const { id } = request.params as unknown as UserIdParams;
    const { reason } = request.body as BlockUserBody;
    const admin = authService.requireAdmin(request);
    const existingUser = await this.repository.findById(id);

    if (!existingUser) {
      throw new AppError('User not found', 404);
    }

    const user = await this.repository.blockUser(id, {
      reason,
      blockedByAdminTelegramId: admin.telegramId,
      blockedByAdminUsername: admin.username,
    });

    response.json(successResponse('Blocked user successfully', user));
  };

  unblockUser = async (request: Request, response: Response): Promise<void> => {
    const { id } = request.params as unknown as UserIdParams;
    const existingUser = await this.repository.findById(id);

    if (!existingUser) {
      throw new AppError('User not found', 404);
    }

    const user = await this.repository.unblockUser(id);
    response.json(successResponse('Unblocked user successfully', user));
  };

  deleteUser = async (request: Request, response: Response): Promise<void> => {
    const { id } = request.params as unknown as UserIdParams;
    const result = await this.repository.deleteUsersByIds([id]);

    if (result.deletedCount === 0) {
      throw new AppError('User not found', 404);
    }

    response.json(
      successResponse('Deleted user successfully', {
        deletedCount: result.deletedCount,
        deletedUserIds: result.deletedUserIds,
      }),
    );
  };

  bulkDeleteUsers = async (request: Request, response: Response): Promise<void> => {
    const { userIds } = request.body as BulkDeleteUsersBody;
    const result = await this.repository.deleteUsersByIds(userIds, {
      matchTelegramUserIds: true,
    });

    response.json(successResponse('Deleted users successfully', result));
  };
}

export const userController = new UserController();
