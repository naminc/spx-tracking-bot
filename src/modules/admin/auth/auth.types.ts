export type AdminUser = {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
};

export type JwtAdminPayload = {
  sub: string;
  username: string | null;
  role: 'ADMIN';
  iat: number;
  exp: number;
};
