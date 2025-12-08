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

      // Step 4: Connect to GA4 and ensure OneClickTag property exists (non-blocking)
      this.emitProgress(customerId, 'ga4', 'pending', 'Connecting to Google Analytics 4...');
      try {
        await this.setupGA4Properties(customerId);
        this.emitProgress(customerId, 'ga4', 'success', 'GA4 connected successfully');
      } catch (ga4Error) {
        const errorMessage = ga4Error?.message || String(ga4Error) || 'Unknown error';
        this.logger.warn(
          `Failed to setup GA4 properties for customer ${customerId}: ${errorMessage}. Continuing with connection.`
        );
        this.emitProgress(customerId, 'ga4', 'error', 'GA4 connection failed', errorMessage);
        // Don't fail the entire connection if GA4 setup fails
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
        slug: updatedCustomer.slug,
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
        slug: updatedCustomer.slug,
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

  /**
   * Setup GA4 properties during initial connection
   * This ensures OneClickTag property exists (creates or restores from trash if needed)
   */
  async setupGA4Properties(customerId: string): Promise<any[]> {
    const tenantId = TenantContextService.getTenantId();
    if (!tenantId) {
      throw new CustomerGoogleAccountException('Tenant context is required');
    }

    this.logger.log(`Setting up GA4 properties for customer: ${customerId}`);

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

      // Get OAuth tokens
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
      let ga4Properties = await this.fetchGA4Properties(oauth2Client);

      // Check for OneClickTag property
      let oneClickTagProperty = ga4Properties.find(p =>
        p.displayName && p.displayName.includes('OneClickTag')
      );

      if (!oneClickTagProperty) {
        this.logger.log('OneClickTag property not found in active properties, checking trash...');

        // Check if OneClickTag property is in trash
        const trashedProperty = await this.findTrashedGA4Property(oauth2Client, 'OneClickTag');

        if (trashedProperty) {
          this.logger.log(`Found OneClickTag property in trash: ${trashedProperty.propertyId}, restoring...`);
          await this.restoreGA4Property(oauth2Client, trashedProperty.propertyId);

          // Re-fetch properties after restoration
          ga4Properties = await this.fetchGA4Properties(oauth2Client);

          // Verify it's now in the list
          oneClickTagProperty = ga4Properties.find(p =>
            p.displayName && p.displayName.includes('OneClickTag')
          );

          if (oneClickTagProperty) {
            this.logger.log(`Successfully restored OneClickTag property: ${oneClickTagProperty.propertyId}`);
          } else {
            this.logger.warn('Property restored but not found in active properties, may need manual verification');
          }
        } else {
          // No OneClickTag property found anywhere, create a new one
          this.logger.log('OneClickTag property not found anywhere, creating new property...');
          const newProperty = await this.createGA4Property(oauth2Client, customer);

          // Add ONLY the new property to the list (don't fetch all again to avoid race conditions)
          ga4Properties.push(newProperty);

          this.logger.log(`Created new OneClickTag property: ${newProperty.propertyId}`);
        }
      } else {
        this.logger.log(`Found existing OneClickTag property: ${oneClickTagProperty.propertyId}`);
      }

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
        `Setup complete: ${savedProperties.length} GA4 properties for customer: ${customerId}`
      );
      return ga4Properties;
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(`Failed to setup GA4 properties: ${errorMessage}`, error?.stack);
      throw new CustomerGoogleAccountException(`GA4 setup failed: ${errorMessage}`);
    }
  }

  /**
   * Sync GA4 properties (routine sync - no creation, only fetches existing properties)
   */
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

      // Fetch GA4 properties (active only)
      const ga4Properties = await this.fetchGA4Properties(oauth2Client);

      this.logger.log(`Found ${ga4Properties.length} GA4 properties to sync`);

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

    const tenantId = TenantContextService.getTenantId();
    if (!tenantId) {
      throw new CustomerGoogleAccountException('Tenant context is required');
    }

    try {
      // Get customer to get their name
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId, tenantId },
      });

      if (!customer) {
        throw new CustomerNotFoundException(customerId);
      }

      // Initialize GTM client
      const gtmClient = await this.initializeGTMClient(userId);

      // First, list GTM accounts to get the account ID
      const accountsResponse = await gtmClient.accounts.list();

      if (!accountsResponse.data.account || accountsResponse.data.account.length === 0) {
        this.logger.warn('No GTM accounts found - user must create a GTM account first at https://tagmanager.google.com');
        throw new CustomerGoogleAccountException('No GTM accounts found. Please create a GTM account at https://tagmanager.google.com and reconnect.');
      }

      const gtmAccountId = accountsResponse.data.account[0].accountId;
      this.logger.log(`Found GTM account: ${gtmAccountId}`);

      // Get or create GTM container for OneClickTag
      const { containerId, containerName } = await this.getOrCreateGTMContainer(
        gtmClient,
        gtmAccountId,
        customer.fullName
      );

      this.logger.log(`Setting up GTM container: ${containerName} (${containerId})`);

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
   * Get or create GTM container for OneClickTag
   */
  private async getOrCreateGTMContainer(
    gtmClient: any,
    gtmAccountId: string,
    customerName: string
  ): Promise<{ containerId: string; containerName: string }> {
    this.logger.log('Getting or creating OneClickTag GTM container');

    try {
      // List existing containers
      const containersResponse = await gtmClient.accounts.containers.list({
        parent: `accounts/${gtmAccountId}`,
      });

      // Check if OneClickTag container already exists
      const existingContainer = containersResponse.data.container?.find(
        (container: any) => container.name?.includes('OneClickTag')
      );

      if (existingContainer) {
        this.logger.log(`Found existing OneClickTag container: ${existingContainer.containerId}`);
        return {
          containerId: existingContainer.containerId,
          containerName: existingContainer.name,
        };
      }

      // Create new container
      const containerName = `OneClickTag - ${customerName}`;
      this.logger.log(`Creating new GTM container: ${containerName}`);

      const createResponse = await gtmClient.accounts.containers.create({
        parent: `accounts/${gtmAccountId}`,
        requestBody: {
          name: containerName,
          usageContext: ['WEB'], // Web container
          notes: 'Container created by OneClickTag for automated tracking setup',
        },
      });

      const containerId = createResponse.data.containerId;
      this.logger.log(`Created GTM container: ${containerName} (${containerId})`);

      return {
        containerId,
        containerName,
      };
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(`Failed to get/create GTM container: ${errorMessage}`, error?.stack);
      throw error;
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

  /**
   * Publish a GTM workspace to make changes live
   */
  private async publishGTMWorkspace(
    gtmClient: any,
    gtmAccountId: string,
    containerId: string,
    workspaceId: string,
    versionName: string
  ): Promise<void> {
    this.logger.log(`Publishing GTM workspace: ${workspaceId}`);

    try {
      // Create a version from the workspace
      const versionResponse = await gtmClient.accounts.containers.workspaces.create_version({
        path: `accounts/${gtmAccountId}/containers/${containerId}/workspaces/${workspaceId}`,
        requestBody: {
          name: versionName,
          notes: `Automated publish by OneClickTag - ${new Date().toISOString()}`,
        },
      });

      const version = versionResponse.data;
      this.logger.log(`Created version: ${version.containerVersion?.containerVersionId}`);

      // Publish the version (setting it as live)
      if (version.containerVersion?.path) {
        const publishResponse = await gtmClient.accounts.containers.versions.publish({
          path: version.containerVersion.path,
        });

        this.logger.log(`Published version successfully: ${publishResponse.data.containerVersion?.containerVersionId}`);
      } else {
        throw new Error('Version path not found in response');
      }
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(`Failed to publish GTM workspace: ${errorMessage}`, error?.stack);
      throw error;
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

  /**
   * Verify that all required OneClickTag resources exist in GTM
   * Returns specific error messages if resources are missing
   */
  private async verifyGTMResources(
    gtmClient: any,
    gtmAccountId: string,
    containerId: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Check if OneClickTag workspace exists
      const workspacesResponse = await gtmClient.accounts.containers.workspaces.list({
        parent: `accounts/${gtmAccountId}/containers/${containerId}`,
      });

      const oneClickTagWorkspace = workspacesResponse.data.workspace?.find(
        (ws: any) => ws.name === 'OneClickTag'
      );

      if (!oneClickTagWorkspace) {
        errors.push('OneClickTag workspace not found in GTM container');
        // If workspace doesn't exist, no point checking further
        return { valid: false, errors };
      }

      const workspaceId = oneClickTagWorkspace.workspaceId;

      // Check if Conversion Linker tag exists
      const tagsResponse = await gtmClient.accounts.containers.workspaces.tags.list({
        parent: `accounts/${gtmAccountId}/containers/${containerId}/workspaces/${workspaceId}`,
      });

      const conversionLinker = tagsResponse.data.tag?.find(
        (t: any) => t.name === 'OneClickTag - Conversion Linker' && t.type === 'gclidw'
      );

      if (!conversionLinker) {
        errors.push('Conversion Linker tag not found in OneClickTag workspace');
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(`Failed to verify GTM resources: ${errorMessage}`, error?.stack);
      errors.push(`GTM verification failed: ${errorMessage}`);
      return { valid: false, errors };
    }
  }

  /**
   * Verify that OneClickTag GA4 property exists
   * Returns specific error message if property is missing or deleted
   */
  private async verifyGA4Property(
    oauth2Client: InstanceType<typeof google.auth.OAuth2>
  ): Promise<{ valid: boolean; error: string | null }> {
    try {
      const ga4Properties = await this.fetchGA4Properties(oauth2Client);

      // Check if OneClickTag property exists
      const oneClickTagProperty = ga4Properties.find(p =>
        p.displayName && p.displayName.includes('OneClickTag')
      );

      if (!oneClickTagProperty) {
        return {
          valid: false,
          error: 'OneClickTag GA4 property not found or was deleted',
        };
      }

      // Check if property has measurement ID (web data stream)
      if (!oneClickTagProperty.measurementId) {
        return {
          valid: false,
          error: 'OneClickTag GA4 property exists but has no web data stream',
        };
      }

      return { valid: true, error: null };
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(`Failed to verify GA4 property: ${errorMessage}`, error?.stack);
      return {
        valid: false,
        error: `GA4 verification failed: ${errorMessage}`,
      };
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
    gtmLastSyncedAt: string | null;
    ga4LastSyncedAt: string | null;
    adsLastSyncedAt: string | null;
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
        gtmLastSyncedAt: null,
        ga4LastSyncedAt: null,
        adsLastSyncedAt: null,
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
          gtmLastSyncedAt: null,
          ga4LastSyncedAt: null,
          adsLastSyncedAt: null,
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

            if (!accountsResponse.data.account || accountsResponse.data.account.length === 0) {
              return {
                hasAccess: false,
                error: 'No GTM accounts found for this Google account. Please reconnect.',
                accountId: null,
                containerId: null,
              };
            }

            const gtmAccountId = customer.gtmAccountId;
            const containerId = customer.gtmContainerId;

            // If we have stored account/container IDs, verify they still exist
            if (gtmAccountId && containerId) {
              // Check if the stored account still exists in the list
              const accountExists = accountsResponse.data.account.some(
                (acc: any) => acc.accountId === gtmAccountId
              );

              if (!accountExists) {
                return {
                  hasAccess: false,
                  error: 'GTM account was deleted. Please reconnect to recreate required resources.',
                  accountId: null,
                  containerId: null,
                };
              }

              // Try to access the account directly to verify it's not in trash
              try {
                await gtmClient.accounts.get({
                  path: `accounts/${gtmAccountId}`,
                });
              } catch (accountGetError) {
                const accountErrorMessage = accountGetError?.message || String(accountGetError) || 'Unknown error';

                // If we can't access the account directly, it's in trash or deleted
                if (accountErrorMessage.includes('404') ||
                    accountErrorMessage.includes('not found') ||
                    accountErrorMessage.includes('has been deleted') ||
                    accountErrorMessage.includes('does not exist')) {
                  return {
                    hasAccess: false,
                    error: 'GTM account is in trash or was deleted. Please reconnect to recreate required resources.',
                    accountId: null,
                    containerId: null,
                  };
                }

                this.logger.warn(`Failed to get GTM account details: ${accountErrorMessage}`);
              }

              // Check if the stored container still exists
              try {
                const containersResponse = await gtmClient.accounts.containers.list({
                  parent: `accounts/${gtmAccountId}`,
                });

                const containerExists = containersResponse.data.container?.some(
                  (c: any) => c.containerId === containerId
                );

                if (!containerExists) {
                  return {
                    hasAccess: false,
                    error: 'GTM container was deleted or is in trash. Please reconnect to recreate required resources.',
                    accountId: gtmAccountId,
                    containerId: null,
                  };
                }

                // Try to access the container directly to verify it's not in trash
                try {
                  await gtmClient.accounts.containers.get({
                    path: `accounts/${gtmAccountId}/containers/${containerId}`,
                  });
                } catch (getError) {
                  const getErrorMessage = getError?.message || String(getError) || 'Unknown error';

                  // If we can't access it directly, it's likely deleted or in trash
                  if (getErrorMessage.includes('404') || getErrorMessage.includes('not found')) {
                    return {
                      hasAccess: false,
                      error: 'GTM container is in trash or was deleted. Please reconnect to recreate required resources.',
                      accountId: gtmAccountId,
                      containerId: null,
                    };
                  }

                  this.logger.warn(`Failed to get GTM container details: ${getErrorMessage}`);
                }
              } catch (containerError) {
                const errorMessage = containerError?.message || String(containerError) || 'Unknown error';
                this.logger.warn(`Failed to verify GTM container: ${errorMessage}`);
                return {
                  hasAccess: false,
                  error: 'GTM container not accessible. Please reconnect to recreate required resources.',
                  accountId: gtmAccountId,
                  containerId: null,
                };
              }

              // Account and container exist, now verify workspace and tags
              const verification = await this.verifyGTMResources(gtmClient, gtmAccountId, containerId);

              if (!verification.valid) {
                return {
                  hasAccess: false,
                  error: `Setup incomplete: ${verification.errors.join(', ')}. Please reconnect to recreate required resources.`,
                  accountId: gtmAccountId,
                  containerId,
                };
              }
            }

            return {
              hasAccess: true,
              error: null,
              accountId: gtmAccountId || accountsResponse.data.account[0].accountId,
              containerId,
            };
          } catch (error) {
            const errorMessage = error?.message || String(error) || 'Failed to access GTM';
            this.logger.warn(`GTM connection test failed: ${errorMessage}`);
            return {
              hasAccess: false,
              error: `GTM verification failed: ${errorMessage}. Please reconnect.`,
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

            if (ga4Properties.length === 0) {
              return {
                hasAccess: false,
                error: 'No GA4 properties found for this Google account',
                propertyCount: 0,
              };
            }

            // Verify OneClickTag property exists
            const verification = await this.verifyGA4Property(oauth2Client);

            if (!verification.valid) {
              return {
                hasAccess: false,
                error: `${verification.error}. Please reconnect to recreate required resources.`,
                propertyCount: ga4Properties.length,
              };
            }

            return {
              hasAccess: true,
              error: null,
              propertyCount: ga4Properties.length,
            };
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
        gtmLastSyncedAt: gtmTokens?.updatedAt?.toISOString() ?? null,
        ga4LastSyncedAt: ga4Tokens?.updatedAt?.toISOString() ?? null,
        adsLastSyncedAt: adsTokens?.updatedAt?.toISOString() ?? null,
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
        gtmLastSyncedAt: null,
        ga4LastSyncedAt: null,
        adsLastSyncedAt: null,
      };
    }
  }

  async createCompleteTracking(
    customerId: string,
    trackingData: {
      name: string;
      type: string;
      selector?: string;
      urlPattern?: string;
      description?: string;
      destinations: string[];
      ga4EventName?: string;
      adsConversionValue?: number;
      config?: Record<string, any>;
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

    // Enhanced logging to debug destinations parameter
    this.logger.log(
      `Creating complete tracking setup for customer: ${customerId}`
    );
    this.logger.log(`Tracking data received: ${JSON.stringify(trackingData, null, 2)}`);
    this.logger.log(`Destinations type: ${typeof trackingData.destinations}`);
    this.logger.log(`Destinations value: ${JSON.stringify(trackingData.destinations)}`);
    this.logger.log(`Destinations is array: ${Array.isArray(trackingData.destinations)}`);

    if (trackingData.destinations) {
      this.logger.log(`Destinations length: ${trackingData.destinations.length}`);
      this.logger.log(`Destinations items: ${trackingData.destinations.map((d, i) => `[${i}]="${d}"`).join(', ')}`);
    }

    // Validate destinations parameter
    if (!trackingData.destinations || !Array.isArray(trackingData.destinations) || trackingData.destinations.length === 0) {
      throw new CustomerGoogleAccountException(
        'Destinations parameter is required and must be a non-empty array. Got: ' + JSON.stringify(trackingData.destinations)
      );
    }

    const includesGoogleAds = trackingData.destinations.includes('GOOGLE_ADS');
    const includesGA4 = trackingData.destinations.includes('GA4');

    this.logger.log(`Includes Google Ads: ${includesGoogleAds}`);
    this.logger.log(`Includes GA4: ${includesGA4}`);

    try {
      // Verify customer has Google account connected
      const customer = await this.prisma.tenantAware.customer.findUnique({
        where: { id: customerId },
        include: {
          googleAdsAccounts: true,
          ga4Properties: true,
        },
      });

      if (!customer || !customer.googleAccountId) {
        throw new CustomerGoogleAccountException(
          'Customer must have a connected Google account'
        );
      }

      // Only validate Google Ads account if user wants to track to Google Ads
      if (includesGoogleAds) {
        if (
          !customer.googleAdsAccounts ||
          customer.googleAdsAccounts.length === 0
        ) {
          throw new CustomerGoogleAccountException(
            'Customer must have at least one Google Ads account to create Google Ads tracking'
          );
        }
      }

      // Validate GA4 properties if user wants GA4 destination
      if (includesGA4) {
        if (
          !customer.ga4Properties ||
          customer.ga4Properties.length === 0
        ) {
          throw new CustomerGoogleAccountException(
            'Customer must have at least one GA4 property to create GA4 tracking'
          );
        }
      }

      // Check GTM tokens (always required)
      const gtmTokens = await this.oauthService.getOAuthTokens(
        userId,
        'google',
        'gtm'
      );

      if (!gtmTokens) {
        throw new CustomerGoogleAccountException(
          'Google Tag Manager access is required'
        );
      }

      // Only check Ads tokens if user wants Google Ads destination
      if (includesGoogleAds) {
        const adsTokens = await this.oauthService.getOAuthTokens(
          userId,
          'google',
          'ads'
        );

        if (!adsTokens) {
          throw new CustomerGoogleAccountException(
            'Google Ads access is required for Google Ads tracking'
          );
        }
      }

      // Convert type to enum format
      const trackingType = trackingData.type.toUpperCase() as
        | 'BUTTON_CLICK'
        | 'PAGE_VIEW'
        | 'FORM_SUBMIT'
        | 'LINK_CLICK'
        | 'ELEMENT_VISIBILITY';

      // Determine GA4 event name
      const ga4EventName = trackingData.ga4EventName || trackingData.type.toLowerCase();

      // Create tracking record in database first
      const tracking = await this.prisma.tenantAware.tracking.create({
        data: {
          name: trackingData.name,
          type: trackingType,
          selector: trackingData.selector || undefined,
          urlPattern: trackingData.urlPattern || undefined,
          description: trackingData.description || undefined,
          config: trackingData.config || undefined,
          destinations: trackingData.destinations as any, // TrackingDestination enum array
          ga4EventName: includesGA4 ? ga4EventName : undefined,
          status: 'CREATING',
          customerId,
          tenantId,
          createdBy: userId,
        },
      });

      let gtmTriggerId: string | undefined;
      let gtmTagId: string | undefined;
      let conversionActionId: string | undefined;
      let conversionActionResponse: any | undefined;
      let lastError: string | undefined;

      try {
        // Step 1: Create Google Ads conversion action (only if Google Ads is in destinations)
        if (includesGoogleAds) {
          const primaryAdsAccount = customer.googleAdsAccounts[0];
          conversionActionResponse =
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
        }

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

        // Step 3: Create GTM tag (either for Google Ads conversion or GA4 event)
        if (includesGoogleAds && conversionActionResponse) {
          // Create GTM tag for Google Ads conversion tracking
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
        } else if (includesGA4) {
          // Get GA4 measurement ID from properties
          const ga4Property = customer.ga4Properties.find(p => p.measurementId);

          if (!ga4Property || !ga4Property.measurementId) {
            // Try to refresh GA4 properties to get measurement IDs
            this.logger.warn('No GA4 property with measurement ID found, attempting to refresh GA4 properties...');
            try {
              await this.syncGA4Properties(customerId);

              // Re-fetch customer with updated GA4 properties
              const refreshedCustomer = await this.prisma.tenantAware.customer.findUnique({
                where: { id: customerId },
                include: { ga4Properties: true },
              });

              const refreshedProperty = refreshedCustomer?.ga4Properties?.find(p => p.measurementId);
              if (!refreshedProperty || !refreshedProperty.measurementId) {
                throw new CustomerGoogleAccountException(
                  'GA4 property does not have a measurement ID. Please ensure your GA4 property has at least one web data stream configured.'
                );
              }

              // Create GTM tag with refreshed measurement ID
              const tag = await this.createGA4GTMTag(
                gtmClient,
                gtmAccountId,
                containerId,
                workspaceId,
                trackingData,
                gtmTriggerId,
                refreshedProperty.measurementId
              );
              gtmTagId = tag.tagId;
            } catch (refreshError) {
              throw new CustomerGoogleAccountException(
                `Failed to get GA4 measurement ID: ${refreshError.message}`
              );
            }
          } else {
            // Create GTM tag for GA4 event tracking
            const tag = await this.createGA4GTMTag(
              gtmClient,
              gtmAccountId,
              containerId,
              workspaceId,
              trackingData,
              gtmTriggerId,
              ga4Property.measurementId
            );
            gtmTagId = tag.tagId;
          }
        }

        // Update tracking record with successful creation
        const updateData: any = {
          status: 'ACTIVE',
          gtmTriggerId,
          gtmContainerId: containerId,
          gtmWorkspaceId: workspaceId,
          lastSyncAt: new Date(),
          updatedBy: userId,
        };

        // Set appropriate GTM tag IDs based on what was created
        if (includesGoogleAds && includesGA4) {
          updateData.gtmTagIdAds = gtmTagId; // First one created is Ads
          updateData.gtmTagIdGA4 = gtmTagId; // Would need separate IDs if both created
        } else if (includesGoogleAds) {
          updateData.gtmTagIdAds = gtmTagId;
          updateData.gtmTagId = gtmTagId;
        } else if (includesGA4) {
          updateData.gtmTagIdGA4 = gtmTagId;
          updateData.gtmTagId = gtmTagId;
        }

        // Set conversion action ID if created
        if (conversionActionId) {
          updateData.conversionActionId = conversionActionId;
        }

        await this.prisma.tenantAware.tracking.update({
          where: { id: tracking.id },
          data: updateData,
        });

        // Create conversion action record in database (only if Google Ads was created)
        if (includesGoogleAds && conversionActionResponse && conversionActionId) {
          const primaryAdsAccount = customer.googleAdsAccounts[0];
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
        }

        // Publish the OneClickTag workspace to make tags live
        try {
          await this.publishGTMWorkspace(
            gtmClient,
            gtmAccountId,
            containerId,
            workspaceId,
            `OneClickTag: Created tracking "${trackingData.name}"`
          );
          this.logger.log(`Published OneClickTag workspace successfully`);
        } catch (publishError) {
          const publishErrorMessage = publishError?.message || String(publishError) || 'Unknown error';
          this.logger.warn(`Failed to publish GTM workspace: ${publishErrorMessage}. Tags created but not yet live. Please publish manually in GTM.`);
          // Don't throw - tracking was created successfully, just not published
        }

        this.logger.log(
          `Complete tracking setup created successfully for customer: ${customerId}`
        );

        return {
          trackingId: tracking.id,
          gtmTriggerId,
          gtmTagId,
          conversionActionId,
          status: 'active',
          message: `Tracking "${trackingData.name}" created successfully and published to GTM. Events should now flow to ${includesGA4 ? 'GA4' : ''}${includesGA4 && includesGoogleAds ? ' and ' : ''}${includesGoogleAds ? 'Google Ads' : ''}.`,
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
      selector?: string;
      urlPattern?: string;
      description?: string;
    }
  ): Promise<tagmanager_v2.Schema$Trigger> {
    const triggerConfig = this.getTriggerConfig(trackingData);

    // Add timestamp to make names unique
    const uniqueSuffix = Date.now().toString().slice(-6);
    const triggerResource: any = {
      name: `${trackingData.name} - Trigger ${uniqueSuffix}`,
      type: triggerConfig.type,
    };

    // Add filters if present
    if (triggerConfig.filters && triggerConfig.filters.length > 0) {
      triggerResource.filter = triggerConfig.filters;
    }

    // For element visibility triggers, add selector as parameter
    if (triggerConfig.type === 'ELEMENT_VISIBILITY' && trackingData.selector) {
      triggerResource.selector = trackingData.selector;
      triggerResource.parameter = [
        {
          type: 'TEMPLATE',
          key: 'selector',
          value: trackingData.selector,
        },
      ];
    }

    this.logger.log(`Creating GTM trigger with config: ${JSON.stringify(triggerResource, null, 2)}`);

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
      selector?: string;
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
    // Add timestamp to make names unique
    const uniqueSuffix = Date.now().toString().slice(-6);
    const tagResource = {
      name: `${trackingData.name} - Conversion Tag ${uniqueSuffix}`,
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

  private async createGA4GTMTag(
    gtmClient: tagmanager_v2.Tagmanager,
    gtmAccountId: string,
    containerId: string,
    workspaceId: string,
    trackingData: {
      name: string;
      type: string;
      selector?: string;
      urlPattern?: string;
      description?: string;
      ga4EventName?: string;
    },
    triggerId: string,
    measurementId: string
  ): Promise<tagmanager_v2.Schema$Tag> {
    // Use provided GA4 event name or generate from type
    const eventName = trackingData.ga4EventName || trackingData.type.toLowerCase();

    this.logger.log(`Creating GA4 tag with event name: "${eventName}" and measurement ID: ${measurementId}`);

    // Add timestamp to make names unique
    const uniqueSuffix = Date.now().toString().slice(-6);
    const tagResource = {
      name: `${trackingData.name} - GA4 Event ${uniqueSuffix}`,
      type: 'gaawe', // Google Analytics: GA4 Event
      firingTriggerId: [triggerId],
      parameter: [
        {
          type: 'TEMPLATE',
          key: 'eventName',
          value: eventName,
        },
        {
          type: 'TEMPLATE',
          key: 'measurementIdOverride',
          value: measurementId,
        },
        {
          type: 'BOOLEAN',
          key: 'sendEcommerceData',
          value: 'false',
        },
      ],
    };

    this.logger.log(`GA4 Tag configuration: ${JSON.stringify(tagResource, null, 2)}`);

    const response = await gtmClient.accounts.containers.workspaces.tags.create(
      {
        parent: `accounts/${gtmAccountId}/containers/${containerId}/workspaces/${workspaceId}`,
        requestBody: tagResource,
      }
    );

    this.logger.log(`✓ Created GA4 GTM tag: ${response.data.tagId} - Event "${eventName}" will be sent to GA4 property ${measurementId}`);
    return response.data;
  }

  private getTriggerConfig(trackingData: {
    name: string;
    type: string;
    selector?: string;
    urlPattern?: string;
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
    this.logger.log(`Building trigger config for type: ${trackingData.type}, selector: ${trackingData.selector}, urlPattern: ${trackingData.urlPattern}`);

    switch (trackingData.type) {
      case 'button_click':
      case 'link_click':
      case 'BUTTON_CLICK':
      case 'LINK_CLICK':
        // Click trigger - for now using "All Clicks" approach
        // CSS selector filtering is complex in GTM API and is better handled in the GTM UI
        // The selector is logged and saved to the database for manual configuration if needed
        if (trackingData.selector) {
          this.logger.log(`NOTE: Click tracking created with selector "${trackingData.selector}". For precise CSS selector matching, please refine the trigger in GTM UI.`);
          // Try using Click ID if selector looks like an ID
          if (trackingData.selector.startsWith('#')) {
            const idValue = trackingData.selector.substring(1);
            return {
              type: 'CLICK',
              filters: [
                {
                  type: 'equals',
                  parameter: [
                    {
                      type: 'TEMPLATE',
                      key: 'arg0',
                      value: '{{Click ID}}',
                    },
                    {
                      type: 'TEMPLATE',
                      key: 'arg1',
                      value: idValue,
                    },
                  ],
                },
              ],
            };
          }
          // Try using Click Classes if selector looks like a class
          else if (trackingData.selector.startsWith('.')) {
            const classValue = trackingData.selector.substring(1);
            return {
              type: 'CLICK',
              filters: [
                {
                  type: 'contains',
                  parameter: [
                    {
                      type: 'TEMPLATE',
                      key: 'arg0',
                      value: '{{Click Classes}}',
                    },
                    {
                      type: 'TEMPLATE',
                      key: 'arg1',
                      value: classValue,
                    },
                  ],
                },
              ],
            };
          }
          // For complex selectors, create "All Clicks" and let user refine in GTM
          else {
            this.logger.warn(`Complex CSS selector "${trackingData.selector}" cannot be directly applied via API. Creating "All Clicks" trigger. Please refine in GTM UI.`);
            return {
              type: 'CLICK',
              filters: [],
            };
          }
        } else {
          // All clicks
          return {
            type: 'CLICK',
            filters: [],
          };
        }

      case 'page_view':
      case 'PAGE_VIEW':
        // Page view trigger with URL pattern filter
        if (trackingData.urlPattern) {
          return {
            type: 'PAGE_VIEW',
            filters: [
              {
                type: 'contains',
                parameter: [
                  {
                    type: 'TEMPLATE',
                    key: 'arg0',
                    value: '{{Page URL}}',
                  },
                  {
                    type: 'TEMPLATE',
                    key: 'arg1',
                    value: trackingData.urlPattern,
                  },
                ],
              },
            ],
          };
        } else {
          // All pages
          return {
            type: 'PAGE_VIEW',
            filters: [],
          };
        }

      case 'form_submit':
      case 'FORM_SUBMIT':
        // Form submission trigger
        if (trackingData.selector) {
          this.logger.log(`NOTE: Form tracking created with selector "${trackingData.selector}". For precise CSS selector matching, please refine the trigger in GTM UI.`);
          // Try using Form ID if selector looks like an ID
          if (trackingData.selector.startsWith('#')) {
            const idValue = trackingData.selector.substring(1);
            return {
              type: 'FORM_SUBMISSION',
              filters: [
                {
                  type: 'equals',
                  parameter: [
                    {
                      type: 'TEMPLATE',
                      key: 'arg0',
                      value: '{{Form ID}}',
                    },
                    {
                      type: 'TEMPLATE',
                      key: 'arg1',
                      value: idValue,
                    },
                  ],
                },
              ],
            };
          }
          // Try using Form Classes if selector looks like a class
          else if (trackingData.selector.startsWith('.')) {
            const classValue = trackingData.selector.substring(1);
            return {
              type: 'FORM_SUBMISSION',
              filters: [
                {
                  type: 'contains',
                  parameter: [
                    {
                      type: 'TEMPLATE',
                      key: 'arg0',
                      value: '{{Form Classes}}',
                    },
                    {
                      type: 'TEMPLATE',
                      key: 'arg1',
                      value: classValue,
                    },
                  ],
                },
              ],
            };
          }
          // For complex selectors, create "All Forms" and let user refine in GTM
          else {
            this.logger.warn(`Complex CSS selector "${trackingData.selector}" cannot be directly applied via API. Creating "All Form Submissions" trigger. Please refine in GTM UI.`);
            return {
              type: 'FORM_SUBMISSION',
              filters: [],
            };
          }
        } else {
          // All form submissions
          return {
            type: 'FORM_SUBMISSION',
            filters: [],
          };
        }

      case 'element_visibility':
      case 'ELEMENT_VISIBILITY':
        // Element visibility trigger - selector is required and will be added as parameter in createGTMTrigger
        return {
          type: 'ELEMENT_VISIBILITY',
          filters: [],
        };

      default:
        // Default to all clicks trigger
        this.logger.warn(`Unknown tracking type: ${trackingData.type}. Defaulting to ALL CLICKS trigger.`);
        return {
          type: 'CLICK',
          filters: [],
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

  /**
   * Create a new GA4 property for OneClickTag
   */
  private async createGA4Property(
    oauth2Client: InstanceType<typeof google.auth.OAuth2>,
    customer: any
  ): Promise<any> {
    try {
      const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client });

      // First, get the account to create property under
      const accountSummariesResponse = await analyticsAdmin.accountSummaries.list();

      if (!accountSummariesResponse.data.accountSummaries ||
          accountSummariesResponse.data.accountSummaries.length === 0) {
        throw new CustomerGoogleAccountException(
          'No GA4 accounts found. Please create a GA4 account at https://analytics.google.com and reconnect.'
        );
      }

      const account = accountSummariesResponse.data.accountSummaries[0];
      const accountName = account.account; // Format: "accounts/123456789"

      // Double-check if OneClickTag property already exists (prevent race conditions)
      this.logger.log(`Checking for existing OneClickTag properties before creating...`);
      const existingProperties = await this.fetchGA4Properties(oauth2Client);
      const existingOneClickTag = existingProperties.find(p =>
        p.displayName && p.displayName.includes('OneClickTag')
      );

      if (existingOneClickTag) {
        this.logger.warn(`OneClickTag property already exists (${existingOneClickTag.propertyId}), skipping creation`);
        return existingOneClickTag;
      }

      this.logger.log(`Creating GA4 property for customer under account: ${accountName}`);

      // Create property
      const propertyName = `OneClickTag - ${customer.fullName}`;
      const websiteUrl = customer.website || `https://${customer.slug}.example.com`;

      const propertyResponse = await analyticsAdmin.properties.create({
        requestBody: {
          parent: accountName,
          displayName: propertyName,
          timeZone: 'America/New_York',
          currencyCode: 'USD',
          industryCategory: 'TECHNOLOGY',
        },
      });

      const property = propertyResponse.data;
      const propertyId = property.name?.split('/')[1];

      this.logger.log(`Created GA4 property: ${propertyName} (${propertyId})`);

      // Create a web data stream for the property
      let measurementId = null;
      try {
        const dataStreamResponse = await analyticsAdmin.properties.dataStreams.create({
          parent: property.name,
          requestBody: {
            type: 'WEB_DATA_STREAM',
            displayName: `${propertyName} - Web`,
            webStreamData: {
              defaultUri: websiteUrl,
            },
          },
        });

        measurementId = dataStreamResponse.data.webStreamData?.measurementId;
        this.logger.log(`Created web data stream with measurement ID: ${measurementId}`);
      } catch (streamError) {
        const errorMessage = streamError?.message || String(streamError) || 'Unknown error';
        this.logger.warn(`Failed to create data stream: ${errorMessage}`);
        // Continue without measurement ID
      }

      return {
        propertyId,
        propertyName,
        displayName: property.displayName,
        websiteUrl,
        timeZone: property.timeZone || 'America/New_York',
        currency: property.currencyCode || 'USD',
        industryCategory: property.industryCategory || 'TECHNOLOGY',
        measurementId,
        isActive: true,
      };
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(`Failed to create GA4 property: ${errorMessage}`, error?.stack);
      throw new CustomerGoogleAccountException(`Failed to create GA4 property: ${errorMessage}`);
    }
  }

  /**
   * Find OneClickTag property in trash
   */
  private async findTrashedGA4Property(
    oauth2Client: InstanceType<typeof google.auth.OAuth2>,
    searchName: string
  ): Promise<{ propertyId: string; propertyName: string } | null> {
    try {
      const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client });

      // List account summaries to get accounts
      const accountSummariesResponse = await analyticsAdmin.accountSummaries.list();

      if (!accountSummariesResponse.data.accountSummaries ||
          accountSummariesResponse.data.accountSummaries.length === 0) {
        return null;
      }

      // Search through each account for deleted properties
      for (const accountSummary of accountSummariesResponse.data.accountSummaries) {
        try {
          // List properties including deleted ones
          const propertiesResponse = await analyticsAdmin.properties.list({
            filter: `parent:${accountSummary.account} show_deleted:true`,
          });

          if (propertiesResponse.data.properties) {
            for (const property of propertiesResponse.data.properties) {
              // Check if property is deleted and matches our search name
              if (property.deleteTime && property.displayName?.includes(searchName)) {
                const propertyId = property.name?.split('/')[1];
                this.logger.log(`Found trashed property: ${property.displayName} (${propertyId})`);
                return {
                  propertyId,
                  propertyName: property.displayName,
                };
              }
            }
          }
        } catch (error) {
          const errorMessage = error?.message || String(error) || 'Unknown error';
          this.logger.warn(`Failed to list properties for account ${accountSummary.account}: ${errorMessage}`);
          // Continue with next account
        }
      }

      return null;
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(`Failed to search for trashed properties: ${errorMessage}`, error?.stack);
      return null;
    }
  }

  /**
   * Restore GA4 property from trash
   */
  private async restoreGA4Property(
    oauth2Client: InstanceType<typeof google.auth.OAuth2>,
    propertyId: string
  ): Promise<void> {
    try {
      const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client });

      this.logger.log(`Restoring GA4 property from trash: ${propertyId}`);

      // Undelete the property by updating it with deleteTime removed
      await analyticsAdmin.properties.patch({
        name: `properties/${propertyId}`,
        updateMask: 'deleteTime',
        requestBody: {
          deleteTime: null, // Clearing deleteTime restores the property
        },
      });

      this.logger.log(`Successfully restored GA4 property: ${propertyId}`);
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(`Failed to restore GA4 property ${propertyId}: ${errorMessage}`, error?.stack);
      throw new CustomerGoogleAccountException(`Failed to restore property from trash: ${errorMessage}`);
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

                // If no web data stream exists, create one
                if (!measurementId) {
                  this.logger.log(`No web data stream found for property ${propertyId}, creating one...`);
                  try {
                    const websiteUrl = property.serviceLevel === 'GOOGLE_ANALYTICS_STANDARD' ? 'https://example.com' : (property.parent || 'https://example.com');
                    const dataStreamResponse = await analyticsAdmin.properties.dataStreams.create({
                      parent: propertySummary.property,
                      requestBody: {
                        type: 'WEB_DATA_STREAM',
                        displayName: `${property.displayName || 'OneClickTag'} - Web`,
                        webStreamData: {
                          defaultUri: websiteUrl,
                        },
                      },
                    });

                    measurementId = dataStreamResponse.data.webStreamData?.measurementId;
                    this.logger.log(`Created web data stream with measurement ID: ${measurementId}`);
                  } catch (createStreamError) {
                    const errorMessage = createStreamError?.message || String(createStreamError) || 'Unknown error';
                    this.logger.warn(`Failed to create data stream for property ${propertyId}: ${errorMessage}`);
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
