import type { NestMiddleware, OnModuleInit } from '@nestjs/common'
import type { BetterAuthOptions } from 'better-auth'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Oauth2Providers } from './auth.constant'

import { Inject } from '@nestjs/common'

import { EventBusEvents } from '~/constants/event-bus.constant'
import { SubPubBridgeService } from '~/processors/redis/subpub.service'

import { ConfigsService } from '../configs/configs.service'
import { AuthInstanceInjectKey, Oauth2Provider } from './auth.constant'
import { CreateAuth } from './auth.implement'
import { InjectAuthInstance } from './auth.interface'

declare module 'http' {
  interface IncomingMessage {
    originalUrl: string
  }
}

export class AuthMiddleware implements NestMiddleware, OnModuleInit {
  private authHandler: Awaited<ReturnType<typeof CreateAuth>>['handler']

  constructor(
    private readonly redisSub: SubPubBridgeService,
    private readonly configService: ConfigsService,
    @Inject(AuthInstanceInjectKey)
    private readonly authInstance: InjectAuthInstance,
  ) {}

  async onModuleInit() {
    // const handler = async () => {
    //   const oauth = await this.configService.get('oauth')

    //   // const providers = {} as NonNullable<BetterAuthOptions['socialProviders']>
    //   const providers = {} as NonNullable<{
    //     bgm: { clientId: string; clientSecret: string }
    //   }>
    //   oauth.providers.forEach((provider) => {
    //     if (!provider.enabled) return
    //     const type = provider.type as string

    //     const mergedConfig = {
    //       ...oauth.public[type],
    //       ...oauth.secrets[type],
    //     }
    //     switch (type) {
    //       case 'bgm': {
    //         if (!mergedConfig.clientId || !mergedConfig.clientSecret) return

    //         providers.bgm = {
    //           clientId: mergedConfig.clientId,
    //           clientSecret: mergedConfig.clientSecret,
    //         }
    //         break
    //       }
    //       // case 'github': {
    //       //   if (!mergedConfig.clientId || !mergedConfig.clientSecret) return

    //       //   providers.github = {
    //       //     clientId: mergedConfig.clientId,
    //       //     clientSecret: mergedConfig.clientSecret,
    //       //   }
    //       //   break
    //       // }

    //       // case 'google': {
    //       //   if (!mergedConfig.clientId || !mergedConfig.clientSecret) return

    //       //   providers.google = {
    //       //     clientId: mergedConfig.clientId,
    //       //     clientSecret: mergedConfig.clientSecret,
    //       //   }

    //       //   break
    //       // }
    //     }
    //   })
    //   const { handler, auth } = await CreateAuth(
    //     {} as BetterAuthOptions['socialProviders'],
    //     providers,
    //   )
    //   this.authHandler = handler

    //   this.authInstance.set(auth)
    // }
    const handler = async () => {
      const oauth = await this.configService.get('oauth2')
      const providers = {} as NonNullable<Oauth2Providers>
      oauth.units.forEach((unit) => {
        if (!unit.enabled) return
        const provider = unit.provider
        switch (provider) {
          case Oauth2Provider.Bangumi: {
            if (!unit.clientId || !unit.clientSecret) return
            providers[provider] = {
              ...unit,
              providerId: provider,
            }
            break
          }
        }
      })
      const { handler, auth } = await CreateAuth(
        {} as BetterAuthOptions['socialProviders'],
        providers,
      )
      this.authHandler = handler

      this.authInstance.set(auth)
    }
    this.redisSub.subscribe(EventBusEvents.OauthChanged, handler)
    this.redisSub.subscribe(EventBusEvents.AppUrlChanged, handler)

    await handler()
  }

  async use(req: IncomingMessage, res: ServerResponse, next: () => void) {
    if (!this.authHandler) {
      next()
      return
    }

    const bypassPath = ['/token', '/session', '/providers']

    if (bypassPath.some((path) => req.originalUrl.includes(path))) {
      next()
      return
    }
    if (req.method !== 'GET' && req.method !== 'POST') {
      next()
      return
    }

    return await this.authHandler(req, res)
  }
}
