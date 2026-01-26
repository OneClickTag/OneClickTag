import { UserProfile } from './user.types';

export interface LoginResponse {
  access_token: string;
  user: UserProfile;
}

export interface AuthUser {
  userId: string;
  email: string;
}
