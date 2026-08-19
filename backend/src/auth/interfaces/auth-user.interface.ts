export interface AuthUser {
  id: number;
  username: string;
  roles: string[];
  companiaId?: number;
}
