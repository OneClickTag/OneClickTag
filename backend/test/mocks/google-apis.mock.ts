/**
 * Mock implementations for Google APIs
 */

// Mock Google OAuth2
export const mockGoogleAuth = {
  OAuth2: jest.fn().mockImplementation((clientId, clientSecret, redirectUrl) => ({
    clientId,
    clientSecret,
    redirectUrl,
    
    setCredentials: jest.fn(),
    
    getAccessToken: jest.fn().mockImplementation((callback) => {
      if (callback) {
        callback(null, 'mock-access-token');
      }
      return Promise.resolve({ token: 'mock-access-token' });
    }),
    
    refreshAccessToken: jest.fn().mockImplementation((callback) => {
      const result = {
        credentials: {
          access_token: 'new-mock-access-token',
          refresh_token: 'mock-refresh-token',
          expiry_date: Date.now() + 3600000,
        },
      };
      if (callback) {
        callback(null, result);
      }
      return Promise.resolve(result);
    }),
    
    getTokenInfo: jest.fn().mockResolvedValue({
      access_type: 'offline',
      scope: 'https://www.googleapis.com/auth/adwords',
      expires_in: 3600,
    }),
    
    generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/oauth/authorize?mock=true'),
    
    getToken: jest.fn().mockImplementation((code, callback) => {
      const result = {
        tokens: {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          scope: 'https://www.googleapis.com/auth/adwords',
          token_type: 'Bearer',
          expiry_date: Date.now() + 3600000,
        },
      };
      if (callback) {
        callback(null, result);
      }
      return Promise.resolve(result);
    }),
  })),
};

// Mock Google Ads API
export const mockGoogleAdsApi = {
  GoogleAdsApi: jest.fn().mockImplementation((config) => ({
    config,
    
    Customer: jest.fn().mockImplementation((customerId) => ({
      customerId,
      
      query: jest.fn().mockResolvedValue([
        {
          customer: {
            resourceName: `customers/${customerId}`,
            id: customerId,
            descriptiveName: 'Mock Customer',
            currencyCode: 'USD',
            timeZone: 'America/New_York',
          },
        },
      ]),
      
      mutate: jest.fn().mockResolvedValue({
        results: [
          {
            resourceName: 'customers/123/conversionActions/456',
            conversionAction: {
              id: '456',
              name: 'Mock Conversion Action',
              status: 'ENABLED',
              type: 'WEBPAGE',
            },
          },
        ],
      }),
      
      listAccessibleCustomers: jest.fn().mockResolvedValue([
        { id: '123', name: 'Test Customer 1' },
        { id: '456', name: 'Test Customer 2' },
      ]),
    })),
    
    ConversionAction: {
      create: jest.fn().mockResolvedValue({
        resourceName: 'customers/123/conversionActions/789',
        id: '789',
        name: 'New Conversion Action',
        status: 'ENABLED',
      }),
      
      update: jest.fn().mockResolvedValue({
        resourceName: 'customers/123/conversionActions/789',
        id: '789',
        name: 'Updated Conversion Action',
        status: 'ENABLED',
      }),
      
      remove: jest.fn().mockResolvedValue({}),
    },
    
    Campaign: {
      query: jest.fn().mockResolvedValue([
        {
          campaign: {
            resourceName: 'customers/123/campaigns/789',
            id: '789',
            name: 'Mock Campaign',
            status: 'ENABLED',
          },
        },
      ]),
    },
    
    report: jest.fn().mockResolvedValue({
      results: [
        {
          segments: { date: '2024-01-01' },
          metrics: {
            conversions: 10,
            conversionValue: 1000,
            clicks: 100,
            impressions: 1000,
            cost: 50000000, // In micros
          },
        },
      ],
    }),
  })),
  
  // Error classes
  GoogleAdsFailure: class MockGoogleAdsFailure extends Error {
    constructor(message: string, public code: number = 400) {
      super(message);
      this.name = 'GoogleAdsFailure';
    }
  },
  
  AuthenticationError: class MockAuthenticationError extends Error {
    constructor(message: string = 'Authentication failed') {
      super(message);
      this.name = 'AuthenticationError';
    }
  },
};

// Mock Firebase Admin
export const mockFirebaseAdmin = {
  initializeApp: jest.fn().mockReturnValue({
    name: 'mock-app',
    options: {},
  }),
  
  auth: jest.fn().mockReturnValue({
    verifyIdToken: jest.fn().mockResolvedValue({
      uid: 'mock-firebase-uid',
      email: 'user@example.com',
      email_verified: true,
      name: 'Mock User',
      picture: 'https://example.com/avatar.jpg',
      iss: 'https://securetoken.google.com/mock-project',
      aud: 'mock-project',
      auth_time: Date.now() / 1000,
      user_id: 'mock-firebase-uid',
      sub: 'mock-firebase-uid',
      iat: Date.now() / 1000,
      exp: Date.now() / 1000 + 3600,
      firebase: {
        identities: {
          email: ['user@example.com'],
        },
        sign_in_provider: 'password',
      },
    }),
    
    createCustomToken: jest.fn().mockResolvedValue('mock-custom-token'),
    
    getUser: jest.fn().mockResolvedValue({
      uid: 'mock-firebase-uid',
      email: 'user@example.com',
      emailVerified: true,
      displayName: 'Mock User',
      photoURL: 'https://example.com/avatar.jpg',
      disabled: false,
      metadata: {
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString(),
      },
      customClaims: {},
      providerData: [],
      tokensValidAfterTime: new Date().toISOString(),
    }),
    
    createUser: jest.fn().mockResolvedValue({
      uid: 'new-mock-firebase-uid',
      email: 'newuser@example.com',
      emailVerified: false,
      disabled: false,
    }),
    
    updateUser: jest.fn().mockResolvedValue({
      uid: 'mock-firebase-uid',
      email: 'updated@example.com',
      emailVerified: true,
      disabled: false,
    }),
    
    deleteUser: jest.fn().mockResolvedValue(undefined),
    
    setCustomUserClaims: jest.fn().mockResolvedValue(undefined),
  }),
  
  firestore: jest.fn().mockReturnValue({
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ mockData: true }),
        }),
        set: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      }),
      add: jest.fn().mockResolvedValue({
        id: 'mock-doc-id',
      }),
      get: jest.fn().mockResolvedValue({
        docs: [
          {
            id: 'doc1',
            data: () => ({ mockData: true }),
          },
        ],
      }),
    }),
  }),
  
  storage: jest.fn().mockReturnValue({
    bucket: jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue({
        save: jest.fn().mockResolvedValue(undefined),
        download: jest.fn().mockResolvedValue([Buffer.from('mock file content')]),
        delete: jest.fn().mockResolvedValue(undefined),
        getSignedUrl: jest.fn().mockResolvedValue(['https://mock-signed-url.com']),
      }),
    }),
  }),
  
  messaging: jest.fn().mockReturnValue({
    send: jest.fn().mockResolvedValue('mock-message-id'),
    sendMulticast: jest.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true, messageId: 'mock-message-id' }],
    }),
  }),
  
  credential: {
    cert: jest.fn().mockReturnValue({}),
    applicationDefault: jest.fn().mockReturnValue({}),
  },
  
  app: jest.fn().mockReturnValue({
    name: 'mock-app',
    options: {},
  }),
};

// Mock Redis
export const mockRedis = {
  Redis: jest.fn().mockImplementation((options) => ({
    options,
    status: 'ready',
    
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(-1),
    keys: jest.fn().mockResolvedValue([]),
    flushall: jest.fn().mockResolvedValue('OK'),
    
    // Hash operations
    hget: jest.fn().mockResolvedValue(null),
    hset: jest.fn().mockResolvedValue(1),
    hdel: jest.fn().mockResolvedValue(1),
    hgetall: jest.fn().mockResolvedValue({}),
    
    // List operations
    lpush: jest.fn().mockResolvedValue(1),
    rpush: jest.fn().mockResolvedValue(1),
    lpop: jest.fn().mockResolvedValue(null),
    rpop: jest.fn().mockResolvedValue(null),
    llen: jest.fn().mockResolvedValue(0),
    
    // Set operations
    sadd: jest.fn().mockResolvedValue(1),
    srem: jest.fn().mockResolvedValue(1),
    smembers: jest.fn().mockResolvedValue([]),
    sismember: jest.fn().mockResolvedValue(0),
    
    // Connection
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    
    // Events
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    
    // Pub/Sub
    publish: jest.fn().mockResolvedValue(0),
    subscribe: jest.fn().mockResolvedValue(undefined),
    unsubscribe: jest.fn().mockResolvedValue(undefined),
  })),
};

// Export all mocks
export const googleApiMocks = {
  googleapis: {
    google: {
      auth: mockGoogleAuth,
    },
  },
  'google-ads-api': mockGoogleAdsApi,
  'firebase-admin': mockFirebaseAdmin,
  ioredis: mockRedis,
};