import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { GoogleAdsAccount } from '@prisma/client';
import { TenantContextService } from '../../tenant/services/tenant-context.service';
import { OAuthService } from '../../auth/services/oauth.service';
import { ConversionActionsService } from '../../google-integration/services/conversion-actions.service';
import { google } from 'googleapis';
import { tagmanager_v2 } from 'googleapis';
import { GoogleAdsApi, resources } from 'google-ads-api';
import { ConnectGoogleAccountDto, CustomerResponseDto } from '../dto';
import {
  GoogleAccountInfo,
  GoogleAdsAccountInfo,
} from '../interfaces/customer.interface';
import {
  CustomerNotFoundException,
  CustomerGoogleAccountException,
} from '../exceptions/customer.exceptions';
import {
  ConversionActionCategory,
  ConversionActionStatus,
  ConversionActionType,
  ConversionCountingType,
  AttributionModel,
} from '../../google-integration/types/google-ads.types';
import { Credentials } from 'google-auth-library';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class GoogleIntegrationService {
  private readonly logger = new Logger(GoogleIntegrationService.name);
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>;
  private progressSubjects: Map<string, Subject<MessageEvent>> = new Map();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private oauthService: OAuthService,
    private conversionActionsService: ConversionActionsService
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_CALLBACK_URL')
    );
  }

  /**
   * Get connection progress observable for SSE
   */
  getConnectionProgress(customerId: string): Observable<MessageEvent> {
    if (!this.progressSubjects.has(customerId)) {
      this.progressSubjects.set(customerId, new Subject<MessageEvent>());
    }
    return this.progressSubjects.get(customerId).asObservable();
  }

  /**
   * Emit progress event for connection
   */
  private emitProgress(customerId: string, step: string, status: 'pending' | 'success' | 'error', message: string, error?: string) {
    const subject = this.progressSubjects.get(customerId);
    if (subject) {
      const event: MessageEvent = {
        data: JSON.stringify({
          step,
          status,
          message,
          error,
          timestamp: new Date().toISOString(),
        }),
      };
      subject.next(event);
    }
  }

  /**
   * Complete and cleanup progress subject
   */
  private completeProgress(customerId: string) {
    const subject = this.progressSubjects.get(customerId);
    if (subject) {
      subject.complete();
      this.progressSubjects.delete(customerId);
    }
  }

  async connectGoogleAccount(
    customerId: string,
    connectDto: ConnectGoogleAccountDto
  ): Promise<CustomerResponseDto> {
    const tenantId = TenantContextService.getTenantId();
    const userId = TenantContextService.getUserId();

    if (!tenantId) {
      throw new CustomerGoogleAccountException('Tenant context is required');
    }

    if (!userId) {
      throw new CustomerGoogleAccountException('User context is required');
    }

    this.logger.log(
      `Connecting Google account for customer: ${customerId} by user: ${userId}`
    );

    // Initialize progress tracking
    if (!this.progressSubjects.has(customerId)) {
      this.progressSubjects.set(customerId, new Subject<MessageEvent>());
    }

    try {
      // Verify customer exists
      const customer = await this.prisma.tenantAware.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new CustomerNotFoundException(customerId);
      }

      // Step 1: Exchange authorization code
      this.emitProgress(customerId, 'oauth', 'pending', 'Exchanging authorization code...');
      this.logger.log(
        `Attempting to exchange authorization code for customer: ${customerId}`
      );

      let tokens: Credentials;
      try {
        const tokenResponse = await this.oauth2Client.getToken(connectDto.code);
        tokens = tokenResponse.tokens;
        this.emitProgress(customerId, 'oauth', 'success', 'Authorization successful');
      } catch (tokenError) {
        const errorMessage = tokenError?.message || String(tokenError) || 'Unknown error';
        this.logger.error(
          `Token exchange failed: ${errorMessage}`,
          tokenError
        );

        this.emitProgress(customerId, 'oauth', 'error', 'Authorization failed', errorMessage);
        this.completeProgress(customerId);

        if (errorMessage.includes('invalid_grant')) {
          throw new CustomerGoogleAccountException(
            'Authorization code has expired or been used already. Please try connecting again.'
          );
        }
        throw new CustomerGoogleAccountException(
          `Token exchange failed: ${errorMessage}`
        );
      }

      const tokenResponse = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expiry_date
          ? Math.floor((tokens.expiry_date - Date.now()) / 1000)
          : 3600,
        scope: tokens.scope || '',
        token_type: tokens.token_type || 'Bearer',
      };

      // Step 2: Store OAuth tokens
      this.emitProgress(customerId, 'tokens', 'pending', 'Storing OAuth tokens...');

      // Set credentials and get user info
      this.oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      if (!userInfo.data.id || !userInfo.data.email) {
        this.emitProgress(customerId, 'tokens', 'error', 'Failed to retrieve Google account info');
        this.completeProgress(customerId);
        throw new CustomerGoogleAccountException(
          'Failed to retrieve Google account information'
        );
      }

      const googleAccountInfo: GoogleAccountInfo = {
        id: userInfo.data.id,
        email: userInfo.data.email,
        name: userInfo.data.name || '',
        picture: userInfo.data.picture,
      };

      // Store OAuth tokens for Ads, GTM, and GA4 access
      const tokenData = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
      };

      // Store Ads token (using the logged-in user ID, not customer ID)
      await this.oauthService.storeOAuthTokens(
        userId, // Use the logged-in user ID
        tenantId,
        'google',
        'ads',
        { ...tokenData, scope: 'ads' }
      );

      // Store GTM token (same tokens, different scope record)
      await this.oauthService.storeOAuthTokens(
        userId, // Use the logged-in user ID
        tenantId,
        'google',
        'gtm',
        { ...tokenData, scope: 'gtm' }
      );

      // Store GA4/Analytics token (same tokens, different scope record)
      await this.oauthService.storeOAuthTokens(
        userId, // Use the logged-in user ID
        tenantId,
        'google',
        'ga4',
        { ...tokenData, scope: 'ga4' }
      );

      // Update customer with Google account info
      const updatedCustomer = await this.prisma.tenantAware.customer.update({
        where: { id: customerId },
        data: {
          googleAccountId: googleAccountInfo.id,
          googleEmail: googleAccountInfo.email,
        },
        include: {
          googleAdsAccounts: true,
        },
      });

      this.emitProgress(customerId, 'tokens', 'success', 'OAuth tokens stored successfully');

      // Step 3: Connect to Google Ads (non-blocking)
      this.emitProgress(customerId, 'ads', 'pending', 'Connecting to Google Ads...');
      try {
        await this.syncGoogleAdsAccounts(customerId);
        this.emitProgress(customerId, 'ads', 'success', 'Google Ads connected successfully');
      } catch (adsError) {
        const errorMessage = adsError?.message || String(adsError) || 'Unknown error';
        this.logger.warn(
          `Failed to sync Google Ads accounts for customer ${customerId}: ${errorMessage}. Continuing with connection.`
        );
        this.emitProgress(customerId, 'ads', 'error', 'Google Ads connection failed', errorMessage);
        // Don't fail the entire connection if Ads sync fails
      }

      // Step 4: Connect to GA4 (non-blocking)
      this.emitProgress(customerId, 'ga4', 'pending', 'Connecting to Google Analytics 4...');
      try {
        await this.syncGA4Properties(customerId);
        this.emitProgress(customerId, 'ga4', 'success', 'GA4 connected successfully');
      } catch (ga4Error) {
        const errorMessage = ga4Error?.message || String(ga4Error) || 'Unknown error';
        this.logger.warn(
          `Failed to sync GA4 properties for customer ${customerId}: ${errorMessage}. Continuing with connection.`
        );
        this.emitProgress(customerId, 'ga4', 'error', 'GA4 connection failed', errorMessage);
        // Don't fail the entire connection if GA4 sync fails
      }

      // Step 5: Set up GTM (non-blocking)
      this.emitProgress(customerId, 'gtm', 'pending', 'Setting up Google Tag Manager...');
      try {
        await this.setupGTMEssentials(userId, customerId);
        this.emitProgress(customerId, 'gtm', 'success', 'GTM setup completed successfully');
      } catch (gtmError) {
        const errorMessage = gtmError?.message || String(gtmError) || 'Unknown error';
        this.logger.warn(
          `Failed to setup GTM essentials for customer ${customerId}: ${errorMessage}. Continuing with connection.`
        );
        this.emitProgress(customerId, 'gtm', 'error', 'GTM setup failed', errorMessage);
        // Don't fail the entire connection if GTM setup fails
      }

      // Complete progress tracking
      this.emitProgress(customerId, 'complete', 'success', 'Connection completed');
      this.completeProgress(customerId);

      this.logger.log(
        `Google account connected successfully for customer: ${customerId}`
      );

      return {
        id: updatedCustomer.id,
        email: updatedCustomer.email,
        firstName: updatedCustomer.firstName,
        lastName: updatedCustomer.lastName,
        fullName: updatedCustomer.fullName,
        company: updatedCustomer.company,
        phone: updatedCustomer.phone,
        status: updatedCustomer.status,
        tags: updatedCustomer.tags,
        notes: updatedCustomer.notes,
        customFields: updatedCustomer.customFields,
        googleAccountId: updatedCustomer.googleAccountId,
        googleEmail: updatedCustomer.googleEmail,
        googleAdsAccounts: updatedCustomer.googleAdsAccounts,
        createdAt: updatedCustomer.createdAt,
        updatedAt: updatedCustomer.updatedAt,
        createdBy: updatedCustomer.createdBy,
        updatedBy: updatedCustomer.updatedBy,
      };
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(
        `Failed to connect Google account for customer ${customerId}: ${errorMessage}`,
        error?.stack
      );
      this.logger.error('Full error details:', error);

      // Emit error and complete progress
      this.emitProgress(customerId, 'error', 'error', 'Connection failed', errorMessage);
      this.completeProgress(customerId);

      if (
        error instanceof CustomerNotFoundException ||
        error instanceof CustomerGoogleAccountException
      ) {
        throw error;
      }
      throw new CustomerGoogleAccountException(
        `Google connection failed: ${errorMessage}`
      );
    }
  }

  async disconnectGoogleAccount(
    customerId: string
  ): Promise<CustomerResponseDto> {
    const tenantId = TenantContextService.getTenantId();
    const userId = TenantContextService.getUserId();

    if (!tenantId) {
      throw new CustomerGoogleAccountException('Tenant context is required');
    }

    if (!userId) {
      throw new CustomerGoogleAccountException('User context is required');
    }

    this.logger.log(`Disconnecting Google account for customer: ${customerId}`);

    try {
      // Verify customer exists
      const customer = await this.prisma.tenantAware.customer.findUnique({
        where: { id: customerId },
        include: {
          googleAdsAccounts: true,
          trackings: true,
          conversionActions: true,
        },
      });

      if (!customer) {
        throw new CustomerNotFoundException(customerId);
      }

      if (!customer.googleAccountId) {
        throw new CustomerGoogleAccountException(
          'Customer does not have a connected Google account'
        );
      }

      // Step 1: Clean up GTM components for all trackings
      if (userId && customer.trackings.length > 0) {
        try {
          const gtmClient = await this.initializeGTMClient(userId);

          for (const tracking of customer.trackings) {
            try {
              // Delete GTM tag if it exists
              if (tracking.gtmTagId && tracking.gtmContainerId) {
                await gtmClient.accounts.containers.workspaces.tags.delete({
                  path: `accounts/-/containers/${tracking.gtmContainerId}/workspaces/-/tags/${tracking.gtmTagId}`,
                });
                this.logger.log(`Deleted GTM tag: ${tracking.gtmTagId}`);
              }

              // Delete GTM trigger if it exists
              if (tracking.gtmTriggerId && tracking.gtmContainerId) {
                await gtmClient.accounts.containers.workspaces.triggers.delete({
                  path: `accounts/-/containers/${tracking.gtmContainerId}/workspaces/-/triggers/${tracking.gtmTriggerId}`,
                });
                this.logger.log(
                  `Deleted GTM trigger: ${tracking.gtmTriggerId}`
                );
              }
            } catch (gtmError) {
              const errorMessage = gtmError?.message || String(gtmError) || 'Unknown error';
              this.logger.warn(
                `Failed to delete GTM components for tracking ${tracking.id}: ${errorMessage}`
              );
              // Continue with other trackings
            }
          }
        } catch (gtmClientError) {
          const errorMessage = gtmClientError?.message || String(gtmClientError) || 'Unknown error';
          this.logger.warn(
            `Failed to initialize GTM client for cleanup: ${errorMessage}`
          );
        }
      }

      // Step 2: Clean up Google Ads conversion actions
      if (
        customer.conversionActions.length > 0 &&
        customer.googleAdsAccounts.length > 0
      ) {
        try {
          for (const conversionAction of customer.conversionActions) {
            try {
              if (
                conversionAction.googleConversionActionId &&
                conversionAction.googleAccountId
              ) {
                await this.conversionActionsService.deleteConversionAction(
                  userId,
                  conversionAction.googleAccountId,
                  conversionAction.googleConversionActionId
                );
                this.logger.log(
                  `Deleted conversion action: ${conversionAction.googleConversionActionId}`
                );
              }
            } catch (convError) {
              const errorMessage = convError?.message || String(convError) || 'Unknown error';
              this.logger.warn(
                `Failed to delete conversion action ${conversionAction.id}: ${errorMessage}`
              );
              // Continue with other conversion actions
            }
          }
        } catch (convClientError) {
          const errorMessage = convClientError?.message || String(convClientError) || 'Unknown error';
          this.logger.warn(
            `Failed to clean up conversion actions: ${errorMessage}`
          );
        }
      }

      // Step 3: Remove database records
      // Delete tracking records
      await this.prisma.tenantAware.tracking.deleteMany({
        where: { customerId },
      });

      // Delete conversion action records
      await this.prisma.tenantAware.conversionAction.deleteMany({
        where: { customerId },
      });

      // Step 4: Remove OAuth tokens
      try {
        await this.oauthService.revokeOAuthTokens(userId, 'google', 'ads');
        await this.oauthService.revokeOAuthTokens(userId, 'google', 'gtm');
        await this.oauthService.revokeOAuthTokens(userId, 'google', 'ga4');
      } catch (error) {
        const errorMessage = error?.message || String(error) || 'Unknown error';
        this.logger.warn(`Failed to revoke OAuth tokens: ${errorMessage}`);
        // Continue with disconnection even if token revocation fails
      }

      // Step 5: Remove Google Ads accounts
      await this.prisma.googleAdsAccount.deleteMany({
        where: { customerId },
      });

      // Step 6: Update customer to remove Google account info
      const updatedCustomer = await this.prisma.tenantAware.customer.update({
        where: { id: customerId },
        data: {
          googleAccountId: null,
          googleEmail: null,
        },
        include: {
          googleAdsAccounts: true,
        },
      });

      this.logger.log(
        `Google account completely disconnected for customer: ${customerId} - removed ${customer.trackings.length} trackings and ${customer.conversionActions.length} conversion actions`
      );

      return {
        id: updatedCustomer.id,
        email: updatedCustomer.email,
        firstName: updatedCustomer.firstName,
        lastName: updatedCustomer.lastName,
        fullName: updatedCustomer.fullName,
        company: updatedCustomer.company,
        phone: updatedCustomer.phone,
        status: updatedCustomer.status,
        tags: updatedCustomer.tags,
        notes: updatedCustomer.notes,
        customFields: updatedCustomer.customFields,
        googleAccountId: updatedCustomer.googleAccountId,
        googleEmail: updatedCustomer.googleEmail,
        googleAdsAccounts: updatedCustomer.googleAdsAccounts,
        createdAt: updatedCustomer.createdAt,
        updatedAt: updatedCustomer.updatedAt,
        createdBy: updatedCustomer.createdBy,
        updatedBy: updatedCustomer.updatedBy,
      };
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(
        `Failed to disconnect Google account for customer ${customerId}: ${errorMessage}`,
        error?.stack
      );
      if (
        error instanceof CustomerNotFoundException ||
        error instanceof CustomerGoogleAccountException
      ) {
        throw error;
      }
      throw new CustomerGoogleAccountException(errorMessage);
    }
  }

  async syncGoogleAdsAccounts(
    customerId: string
  ): Promise<GoogleAdsAccountInfo[]> {
    const tenantId = TenantContextService.getTenantId();
    if (!tenantId) {
      throw new CustomerGoogleAccountException('Tenant context is required');
    }

    this.logger.log(`Syncing Google Ads accounts for customer: ${customerId}`);

    try {
      // Get customer with Google account
      const customer = await this.prisma.tenantAware.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer || !customer.googleAccountId) {
        throw new CustomerGoogleAccountException(
          'Customer does not have a connected Google account'
        );
      }

      // Get OAuth tokens (use user ID, not customer ID)
      const userId = TenantContextService.getUserId();
      if (!userId) {
        throw new CustomerGoogleAccountException('User context is required');
      }

      const tokens = await this.oauthService.getOAuthTokens(
        userId,
        'google',
        'ads'
      );
      if (!tokens) {
        throw new CustomerGoogleAccountException('No valid OAuth tokens found');
      }

      // Get real Google Ads accounts using the Google Ads API
      const oauth2Client = new google.auth.OAuth2(
        this.configService.get<string>('GOOGLE_CLIENT_ID'),
        this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
        this.configService.get<string>('GOOGLE_CALLBACK_URL')
      );
      oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });

      // Use Google Ads API to get accessible accounts
      const googleAdsAccounts = await this.fetchGoogleAdsAccounts(oauth2Client);

      // Store/update Google Ads accounts in database
      const savedAccounts = [];
      for (const accountInfo of googleAdsAccounts) {
        const savedAccount = await this.prisma.googleAdsAccount.upsert({
          where: {
            accountId_tenantId: {
              accountId: accountInfo.accountId,
              tenantId,
            },
          },
          update: {
            accountName: accountInfo.accountName,
            currency: accountInfo.currency,
            timeZone: accountInfo.timeZone,
            isActive: accountInfo.isActive,
          },
          create: {
            googleAccountId: customer.googleAccountId,
            accountId: accountInfo.accountId,
            accountName: accountInfo.accountName,
            currency: accountInfo.currency,
            timeZone: accountInfo.timeZone,
            isActive: accountInfo.isActive,
            customerId,
            tenantId,
          },
        });
        savedAccounts.push(savedAccount);
      }

      this.logger.log(
        `Synced ${savedAccounts.length} Google Ads accounts for customer: ${customerId}`
      );
      return googleAdsAccounts;
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(
        `Failed to sync Google Ads accounts for customer ${customerId}: ${errorMessage}`,
        error?.stack
      );
      throw new CustomerGoogleAccountException(errorMessage);
    }
  }

  async getGoogleAdsAccounts(customerId: string): Promise<GoogleAdsAccount[]> {
    const tenantId = TenantContextService.getTenantId();
    if (!tenantId) {
      throw new CustomerGoogleAccountException('Tenant context is required');
    }

    this.logger.log(`Fetching Google Ads accounts for customer: ${customerId}`);

    try {
      const accounts = await this.prisma.googleAdsAccount.findMany({
        where: {
          customerId,
          tenantId,
        },
        orderBy: { createdAt: 'desc' },
      });

      return accounts;
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(
        `Failed to fetch Google Ads accounts for customer ${customerId}: ${errorMessage}`,
        error?.stack
      );
      throw new CustomerGoogleAccountException(errorMessage);
    }
  }

  async syncGA4Properties(customerId: string): Promise<any[]> {
    const tenantId = TenantContextService.getTenantId();
    if (!tenantId) {
      throw new CustomerGoogleAccountException('Tenant context is required');
    }

    this.logger.log(`Syncing GA4 properties for customer: ${customerId}`);

    try {
      // Get customer with Google account
      const customer = await this.prisma.tenantAware.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer || !customer.googleAccountId) {
        throw new CustomerGoogleAccountException(
          'Customer does not have a connected Google account'
        );
      }

      // Get OAuth tokens (use user ID, not customer ID)
      const userId = TenantContextService.getUserId();
      if (!userId) {
        throw new CustomerGoogleAccountException('User context is required');
      }

      const tokens = await this.oauthService.getOAuthTokens(
        userId,
        'google',
        'ga4'
      );
      if (!tokens) {
        throw new CustomerGoogleAccountException('No valid GA4 OAuth tokens found');
      }

      // Get GA4 properties using the Google Analytics Admin API
      const oauth2Client = new google.auth.OAuth2(
        this.configService.get<string>('GOOGLE_CLIENT_ID'),
        this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
        this.configService.get<string>('GOOGLE_CALLBACK_URL')
      );
      oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });

      // Fetch GA4 properties
      const ga4Properties = await this.fetchGA4Properties(oauth2Client);

      // Store/update GA4 properties in database
      const savedProperties = [];
      for (const propertyInfo of ga4Properties) {
        const savedProperty = await this.prisma.gA4Property.upsert({
          where: {
            propertyId_tenantId: {
              propertyId: propertyInfo.propertyId,
              tenantId,
            },
          },
          update: {
            propertyName: propertyInfo.propertyName,
            displayName: propertyInfo.displayName,
            websiteUrl: propertyInfo.websiteUrl,
            timeZone: propertyInfo.timeZone,
            currency: propertyInfo.currency,
            industryCategory: propertyInfo.industryCategory,
            measurementId: propertyInfo.measurementId,
            isActive: propertyInfo.isActive,
          },
          create: {
            googleAccountId: customer.googleAccountId,
            propertyId: propertyInfo.propertyId,
            propertyName: propertyInfo.propertyName,
            displayName: propertyInfo.displayName,
            websiteUrl: propertyInfo.websiteUrl,
            timeZone: propertyInfo.timeZone,
            currency: propertyInfo.currency,
            industryCategory: propertyInfo.industryCategory,
            measurementId: propertyInfo.measurementId,
            isActive: propertyInfo.isActive,
            customerId,
            tenantId,
          },
        });
        savedProperties.push(savedProperty);
      }

      this.logger.log(
        `Synced ${savedProperties.length} GA4 properties for customer: ${customerId}`
      );
      return ga4Properties;
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(
        `Failed to sync GA4 properties for customer ${customerId}: ${errorMessage}`,
        error?.stack
      );
      throw new CustomerGoogleAccountException(errorMessage);
    }
  }

  async getGA4Properties(customerId: string): Promise<any[]> {
    const tenantId = TenantContextService.getTenantId();
    if (!tenantId) {
      throw new CustomerGoogleAccountException('Tenant context is required');
    }

    this.logger.log(`Fetching GA4 properties for customer: ${customerId}`);

    try {
      const properties = await this.prisma.gA4Property.findMany({
        where: {
          customerId,
          tenantId,
        },
        orderBy: { createdAt: 'desc' },
      });

      return properties;
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(
        `Failed to fetch GA4 properties for customer ${customerId}: ${errorMessage}`,
        error?.stack
      );
      throw new CustomerGoogleAccountException(errorMessage);
    }
  }

  async setupGTMEssentials(userId: string, customerId: string): Promise<void> {
    this.logger.log(`Setting up GTM essentials for customer: ${customerId}`);

    try {
      // Initialize GTM client
      const gtmClient = await this.initializeGTMClient(userId);

      // First, list GTM accounts to get the account ID
      const accountsResponse = await gtmClient.accounts.list();

      if (!accountsResponse.data.account || accountsResponse.data.account.length === 0) {
        this.logger.warn('No GTM accounts found for customer');
        return;
      }

      const gtmAccountId = accountsResponse.data.account[0].accountId;
      this.logger.log(`Found GTM account: ${gtmAccountId}`);

      // Get GTM containers
      const containersResponse = await gtmClient.accounts.containers.list({
        parent: `accounts/${gtmAccountId}`,
      });

      if (!containersResponse.data.container || containersResponse.data.container.length === 0) {
        this.logger.warn('No GTM containers found for customer');
        return;
      }

      const container = containersResponse.data.container[0];
      const containerId = container.containerId;

      this.logger.log(`Setting up GTM container: ${container.name} (${containerId})`);

      // Get or create OneClickTag workspace
      const workspaceId = await this.getOrCreateWorkspace(gtmClient, gtmAccountId, containerId);

      // 1. Enable built-in variables
      await this.enableBuiltInVariables(gtmClient, containerId, workspaceId);

      // 2. Create custom variables
      await this.createCustomVariables(gtmClient, gtmAccountId, containerId, workspaceId);

      // 3. Create All Pages trigger
      await this.createAllPagesTrigger(gtmClient, gtmAccountId, containerId, workspaceId);

      // 4. Create Conversion Linker tag
      await this.createConversionLinkerTag(gtmClient, gtmAccountId, containerId, workspaceId);

      this.logger.log(`Successfully set up GTM essentials for customer: ${customerId}`);
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(`Failed to setup GTM essentials: ${errorMessage}`, error?.stack);
      throw new CustomerGoogleAccountException(`GTM setup failed: ${errorMessage}`);
    }
  }

  /**
   * Get or create OneClickTag workspace
   * This keeps all OneClickTag changes isolated in a dedicated workspace
   */
  private async getOrCreateWorkspace(
    gtmClient: any,
    gtmAccountId: string,
    containerId: string
  ): Promise<string> {
    this.logger.log('Getting or creating OneClickTag workspace');

    try {
      // List existing workspaces
      const workspacesResponse = await gtmClient.accounts.containers.workspaces.list({
        parent: `accounts/${gtmAccountId}/containers/${containerId}`,
      });

      // Check if OneClickTag workspace already exists
      const existingWorkspace = workspacesResponse.data.workspace?.find(
        (ws: any) => ws.name === 'OneClickTag'
      );

      if (existingWorkspace) {
        this.logger.log(`Found existing OneClickTag workspace: ${existingWorkspace.workspaceId}`);
        return existingWorkspace.workspaceId;
      }

      // Create new workspace
      this.logger.log('Creating new OneClickTag workspace');
      const createResponse = await gtmClient.accounts.containers.workspaces.create({
        parent: `accounts/${gtmAccountId}/containers/${containerId}`,
        requestBody: {
          name: 'OneClickTag',
          description: 'Workspace for OneClickTag automated tracking setup. All tags, triggers, and variables created by OneClickTag will be added here.',
        },
      });

      const workspaceId = createResponse.data.workspaceId;
      this.logger.log(`Created OneClickTag workspace: ${workspaceId}`);
      return workspaceId;
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(`Failed to get/create workspace: ${errorMessage}`, error?.stack);
      throw error;
    }
  }

  private async enableBuiltInVariables(
    gtmClient: any,
    containerId: string,
    workspaceId: string
  ): Promise<void> {
    this.logger.log('Enabling built-in variables');

    const builtInVariablesToEnable = [
      'PAGE_URL',
      'PAGE_HOSTNAME',
      'PAGE_PATH',
      'REFERRER',
      'EVENT',
      'CLICK_ELEMENT',
      'CLICK_CLASSES',
      'CLICK_ID',
      'CLICK_TARGET',
      'CLICK_URL',
      'CLICK_TEXT',
      'FORM_ELEMENT',
      'FORM_CLASSES',
      'FORM_ID',
      'FORM_TARGET',
      'FORM_URL',
      'FORM_TEXT',
    ];

    try {
      // GTM API doesn't have a direct way to enable built-in variables
      // They are enabled automatically when you reference them in tags/triggers
      // We'll create a note about this in the logs
      this.logger.log(`Built-in variables will be enabled automatically when used in workspace ${workspaceId}: ${builtInVariablesToEnable.join(', ')}`);
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.warn(`Failed to enable built-in variables: ${errorMessage}`);
    }
  }

  private async createCustomVariables(
    gtmClient: any,
    gtmAccountId: string,
    containerId: string,
    workspaceId: string
  ): Promise<void> {
    this.logger.log('Creating custom variables');

    const customVariables = [
      {
        name: 'OneClickTag - Page Title',
        type: 'jsm', // JavaScript Variable
        parameter: [
          {
            type: 'TEMPLATE',
            key: 'javascript',
            value: 'function() { return document.title; }',
          },
        ],
      },
      {
        name: 'OneClickTag - Scroll Depth',
        type: 'jsm',
        parameter: [
          {
            type: 'TEMPLATE',
            key: 'javascript',
            value: 'function() { return Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100); }',
          },
        ],
      },
      {
        name: 'OneClickTag - User ID',
        type: 'k', // First Party Cookie
        parameter: [
          {
            type: 'TEMPLATE',
            key: 'name',
            value: 'user_id',
          },
        ],
      },
    ];

    for (const variable of customVariables) {
      try {
        // Check if variable already exists in OneClickTag workspace
        const existingVariables = await gtmClient.accounts.containers.workspaces.variables.list({
          parent: `accounts/${gtmAccountId}/containers/${containerId}/workspaces/${workspaceId}`,
        });

        const exists = existingVariables.data.variable?.some(
          (v: any) => v.name === variable.name
        );

        if (exists) {
          this.logger.log(`Variable already exists: ${variable.name}`);
          continue;
        }

        await gtmClient.accounts.containers.workspaces.variables.create({
          parent: `accounts/${gtmAccountId}/containers/${containerId}/workspaces/${workspaceId}`,
          requestBody: variable,
        });

        this.logger.log(`Created variable: ${variable.name}`);
      } catch (error) {
        const errorMessage = error?.message || String(error) || 'Unknown error';
        this.logger.warn(`Failed to create variable ${variable.name}: ${errorMessage}`);
      }
    }
  }

  private async createAllPagesTrigger(
    gtmClient: any,
    gtmAccountId: string,
    containerId: string,
    workspaceId: string
  ): Promise<void> {
    this.logger.log('Creating All Pages trigger');

    try {
      // Check if trigger already exists in OneClickTag workspace
      const existingTriggers = await gtmClient.accounts.containers.workspaces.triggers.list({
        parent: `accounts/${gtmAccountId}/containers/${containerId}/workspaces/${workspaceId}`,
      });

      const exists = existingTriggers.data.trigger?.some(
        (t: any) => t.name === 'OneClickTag - All Pages'
      );

      if (exists) {
        this.logger.log('All Pages trigger already exists');
        return;
      }

      const trigger = {
        name: 'OneClickTag - All Pages',
        type: 'PAGEVIEW',
      };

      await gtmClient.accounts.containers.workspaces.triggers.create({
        parent: `accounts/${gtmAccountId}/containers/${containerId}/workspaces/${workspaceId}`,
        requestBody: trigger,
      });

      this.logger.log('Created All Pages trigger');
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.warn(`Failed to create All Pages trigger: ${errorMessage}`);
      throw error;
    }
  }

  private async createConversionLinkerTag(
    gtmClient: any,
    gtmAccountId: string,
    containerId: string,
    workspaceId: string
  ): Promise<void> {
    this.logger.log('Creating Conversion Linker tag');

    try {
      // Check if Conversion Linker already exists in OneClickTag workspace
      const existingTags = await gtmClient.accounts.containers.workspaces.tags.list({
        parent: `accounts/${gtmAccountId}/containers/${containerId}/workspaces/${workspaceId}`,
      });

      const exists = existingTags.data.tag?.some(
        (t: any) => t.name === 'OneClickTag - Conversion Linker'
      );

      if (exists) {
        this.logger.log('Conversion Linker tag already exists');
        return;
      }

      // Get All Pages trigger from OneClickTag workspace
      const triggersResponse = await gtmClient.accounts.containers.workspaces.triggers.list({
        parent: `accounts/${gtmAccountId}/containers/${containerId}/workspaces/${workspaceId}`,
      });

      const allPagesTrigger = triggersResponse.data.trigger?.find(
        (t: any) => t.name === 'OneClickTag - All Pages' || t.type === 'PAGEVIEW'
      );

      if (!allPagesTrigger) {
        throw new Error('All Pages trigger not found in OneClickTag workspace');
      }

      const conversionLinkerTag = {
        name: 'OneClickTag - Conversion Linker',
        type: 'gclidw', // Google Ads Conversion Linker
        firingTriggerId: [allPagesTrigger.triggerId],
        parameter: [
          {
            type: 'BOOLEAN',
            key: 'enableCrossDomain',
            value: 'false',
          },
          {
            type: 'BOOLEAN',
            key: 'enableUrlPassthrough',
            value: 'false',
          },
          {
            type: 'BOOLEAN',
            key: 'enableCookieOverrides',
            value: 'false',
          },
        ],
      };

      await gtmClient.accounts.containers.workspaces.tags.create({
        parent: `accounts/${gtmAccountId}/containers/${containerId}/workspaces/${workspaceId}`,
        requestBody: conversionLinkerTag,
      });

      this.logger.log('Created Conversion Linker tag');
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.warn(`Failed to create Conversion Linker tag: ${errorMessage}`);
      throw error;
    }
  }

  async getConnectionStatus(customerId: string): Promise<{
    connected: boolean;
    hasAdsAccess: boolean;
    hasGTMAccess: boolean;
    hasGA4Access: boolean;
    googleEmail: string | null;
    connectedAt: string | null;
    gtmError: string | null;
    ga4Error: string | null;
    adsError: string | null;
    gtmAccountId: string | null;
    gtmContainerId: string | null;
    ga4PropertyCount: number;
    adsAccountCount: number;
  }> {
    const tenantId = TenantContextService.getTenantId();
    const userId = TenantContextService.getUserId();

    if (!tenantId || !userId) {
      return {
        connected: false,
        hasAdsAccess: false,
        hasGTMAccess: false,
        hasGA4Access: false,
        googleEmail: null,
        connectedAt: null,
        gtmError: null,
        ga4Error: null,
        adsError: null,
        gtmAccountId: null,
        gtmContainerId: null,
        ga4PropertyCount: 0,
        adsAccountCount: 0,
      };
    }

    try {
      // Get customer
      const customer = await this.prisma.tenantAware.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer || !customer.googleAccountId) {
        return {
          connected: false,
          hasAdsAccess: false,
          hasGTMAccess: false,
          hasGA4Access: false,
          googleEmail: null,
          connectedAt: null,
          gtmError: null,
          ga4Error: null,
          adsError: null,
          gtmAccountId: null,
          gtmContainerId: null,
          ga4PropertyCount: 0,
          adsAccountCount: 0,
        };
      }

      // Fetch all OAuth tokens in parallel
      const [adsTokens, gtmTokens, ga4Tokens] = await Promise.all([
        this.oauthService.getOAuthTokens(userId, 'google', 'ads'),
        this.oauthService.getOAuthTokens(userId, 'google', 'gtm'),
        this.oauthService.getOAuthTokens(userId, 'google', 'ga4'),
      ]);

      // Test all services in parallel using Promise.allSettled
      const [gtmResult, ga4Result, adsResult] = await Promise.allSettled([
        // Test GTM access
        (async () => {
          if (!gtmTokens) {
            return {
              hasAccess: false,
              error: 'GTM not configured. Reconnect Google account to enable GTM integration.',
              accountId: null,
              containerId: null,
            };
          }

          try {
            const gtmClient = await this.initializeGTMClient(userId);
            const accountsResponse = await gtmClient.accounts.list({});
            if (accountsResponse.data.account && accountsResponse.data.account.length > 0) {
              return {
                hasAccess: true,
                error: null,
                accountId: customer.gtmAccountId,
                containerId: customer.gtmContainerId,
              };
            } else {
              return {
                hasAccess: false,
                error: 'No GTM accounts found for this Google account',
                accountId: null,
                containerId: null,
              };
            }
          } catch (error) {
            const errorMessage = error?.message || String(error) || 'Failed to access GTM';
            this.logger.warn(`GTM connection test failed: ${errorMessage}`);
            return {
              hasAccess: false,
              error: errorMessage,
              accountId: null,
              containerId: null,
            };
          }
        })(),

        // Test GA4 access
        (async () => {
          if (!ga4Tokens) {
            return {
              hasAccess: false,
              error: 'GA4 not configured. Reconnect Google account to enable GA4 integration.',
              propertyCount: 0,
            };
          }

          try {
            const oauth2Client = new google.auth.OAuth2(
              this.configService.get('GOOGLE_CLIENT_ID'),
              this.configService.get('GOOGLE_CLIENT_SECRET'),
              this.configService.get('GOOGLE_CALLBACK_URL')
            );
            oauth2Client.setCredentials({
              access_token: ga4Tokens.accessToken,
              refresh_token: ga4Tokens.refreshToken,
            });

            const ga4Properties = await this.fetchGA4Properties(oauth2Client);
            if (ga4Properties.length > 0) {
              return {
                hasAccess: true,
                error: null,
                propertyCount: ga4Properties.length,
              };
            } else {
              return {
                hasAccess: false,
                error: 'No GA4 properties found for this Google account',
                propertyCount: 0,
              };
            }
          } catch (error) {
            const errorMessage = error?.message || String(error) || 'Unknown error';
            let ga4Error: string;
            if (errorMessage.includes('PERMISSION_DENIED')) {
              ga4Error = 'GA4 access denied. Reconnect Google account to enable GA4 integration.';
            } else if (errorMessage.includes('invalid_grant')) {
              ga4Error = 'Authorization expired. Please reconnect your Google account.';
            } else {
              ga4Error = errorMessage;
            }
            this.logger.warn(`GA4 connection test failed: ${ga4Error}`);
            return {
              hasAccess: false,
              error: ga4Error,
              propertyCount: 0,
            };
          }
        })(),

        // Test Google Ads access
        (async () => {
          if (!adsTokens) {
            return {
              hasAccess: false,
              error: 'Google Ads not configured. Reconnect Google account to enable Ads integration.',
              accountCount: 0,
            };
          }

          try {
            const oauth2Client = new google.auth.OAuth2(
              this.configService.get('GOOGLE_CLIENT_ID'),
              this.configService.get('GOOGLE_CLIENT_SECRET'),
              this.configService.get('GOOGLE_CALLBACK_URL')
            );
            oauth2Client.setCredentials({
              access_token: adsTokens.accessToken,
              refresh_token: adsTokens.refreshToken,
            });

            const adsAccounts = await this.fetchGoogleAdsAccounts(oauth2Client);
            if (adsAccounts.length > 0) {
              return {
                hasAccess: true,
                error: null,
                accountCount: adsAccounts.length,
              };
            } else {
              return {
                hasAccess: false,
                error: 'No Google Ads accounts found for this Google account',
                accountCount: 0,
              };
            }
          } catch (error) {
            const errorMessage = error?.message || String(error) || 'Unknown error';
            let adsError: string;
            if (errorMessage.includes('DEVELOPER_TOKEN_NOT_APPROVED')) {
              adsError = 'Developer token not approved. Contact support to enable Google Ads integration.';
            } else if (errorMessage.includes('invalid_grant')) {
              adsError = 'Authorization expired. Please reconnect your Google account.';
            } else if (errorMessage.includes('No valid Google Ads accounts could be accessed')) {
              adsError = 'No accessible Google Ads accounts. Ensure the Google account has Google Ads access.';
            } else {
              adsError = errorMessage;
            }
            this.logger.warn(`Google Ads connection test failed: ${adsError}`);
            return {
              hasAccess: false,
              error: adsError,
              accountCount: 0,
            };
          }
        })(),
      ]);

      // Extract results from Promise.allSettled
      const gtmData = gtmResult.status === 'fulfilled' ? gtmResult.value : {
        hasAccess: false,
        error: 'GTM test failed unexpectedly',
        accountId: null,
        containerId: null,
      };

      const ga4Data = ga4Result.status === 'fulfilled' ? ga4Result.value : {
        hasAccess: false,
        error: 'GA4 test failed unexpectedly',
        propertyCount: 0,
      };

      const adsData = adsResult.status === 'fulfilled' ? adsResult.value : {
        hasAccess: false,
        error: 'Ads test failed unexpectedly',
        accountCount: 0,
      };

      const hasGTMAccess = gtmData.hasAccess;
      const gtmError = gtmData.error;
      const gtmAccountId = gtmData.accountId;
      const gtmContainerId = gtmData.containerId;

      const hasGA4Access = ga4Data.hasAccess;
      const ga4Error = ga4Data.error;
      const ga4PropertyCount = ga4Data.propertyCount;

      const hasAdsAccess = adsData.hasAccess;
      const adsError = adsData.error;
      const adsAccountCount = adsData.accountCount;

      const result = {
        connected: true,
        hasAdsAccess,
        hasGTMAccess,
        hasGA4Access,
        googleEmail: customer.googleEmail,
        connectedAt: customer.updatedAt.toISOString(),
        gtmError,
        ga4Error,
        adsError,
        gtmAccountId,
        gtmContainerId,
        ga4PropertyCount,
        adsAccountCount,
      };

      this.logger.log(`Connection status for customer ${customerId}: hasAdsAccess=${hasAdsAccess}, adsError=${adsError}`);
      this.logger.log(`Full status: ${JSON.stringify(result)}`);

      return result;
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(
        `Failed to get connection status for customer ${customerId}: ${errorMessage}`
      );
      return {
        connected: false,
        hasAdsAccess: false,
        hasGTMAccess: false,
        hasGA4Access: false,
        googleEmail: null,
        connectedAt: null,
        gtmError: errorMessage,
        ga4Error: errorMessage,
        adsError: errorMessage,
        gtmAccountId: null,
        gtmContainerId: null,
        ga4PropertyCount: 0,
        adsAccountCount: 0,
      };
    }
  }

  async createCompleteTracking(
    customerId: string,
    trackingData: {
      name: string;
      type: string;
      selector: string;
      description?: string;
    },
    userId: string
  ): Promise<{
    trackingId: string;
    gtmTriggerId?: string;
    gtmTagId?: string;
    conversionActionId?: string;
    status: string;
    message: string;
  }> {
    const tenantId = TenantContextService.getTenantId();
    if (!tenantId) {
      throw new CustomerGoogleAccountException('Tenant context is required');
    }

    this.logger.log(
      `Creating complete tracking setup for customer: ${customerId}`
    );

    try {
      // Verify customer has Google account connected
      const customer = await this.prisma.tenantAware.customer.findUnique({
        where: { id: customerId },
        include: { googleAdsAccounts: true },
      });

      if (!customer || !customer.googleAccountId) {
        throw new CustomerGoogleAccountException(
          'Customer must have a connected Google account'
        );
      }

      if (
        !customer.googleAdsAccounts ||
        customer.googleAdsAccounts.length === 0
      ) {
        throw new CustomerGoogleAccountException(
          'Customer must have at least one Google Ads account'
        );
      }

      // Check if we have both GTM and Ads tokens
      const adsTokens = await this.oauthService.getOAuthTokens(
        userId,
        'google',
        'ads'
      );
      const gtmTokens = await this.oauthService.getOAuthTokens(
        userId,
        'google',
        'gtm'
      );

      if (!adsTokens || !gtmTokens) {
        throw new CustomerGoogleAccountException(
          'Both Google Ads and Tag Manager access required'
        );
      }

      // Convert type to enum format
      const trackingType = trackingData.type.toUpperCase() as
        | 'BUTTON_CLICK'
        | 'PAGE_VIEW'
        | 'FORM_SUBMIT'
        | 'LINK_CLICK'
        | 'ELEMENT_VISIBILITY';

      // Create tracking record in database first
      const tracking = await this.prisma.tenantAware.tracking.create({
        data: {
          name: trackingData.name,
          type: trackingType,
          selector: trackingData.selector,
          description: trackingData.description,
          status: 'CREATING',
          customerId,
          tenantId,
          createdBy: userId,
        },
      });

      let gtmTriggerId: string | undefined;
      let gtmTagId: string | undefined;
      let conversionActionId: string | undefined;
      let lastError: string | undefined;

      try {
        // Step 1: Create Google Ads conversion action
        const primaryAdsAccount = customer.googleAdsAccounts[0];
        const conversionActionResponse =
          await this.conversionActionsService.createConversionAction(
            userId, // Pass userId instead of customerId
            primaryAdsAccount.accountId,
            {
              name: `${trackingData.name} - ${customer.fullName || customer.firstName}`,
              category: this.getConversionCategory(trackingData.type),
              status: ConversionActionStatus.ENABLED,
              type: ConversionActionType.WEBPAGE,
              countingType: ConversionCountingType.ONE_PER_CLICK,
              clickThroughLookbackWindowDays: 30,
              viewThroughLookbackWindowDays: 1,
              includeInConversionsMetric: true,
              attributionModel: AttributionModel.GOOGLE_ADS_LAST_CLICK,
            }
          );

        conversionActionId = conversionActionResponse.id;

        // Step 2: Create GTM components
        const gtmClient = await this.initializeGTMClient(userId);

        // First, list GTM accounts to get the account ID
        const accountsResponse = await gtmClient.accounts.list();
        if (!accountsResponse.data.account || accountsResponse.data.account.length === 0) {
          throw new CustomerGoogleAccountException(
            'No GTM accounts found for customer'
          );
        }

        const gtmAccountId = accountsResponse.data.account[0].accountId;

        // Get GTM containers for the customer
        const containers = await gtmClient.accounts.containers.list({
          parent: `accounts/${gtmAccountId}`,
        });

        if (
          !containers.data.container ||
          containers.data.container.length === 0
        ) {
          throw new CustomerGoogleAccountException(
            'No GTM containers found for customer'
          );
        }

        const containerId = containers.data.container[0].containerId;

        // Get or create OneClickTag workspace
        const workspaceId = await this.getOrCreateWorkspace(gtmClient, gtmAccountId, containerId);

        // Create GTM trigger based on tracking type
        const trigger = await this.createGTMTrigger(
          gtmClient,
          gtmAccountId,
          containerId,
          workspaceId,
          trackingData
        );
        gtmTriggerId = trigger.triggerId;

        // Create GTM tag that fires the conversion
        const tag = await this.createGTMTag(
          gtmClient,
          gtmAccountId,
          containerId,
          workspaceId,
          trackingData,
          conversionActionResponse,
          gtmTriggerId
        );
        gtmTagId = tag.tagId;

        // Update tracking record with successful creation
        await this.prisma.tenantAware.tracking.update({
          where: { id: tracking.id },
          data: {
            status: 'ACTIVE',
            gtmTriggerId,
            gtmTagId,
            gtmContainerId: containerId,
            conversionActionId,
            lastSyncAt: new Date(),
            updatedBy: userId,
          },
        });

        // Create conversion action record in database
        await this.prisma.tenantAware.conversionAction.create({
          data: {
            id: conversionActionId,
            name: conversionActionResponse.name,
            type: conversionActionResponse.type,
            status: conversionActionResponse.status,
            category: conversionActionResponse.category,
            googleConversionActionId: conversionActionResponse.id,
            googleAccountId: primaryAdsAccount.accountId,
            customerId,
            tenantId,
            createdBy: userId,
          },
        });

        this.logger.log(
          `Complete tracking setup created successfully for customer: ${customerId}`
        );

        return {
          trackingId: tracking.id,
          gtmTriggerId,
          gtmTagId,
          conversionActionId,
          status: 'active',
          message: `Tracking "${trackingData.name}" created successfully with GTM trigger, tag, and Google Ads conversion action`,
        };
      } catch (error) {
        const errorMessage = error?.message || String(error) || 'Unknown error';
        this.logger.error(
          `Failed to create complete tracking: ${errorMessage}`,
          error?.stack
        );
        lastError = errorMessage;

        // Update tracking record with failure
        await this.prisma.tenantAware.tracking.update({
          where: { id: tracking.id },
          data: {
            status: 'FAILED',
            lastError,
            lastSyncAt: new Date(),
            updatedBy: userId,
          },
        });

        throw new CustomerGoogleAccountException(
          `Tracking creation failed: ${errorMessage}`
        );
      }
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(
        `Failed to create tracking for customer ${customerId}: ${errorMessage}`,
        error?.stack
      );
      if (error instanceof CustomerGoogleAccountException) {
        throw error;
      }
      throw new CustomerGoogleAccountException(
        `Tracking creation failed: ${errorMessage}`
      );
    }
  }

  private async initializeGTMClient(
    userId: string
  ): Promise<tagmanager_v2.Tagmanager> {
    const tokens = await this.oauthService.getOAuthTokens(
      userId,
      'google',
      'gtm'
    );
    if (!tokens) {
      throw new CustomerGoogleAccountException(
        'No valid GTM OAuth tokens found'
      );
    }

    // CRITICAL: Must initialize OAuth2Client with client credentials
    const oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_CALLBACK_URL')
    );
    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });

    return google.tagmanager({ version: 'v2', auth: oauth2Client });
  }

  private async createGTMTrigger(
    gtmClient: tagmanager_v2.Tagmanager,
    gtmAccountId: string,
    containerId: string,
    workspaceId: string,
    trackingData: {
      name: string;
      type: string;
      selector: string;
      description?: string;
    }
  ): Promise<tagmanager_v2.Schema$Trigger> {
    const triggerConfig = this.getTriggerConfig(trackingData);

    const triggerResource = {
      name: `${trackingData.name} - Trigger`,
      type: triggerConfig.type,
      filter: triggerConfig.filters,
    };

    const response =
      await gtmClient.accounts.containers.workspaces.triggers.create({
        parent: `accounts/${gtmAccountId}/containers/${containerId}/workspaces/${workspaceId}`,
        requestBody: triggerResource,
      });

    this.logger.log(`Created GTM trigger: ${response.data.triggerId}`);
    return response.data;
  }

  private async createGTMTag(
    gtmClient: tagmanager_v2.Tagmanager,
    gtmAccountId: string,
    containerId: string,
    workspaceId: string,
    trackingData: {
      name: string;
      type: string;
      selector: string;
      description?: string;
    },
    conversionAction: {
      id: string;
      name: string;
      gtmTag?: {
        conversionId: string;
        conversionLabel: string;
      };
    },
    triggerId: string
  ): Promise<tagmanager_v2.Schema$Tag> {
    const tagResource = {
      name: `${trackingData.name} - Conversion Tag`,
      type: 'awct', // Google Ads Conversion Tracking
      firingTriggerId: [triggerId],
      parameter: [
        {
          type: 'TEMPLATE',
          key: 'conversionId',
          value: conversionAction.gtmTag?.conversionId || 'AW-PLACEHOLDER',
        },
        {
          type: 'TEMPLATE',
          key: 'conversionLabel',
          value:
            conversionAction.gtmTag?.conversionLabel || 'PLACEHOLDER-LABEL',
        },
        {
          type: 'TEMPLATE',
          key: 'enableNewCustomerReporting',
          value: 'false',
        },
        {
          type: 'TEMPLATE',
          key: 'enableEnhancedConversion',
          value: 'false',
        },
      ],
    };

    const response = await gtmClient.accounts.containers.workspaces.tags.create(
      {
        parent: `accounts/${gtmAccountId}/containers/${containerId}/workspaces/${workspaceId}`,
        requestBody: tagResource,
      }
    );

    this.logger.log(`Created GTM tag: ${response.data.tagId}`);
    return response.data;
  }

  private getTriggerConfig(trackingData: {
    name: string;
    type: string;
    selector: string;
    description?: string;
  }): {
    type: string;
    filters: Array<{
      type: string;
      parameter: Array<{
        type: string;
        key: string;
        value: string;
      }>;
    }>;
  } {
    switch (trackingData.type) {
      case 'button_click':
      case 'link_click':
        return {
          type: 'CLICK',
          filters: [
            {
              type: 'css_selector',
              parameter: [
                {
                  type: 'TEMPLATE',
                  key: 'arg0',
                  value: trackingData.selector,
                },
              ],
            },
          ],
        };

      case 'page_view':
        return {
          type: 'PAGE_VIEW',
          filters: [
            {
              type: 'page_url',
              parameter: [
                {
                  type: 'TEMPLATE',
                  key: 'operator',
                  value: 'contains',
                },
                {
                  type: 'TEMPLATE',
                  key: 'arg0',
                  value: trackingData.selector,
                },
              ],
            },
          ],
        };

      case 'form_submit':
        return {
          type: 'FORM_SUBMISSION',
          filters: [
            {
              type: 'css_selector',
              parameter: [
                {
                  type: 'TEMPLATE',
                  key: 'arg0',
                  value: trackingData.selector,
                },
              ],
            },
          ],
        };

      case 'element_visibility':
        return {
          type: 'ELEMENT_VISIBILITY',
          filters: [
            {
              type: 'css_selector',
              parameter: [
                {
                  type: 'TEMPLATE',
                  key: 'arg0',
                  value: trackingData.selector,
                },
              ],
            },
          ],
        };

      default:
        return {
          type: 'CLICK',
          filters: [
            {
              type: 'css_selector',
              parameter: [
                {
                  type: 'TEMPLATE',
                  key: 'arg0',
                  value: trackingData.selector,
                },
              ],
            },
          ],
        };
    }
  }

  private getConversionCategory(
    trackingType: string
  ): ConversionActionCategory {
    switch (trackingType) {
      case 'form_submit':
        return ConversionActionCategory.LEAD;
      case 'page_view':
        return ConversionActionCategory.PAGE_VIEW;
      case 'button_click':
      case 'link_click':
        return ConversionActionCategory.PURCHASE;
      default:
        return ConversionActionCategory.DEFAULT;
    }
  }

  private async fetchGA4Properties(
    oauth2Client: InstanceType<typeof google.auth.OAuth2>
  ): Promise<any[]> {
    try {
      // Initialize Google Analytics Admin API
      const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client });

      // List all account summaries (accounts with their properties)
      const accountSummariesResponse = await analyticsAdmin.accountSummaries.list();

      if (!accountSummariesResponse.data.accountSummaries ||
          accountSummariesResponse.data.accountSummaries.length === 0) {
        this.logger.warn('No GA4 account summaries found');
        return [];
      }

      const properties = [];

      // For each account summary, get properties
      for (const accountSummary of accountSummariesResponse.data.accountSummaries) {
        if (accountSummary.propertySummaries && accountSummary.propertySummaries.length > 0) {
          for (const propertySummary of accountSummary.propertySummaries) {
            try {
              // Extract property ID from the property name (format: "properties/123456789")
              const propertyId = propertySummary.property?.split('/')[1];
              if (!propertyId) continue;

              // Get detailed property information
              const propertyResponse = await analyticsAdmin.properties.get({
                name: propertySummary.property,
              });

              const property = propertyResponse.data;

              // Get data streams to find measurement ID
              let measurementId = null;
              try {
                const dataStreamsResponse = await analyticsAdmin.properties.dataStreams.list({
                  parent: propertySummary.property,
                });

                if (dataStreamsResponse.data.dataStreams && dataStreamsResponse.data.dataStreams.length > 0) {
                  // Find web data stream
                  const webStream = dataStreamsResponse.data.dataStreams.find(
                    stream => stream.type === 'WEB_DATA_STREAM'
                  );
                  if (webStream && webStream.webStreamData) {
                    measurementId = webStream.webStreamData.measurementId;
                  }
                }
              } catch (streamError) {
                const errorMessage = streamError?.message || String(streamError) || 'Unknown error';
                this.logger.warn(`Failed to fetch data streams for property ${propertyId}: ${errorMessage}`);
              }

              properties.push({
                propertyId,
                propertyName: propertySummary.displayName || property.displayName || `Property ${propertyId}`,
                displayName: property.displayName,
                websiteUrl: property.serviceLevel === 'GOOGLE_ANALYTICS_STANDARD' ? null : property.parent,
                timeZone: property.timeZone || 'America/New_York',
                currency: property.currencyCode || 'USD',
                industryCategory: property.industryCategory || null,
                measurementId,
                isActive: property.deleteTime ? false : true, // Property is active if not deleted
              });
            } catch (propertyError) {
              const errorMessage = propertyError?.message || String(propertyError) || 'Unknown error';
              this.logger.warn(
                `Failed to fetch details for property ${propertySummary.property}: ${errorMessage}`
              );
              // Continue with other properties
            }
          }
        }
      }

      if (properties.length === 0) {
        this.logger.warn('No valid GA4 properties could be accessed');
      }

      this.logger.log(`Found ${properties.length} accessible GA4 properties`);
      return properties;
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      const errorStack = error?.stack || '';

      this.logger.error(
        `Failed to fetch GA4 properties: ${errorMessage}`,
        errorStack
      );

      if (errorMessage.includes('PERMISSION_DENIED')) {
        throw new CustomerGoogleAccountException(
          'Google Analytics API access denied. Please ensure you have granted the required Analytics permissions.'
        );
      }

      if (errorMessage.includes('invalid_grant')) {
        throw new CustomerGoogleAccountException(
          'Google authentication expired. Please try connecting again.'
        );
      }

      throw new CustomerGoogleAccountException(
        `Failed to access GA4 properties: ${errorMessage}`
      );
    }
  }

  private async fetchGoogleAdsAccounts(
    oauth2Client: InstanceType<typeof google.auth.OAuth2>
  ): Promise<GoogleAdsAccountInfo[]> {
    try {
      // Get credentials from OAuth client
      const credentials = oauth2Client.credentials;
      if (!credentials.refresh_token) {
        throw new CustomerGoogleAccountException(
          'No valid OAuth refresh token available'
        );
      }

      const developerToken = this.configService.get<string>(
        'GOOGLE_ADS_DEVELOPER_TOKEN'
      );
      if (!developerToken) {
        throw new CustomerGoogleAccountException(
          'Google Ads Developer Token is not configured. Please add GOOGLE_ADS_DEVELOPER_TOKEN to environment variables.'
        );
      }

      // Refresh the access token first to ensure we have a valid one
      try {
        const refreshResponse = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(refreshResponse.credentials);
        this.logger.log('Successfully refreshed access token for Google Ads');
      } catch (refreshError) {
        const refreshErrorMessage = refreshError?.message || String(refreshError) || 'Unknown error';
        this.logger.error(`Failed to refresh access token: ${refreshErrorMessage}`);
        throw new CustomerGoogleAccountException(
          `Failed to refresh access token: ${refreshErrorMessage}`
        );
      }

      const loginCustomerId = this.configService.get<string>(
        'GOOGLE_ADS_LOGIN_CUSTOMER_ID'
      );

      const clientConfig = {
        client_id: this.configService.get<string>('GOOGLE_CLIENT_ID'),
        client_secret: this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
        refresh_token: credentials.refresh_token,
        developer_token: developerToken,
        login_customer_id: loginCustomerId,
      };

      this.logger.log('Initializing Google Ads client with config:', {
        client_id: clientConfig.client_id?.substring(0, 20) + '...',
        has_refresh_token: !!clientConfig.refresh_token,
        has_developer_token: !!clientConfig.developer_token,
        login_customer_id: clientConfig.login_customer_id,
      });

      let client;
      try {
        client = new GoogleAdsApi(clientConfig);
      } catch (initError) {
        const initErrorMessage = initError?.message || String(initError) || 'Unknown error';
        this.logger.error(`Failed to initialize Google Ads client: ${initErrorMessage}`, initError?.stack);
        throw new CustomerGoogleAccountException(
          `Failed to initialize Google Ads API client: ${initErrorMessage}`
        );
      }

      // Use the correct method to list accessible customers
      // CRITICAL: Must pass refresh_token to listAccessibleCustomers
      let customers;
      try {
        customers = await client.listAccessibleCustomers(credentials.refresh_token);
      } catch (listError) {
        const listErrorMessage = listError?.message || String(listError) || 'Unknown error';
        this.logger.error(`Failed to list accessible customers: ${listErrorMessage}`, listError?.stack);
        throw new CustomerGoogleAccountException(
          `Failed to list Google Ads accounts: ${listErrorMessage}`
        );
      }

      if (!customers.resource_names || customers.resource_names.length === 0) {
        throw new CustomerGoogleAccountException(
          'No accessible Google Ads accounts found for this Google account'
        );
      }

      const accounts: GoogleAdsAccountInfo[] = [];

      // For each accessible customer, get account details
      for (const customerId of customers.resource_names) {
        try {
          const accountId = customerId.replace('customers/', '');
          // CRITICAL: Must pass refresh_token to Customer for authentication
          const customer = client.Customer({
            customer_id: accountId,
            refresh_token: credentials.refresh_token,
          });

          const query = `
            SELECT 
              customer.id,
              customer.descriptive_name,
              customer.currency_code,
              customer.time_zone,
              customer.status
            FROM customer
            LIMIT 1
          `;

          const response = await customer.query(query);

          if (response.length > 0) {
            const customerData = response[0].customer;
            accounts.push({
              accountId: customerData.id.toString(),
              accountName:
                customerData.descriptive_name || `Account ${customerData.id}`,
              currency: customerData.currency_code || 'USD',
              timeZone: customerData.time_zone || 'America/New_York',
              isActive: customerData.status === 'ENABLED',
            });
          }
        } catch (accountError) {
          // Better error serialization - handle objects, strings, and primitives
          let errorMsg = 'Unknown error';
          if (accountError?.message) {
            errorMsg = accountError.message;
          } else if (typeof accountError === 'string') {
            errorMsg = accountError;
          } else if (accountError && typeof accountError === 'object') {
            errorMsg = JSON.stringify(accountError);
          } else if (accountError) {
            errorMsg = String(accountError);
          }

          this.logger.warn(
            `Failed to fetch details for account ${customerId}: ${errorMsg}`
          );
          // Continue with other accounts - but don't fail the entire process for individual account errors
        }
      }

      if (accounts.length === 0) {
        throw new CustomerGoogleAccountException(
          'No valid Google Ads accounts could be accessed. Please ensure the Google account has access to Google Ads.'
        );
      }

      this.logger.log(
        `Found ${accounts.length} accessible Google Ads accounts`
      );
      return accounts;
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      const errorStack = error?.stack || '';

      this.logger.error(
        `Failed to fetch Google Ads accounts: ${errorMessage}`,
        errorStack
      );

      // Don't create fallback accounts - fail properly
      if (error instanceof CustomerGoogleAccountException) {
        throw error;
      }

      if (errorMessage.includes('PERMISSION_DENIED')) {
        throw new CustomerGoogleAccountException(
          'Google Ads API access denied. Please enable the Google Ads API in Google Cloud Console and ensure you have a valid developer token.'
        );
      }

      if (errorMessage.includes('invalid_grant')) {
        throw new CustomerGoogleAccountException(
          'Google authentication expired. Please try connecting again.'
        );
      }

      throw new CustomerGoogleAccountException(
        `Failed to access Google Ads accounts: ${errorMessage}`
      );
    }
  }

  getGoogleAuthUrl(customerId: string, state?: string): string {
    const scopes = [
      // User info
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      // Google Ads
      'https://www.googleapis.com/auth/adwords',
      // Google Tag Manager
      'https://www.googleapis.com/auth/tagmanager.manage.accounts',
      'https://www.googleapis.com/auth/tagmanager.edit.containers',
      'https://www.googleapis.com/auth/tagmanager.publish',
      // Google Analytics 4
      'https://www.googleapis.com/auth/analytics.edit',
      'https://www.googleapis.com/auth/analytics.readonly',
    ];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state: state || customerId,
      include_granted_scopes: true,
    });

    this.logger.log(`Generated Google auth URL for customer: ${customerId}`);
    return authUrl;
  }
}
