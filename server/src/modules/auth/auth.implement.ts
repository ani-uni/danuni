import { IncomingMessage } from 'node:http'
// import {
//   APIError,
//   betterAuth,
//   mongodbAdapter,
//   toNodeHandler,
// } from '@mx-space/complied/auth'
import { betterAuth } from 'better-auth'
import { mongodbAdapter } from 'better-auth/adapters/mongodb'
import {
  APIError,
  // createAuthMiddleware,
  // getSessionFromCtx,
} from 'better-auth/api'
import { toNodeHandler } from 'better-auth/node'
// import { fromNodeHeaders, toNodeHandler } from 'better-auth/node'
import {
  admin,
  apiKey,
  // bearer,
  genericOAuth,
  openAPI,
} from 'better-auth/plugins'
import { MongoClient } from 'mongodb'
import type { BetterAuthOptions } from 'better-auth'
import type { ServerResponse } from 'node:http'
import type { Oauth2Providers } from './auth.constant'

import { API_VERSION, CROSS_DOMAIN, MONGO_DB, SECURITY } from '~/app.config'

// import { SECURITY } from '~/app.config.test'

import {
  AUTH_JS_ACCOUNT_COLLECTION,
  AUTH_JS_SESSION_COLLECTION,
  AUTH_JS_USER_COLLECTION,
  Oauth2Provider,
  Oauth2Url,
} from './auth.constant'

const client = new MongoClient(MONGO_DB.customConnectionString || MONGO_DB.uri)

const db = client.db()

// @version better-auth 1.2.4
/**
 * Configuration interface for generic OAuth providers.
 */
interface GenericOAuthConfig {
  /** Unique identifier for the OAuth provider */
  providerId: string
  /**
   * URL to fetch OAuth 2.0 configuration.
   * If provided, the authorization and token endpoints will be fetched from this URL.
   */
  discoveryUrl?: string
  /**
   * URL for the authorization endpoint.
   * Optional if using discoveryUrl.
   */
  authorizationUrl?: string
  /**
   * URL for the token endpoint.
   * Optional if using discoveryUrl.
   */
  tokenUrl?: string
  /**
   * URL for the user info endpoint.
   * Optional if using discoveryUrl.
   */
  userInfoUrl?: string
  /** OAuth client ID */
  clientId: string
  /** OAuth client secret */
  clientSecret: string
  /**
   * Array of OAuth scopes to request.
   * @default []
   */
  scopes?: string[]
  /**
   * Custom redirect URI.
   * If not provided, a default URI will be constructed.
   */
  redirectURI?: string
  /**
   * OAuth response type.
   * @default "code"
   */
  responseType?: string
  /**
   * Prompt parameter for the authorization request.
   * Controls the authentication experience for the user.
   */
  prompt?: 'none' | 'login' | 'consent' | 'select_account'
  /**
   * Whether to use PKCE (Proof Key for Code Exchange)
   * @default false
   */
  pkce?: boolean
  /**
   * Access type for the authorization request.
   * Use "offline" to request a refresh token.
   */
  accessType?: string
  /**
   * Custom function to fetch user info.
   * If provided, this function will be used instead of the default user info fetching logic.
   * @param tokens - The OAuth tokens received after successful authentication
   * @returns A promise that resolves to a User object or null
   */
  getUserInfo?: (tokens: any) => Promise<any | null>
  /**
   * Custom function to map the user profile to a User object.
   */
  mapProfileToUser?: (profile: Record<string, any>) =>
    | {
        id?: string
        name?: string
        email?: string
        image?: string
        emailVerified?: boolean
        [key: string]: any
      }
    | Promise<{
        id?: string
        name?: string
        email?: string
        image?: string
        emailVerified?: boolean
        [key: string]: any
      }>
  /**
   * Additional search-params to add to the authorizationUrl.
   * Warning: Search-params added here overwrite any default params.
   */
  authorizationUrlParams?: Record<string, string>
  /**
   * Disable implicit sign up for new users. When set to true for the provider,
   * sign-in need to be called with with requestSignUp as true to create new users.
   */
  disableImplicitSignUp?: boolean
  /**
   * Disable sign up for new users.
   */
  disableSignUp?: boolean
  /**
   * Allows to use basic authentication for the token endpoint.
   * Default is "post".
   */
  authentication?: 'basic' | 'post'
}

export async function CreateAuth(
  providers: BetterAuthOptions['socialProviders'],
  genericOAuthProviders: NonNullable<Oauth2Providers>,
) {
  const GOauth: GenericOAuthConfig[] = []
  Object.entries(genericOAuthProviders).forEach(([key, val]) => {
    if (key === Oauth2Provider.Bangumi) {
      GOauth.push({
        providerId: val.providerId,
        clientId: val.clientId,
        clientSecret: val.clientSecret,
        authorizationUrl: Oauth2Url[key].authorizationUrl,
        tokenUrl: Oauth2Url[key].tokenUrl,
        async getUserInfo(tokens) {
          const info = await fetch('https://api.bgm.tv/v0/me', {
            headers: {
              Authorization: `Bearer ${tokens.accessToken}`,
            },
          }).then((res) => res.json())
          return {
            id: info.id,
            email: info.email,
            name: info.nickname,
            createdAt: new Date(info.reg_time),
            updatedAt: new Date(),
            emailVerified: true,
          }
        },
      })
    }
  })
  const auth = betterAuth({
    database: mongodbAdapter(db),
    socialProviders: providers,
    basePath: isDev ? '/auth' : `/api/v${API_VERSION}/auth`,
    trustedOrigins: CROSS_DOMAIN.allowedOrigins.reduce(
      (acc: string[], origin: string) => {
        if (origin.startsWith('http')) {
          return [...acc, origin]
        }
        return [...acc, `https://${origin}`, `http://${origin}`]
      },
      [],
    ),
    account: {
      modelName: AUTH_JS_ACCOUNT_COLLECTION,
      accountLinking: {
        enabled: true,
        // trustedProviders: ['google', 'github'],
      },
    },
    session: {
      modelName: AUTH_JS_SESSION_COLLECTION,
    },
    appName: 'danuni',
    secret: SECURITY.jwtSecret,
    plugins: [
      apiKey(),
      // bearer(),
      admin(),
      openAPI(),
      genericOAuth({
        config: GOauth,
      }),
    ],
    user: {
      modelName: AUTH_JS_USER_COLLECTION,
      additionalFields: {
        isOwner: {
          type: 'boolean',
          defaultValue: false,
          input: false,
        },
        // level: {
        //   type: 'number',
        //   defaultValue: 3,
        //   input: false,
        // },
        weight: {
          type: 'number',
          defaultValue: 5,
          input: false,
        },
        scopes: {
          type: 'string[]',
          defaultValue: [],
          input: false,
        },
        sidProvider: {
          type: 'string',
          defaultValue: '',
          input: true,
        },
        handle: {
          type: 'string',
          defaultValue: '',
        },
      },
    },
  })

  const handler = async (req: IncomingMessage, res: ServerResponse) => {
    try {
      res.setHeader('access-control-allow-methods', 'GET, POST')
      res.setHeader('access-control-allow-headers', 'content-type')
      res.setHeader(
        'Access-Control-Allow-Origin',
        req.headers.origin || req.headers.referer || req.headers.host || '*',
      )
      res.setHeader('access-control-allow-credentials', 'true')
      const clonedRequest = new IncomingMessage(req.socket)
      const handler = toNodeHandler(auth)(
        Object.assign(clonedRequest, req, {
          url: req.originalUrl,
          // https://github.com/Bekacru/better-call/blob/main/src/adapter/node.ts
          connection: Object.assign(req.socket, {
            encrypted: isDev ? false : true,
          }),
        }),
        res,
      )

      return handler
    } catch (error) {
      console.error(error)
      // throw error
      res.end(error.message)
    }
  }

  return {
    handler,
    auth: {
      options: auth.options,
      api: {
        getSession(params: Parameters<typeof auth.api.getSession>[0]) {
          return auth.api.getSession(params)
        },
        getProviders() {
          return Object.keys(auth.options.socialProviders || {})
        },
        async listUserAccounts(
          params: Parameters<typeof auth.api.listUserAccounts>[0],
        ) {
          try {
            const result = await auth.api.listUserAccounts(params)
            return result
          } catch (error) {
            if (error instanceof APIError) {
              return null
            }
            throw error
          }
        },
      },
    },
  }
}
