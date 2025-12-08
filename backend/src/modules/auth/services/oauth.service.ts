import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { google } from 'googleapis';
import axios from 'axios';

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope: string;
  updatedAt?: Date;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

@Injectable()
export class OAuthService {
  private oauth2Client: any;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_CALLBACK_URL'),
    );
  }

  getAuthUrl(state: string, scopes: string[]): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state,
    });
  }

  async exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
    try {
      const { tokens } = await this.oauth2Client.getAccessToken(code);
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
        scope: tokens.scope || '',
        token_type: tokens.token_type || 'Bearer',
      };
    } catch (error) {
      throw new BadRequestException(`Failed to exchange code for tokens: ${error.message}`);
    }
  }

  async storeOAuthTokens(
    userId: string,
    tenantId: string,
    provider: string,
    scope: string,
    tokens: OAuthTokens,
  ): Promise<void> {
    await this.prisma.oAuthToken.upsert({
      where: {
        userId_provider_scope: {
          userId,
          provider,
          scope,
        },
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        updatedAt: new Date(),
      },
      create: {
        userId,
        tenantId,
        provider,
        scope,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
    });
  }

  async getOAuthTokens(
    userId: string,
    provider: string,
    scope: string,
  ): Promise<OAuthTokens | null> {
    const tokenRecord = await this.prisma.oAuthToken.findUnique({
      where: {
        userId_provider_scope: {
          userId,
          provider,
          scope,
        },
      },
    });

    if (!tokenRecord) {
      return null;
    }

    // Check if token is expired and needs refresh
    if (tokenRecord.expiresAt && tokenRecord.expiresAt <= new Date()) {
      if (tokenRecord.refreshToken) {
        return await this.refreshOAuthTokens(userId, provider, scope);
      } else {
        // Token expired and no refresh token available
        await this.deleteOAuthTokens(userId, provider, scope);
        return null;
      }
    }

    return {
      accessToken: tokenRecord.accessToken,
      refreshToken: tokenRecord.refreshToken,
      expiresAt: tokenRecord.expiresAt,
      scope: tokenRecord.scope,
      updatedAt: tokenRecord.updatedAt,
    };
  }

  async refreshOAuthTokens(
    userId: string,
    provider: string,
    scope: string,
  ): Promise<OAuthTokens | null> {
    const tokenRecord = await this.prisma.oAuthToken.findUnique({
      where: {
        userId_provider_scope: {
          userId,
          provider,
          scope,
        },
      },
    });

    if (!tokenRecord || !tokenRecord.refreshToken) {
      throw new NotFoundException('Refresh token not found');
    }

    try {
      if (provider === 'google') {
        this.oauth2Client.setCredentials({
          refresh_token: tokenRecord.refreshToken,
        });

        const { credentials } = await this.oauth2Client.refreshAccessToken();
        
        const expiresAt = credentials.expiry_date 
          ? new Date(credentials.expiry_date) 
          : new Date(Date.now() + 3600 * 1000);

        const newTokens: OAuthTokens = {
          accessToken: credentials.access_token,
          refreshToken: credentials.refresh_token || tokenRecord.refreshToken,
          expiresAt,
          scope: tokenRecord.scope,
          updatedAt: new Date(),
        };

        await this.storeOAuthTokens(
          userId,
          tokenRecord.tenantId,
          provider,
          scope,
          newTokens,
        );

        return newTokens;
      }
    } catch (error) {
      // If refresh fails, delete the token
      await this.deleteOAuthTokens(userId, provider, scope);
      throw new BadRequestException(`Failed to refresh token: ${error.message}`);
    }

    return null;
  }

  async deleteOAuthTokens(
    userId: string,
    provider: string,
    scope: string,
  ): Promise<void> {
    await this.prisma.oAuthToken.delete({
      where: {
        userId_provider_scope: {
          userId,
          provider,
          scope,
        },
      },
    });
  }

  async getUserOAuthTokens(userId: string, tenantId?: string) {
    const where: any = { userId };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    return await this.prisma.oAuthToken.findMany({
      where,
      select: {
        provider: true,
        scope: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async revokeOAuthTokens(
    userId: string,
    provider: string,
    scope: string,
  ): Promise<void> {
    const tokenRecord = await this.prisma.oAuthToken.findUnique({
      where: {
        userId_provider_scope: {
          userId,
          provider,
          scope,
        },
      },
    });

    if (!tokenRecord) {
      throw new NotFoundException('OAuth token not found');
    }

    try {
      if (provider === 'google') {
        // Revoke token with Google
        await axios.post(
          `https://oauth2.googleapis.com/revoke?token=${tokenRecord.accessToken}`,
        );
      }
    } catch (error) {
      // Continue with deletion even if revocation fails
      console.warn(`Failed to revoke token with provider: ${error.message}`);
    }

    await this.deleteOAuthTokens(userId, provider, scope);
  }
}