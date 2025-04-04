export const AUTH_JS_USER_COLLECTION = 'users'
export const AUTH_JS_ACCOUNT_COLLECTION = 'accounts'
export const AUTH_JS_SESSION_COLLECTION = 'sessions'

export const AuthInstanceInjectKey = Symbol('AuthInstance')

export enum Oauth2Provider {
  Bangumi = 'bgm',
}
export const Oauth2Url = {
  [Oauth2Provider.Bangumi]: {
    authorizationUrl: 'https://bgm.tv/oauth/authorize',
    tokenUrl: 'https://bgm.tv/oauth/access_token',
  },
}
interface Oauth2ProviderUnit {
  providerId: string
  clientId: string
  clientSecret: string
  authorizationUrl?: string
  tokenUrl?: string
}
export type Oauth2Providers = {
  [key in Oauth2Provider]: Oauth2ProviderUnit
}

export const SidOrder = [Oauth2Provider.Bangumi, 'email']
