import { IncomingMessage } from 'node:http'
import { UserWithRole } from 'better-auth/plugins'
import jose from 'jose'
import { Types } from 'mongoose'
import { nanoid } from 'nanoid'

import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common'

import { RequestContext } from '~/common/contexts/request.context'
import { Scopes } from '~/constants/authn.constant'
import { DatabaseService } from '~/processors/database/database.service'
import { isSubsetOf } from '~/utils/set.util'

import { ConfigsService } from '../configs/configs.service'
import { AUTH_JS_USER_COLLECTION, AuthInstanceInjectKey } from './auth.constant'
import { InjectAuthInstance } from './auth.interface'
import { BotAuthUnitDto } from './bot-auth.dto'

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigsService,
    @Inject(AuthInstanceInjectKey)
    private readonly authInstance: InjectAuthInstance,
  ) {}

  get authInstancePublic() {
    return this.authInstance.get()
  }

  async getSessionUser(
    req: IncomingMessage,
    // options?: { sid: { perferredProvider: Oauth2Provider } },
  ) {
    const auth = this.authInstance.get()
    if (!auth) {
      throw new InternalServerErrorException('auth not found')
    }

    const apiKeyHeader = req.headers['x-api-key'],
      authHeader = new Headers()
    if (apiKeyHeader) authHeader.set('x-api-key', apiKeyHeader)

    if (req.headers.cookie) authHeader.set('cookie', req.headers.cookie)
    if (req.headers.origin) {
      authHeader.set('origin', req.headers.origin)
    }
    if (!apiKeyHeader && !req.headers.cookie) return null

    const session = await auth.api.getSession({
      query: {
        disableCookieCache: true,
      },
      headers: authHeader,
    })

    const accounts = (await auth.api.listUserAccounts({
      headers: authHeader,
    })) || [{ id: '', provider: 'credential', accountId: '' }]

    // if (!accounts) {
    //   return null
    // }

    // const selected_provider =
    //   accounts.find(
    //     (table) => table.provider === options?.sid.perferredProvider,
    //   ) || accounts[0]
    // const providerAccountId = selected_provider.accountId
    // const provider = selected_provider.provider
    const providerAccountId = accounts[0].id
    const provider = accounts[0].provider

    return {
      ...session,
      providerAccountId,
      provider,
      accounts,
      // user: session?.user,
    }
  }

  async setCurrentOauthAsOwner() {
    const req = RequestContext.currentRequest()
    if (!req) {
      throw new BadRequestException()
    }
    const session = await this.getSessionUser(req)
    if (!session) {
      throw new BadRequestException('session not found')
    }
    const userId = session.user?.id
    if (!userId) {
      throw new BadRequestException('user id not found')
    }
    await this.databaseService.db.collection(AUTH_JS_USER_COLLECTION).updateOne(
      {
        _id: new Types.ObjectId(userId),
      },
      {
        $set: {
          role: 'admin',
          isOwner: true,
          // level: 10,
          weight: 10,
          scopes: [Scopes.all],
        },
      },
    )
    return 'OK'
  }

  // async getOauthUserAccount(providerAccountId: string) {
  //   const account = await this.databaseService.db
  //     .collection(AUTH_JS_ACCOUNT_COLLECTION)
  //     .findOne(
  //       {
  //         providerAccountId,
  //       },
  //       {
  //         projection: {
  //           providerAccountId: 1,
  //           // authjs field
  //           provider: 1,
  //           providerId: 1,
  //           type: 1,
  //           userId: 1,
  //         },
  //       },
  //     )

  //   // transformer
  //   if (account?.providerId && !account.provider) {
  //     account.provider = account.providerId
  //   }

  //   if (account?.userId) {
  //     const user = await this.databaseService.db
  //       .collection(AUTH_JS_USER_COLLECTION)
  //       .findOne(
  //         {
  //           _id: account.userId,
  //         },
  //         {
  //           projection: {
  //             email: 1,
  //             name: 1,
  //             // image: 1,
  //             isOwner: 1,
  //             handle: 1,
  //             _id: 1,
  //           },
  //         },
  //       )

  //     if (user) Object.assign(account, user)
  //   }

  //   return {
  //     ...account,
  //     id: account?.userId.toString(),
  //   }
  // }
  getOauthProviders() {
    return Object.keys(this.authInstance.get().options.socialProviders || {})
  }

  async addBotAuth(unit: BotAuthUnitDto) {
    const botAuthConf = await this.configService.get('botAuth')
    const botAuthConfUnit = botAuthConf.units.find(
      (u) => u.domain === unit.domain,
    )
    if (botAuthConfUnit) {
      if (botAuthConfUnit.publicKey !== unit.publicKey)
        throw new BadRequestException(
          'publicKey不匹配，也许是你的Bot更新了，请删除该Domain下所有Bot再试',
        )
    } else if (!unit.publicKey)
      throw new BadRequestException('缺少publicKey参数')
    else
      this.configService.patchAndValid('botAuth', {
        ...botAuthConf,
        units: [...botAuthConf.units, unit],
      })
    try {
      for (const bot of unit.bots) {
        const email = `${bot.botId}[bot]@${unit.domain}`
        const botUser = await this.authInstance.get().api.listUsers({
          query: {
            searchField: 'email',
            searchOperator: 'contains',
            searchValue: email,
            limit: 1,
          },
        })
        const newUserInfo = {
          email,
          name: email,
          // password: nanoid(),
          role: 'bot' as any,
          data: {
            scopes: bot.scopes,
            sidProvider: 'email',
          },
        }
        if (botUser.total !== 0) {
          // 无默认update api
          // await this.authInstance.get().api.updateUser({ body: newUserInfo })
          // 删除后再由 better-auth API 新建
          // await this.databaseService.db
          //   .collection(AUTH_JS_USER_COLLECTION)
          //   .deleteOne({
          //     _id: new Types.ObjectId(botUser.users[0].id),
          //   })
          await this.databaseService.db
            .collection(AUTH_JS_USER_COLLECTION)
            .updateOne(
              {
                _id: new Types.ObjectId(botUser.users[0].id),
              },
              {
                $set: {
                  email: newUserInfo.email,
                  name: newUserInfo.name,
                  role: newUserInfo.role,
                  data: newUserInfo.data,
                },
              },
            )
        }
        // else
        await this.authInstance.get().api.createUser({
          body: { ...newUserInfo, password: nanoid() },
        })
      }
    } catch (error) {
      throw new InternalServerErrorException(error)
    }
    return 'OK'
  }

  async createApiKeyByBotAuth(jws: string) {
    interface BotPayload {
      aud: string
      exp: string
      nbf: string
      iss: string // domain
      sub: string // botId
      scopes: string[]
    }

    const errMesMain = `BotAuth Failed`

    let payload: BotPayload
    try {
      payload = jose.decodeJwt(jws)
    } catch {
      throw new BadRequestException(`${errMesMain} (Not a jws)`)
    }

    const base = await this.configService.get('base')
    if (payload.aud !== base.domain)
      throw new BadRequestException(`${errMesMain} (aud Not Match)`)

    const botAuth = await this.configService.get('botAuth')

    const unit = botAuth.units.find((unit) => unit.domain === payload.iss)
    if (!unit) throw new BadRequestException(`${errMesMain} (domain Not Found)`)

    const pub = await jose
      .importJWK(JSON.parse(unit.publicKey))
      .catch(() => null)
    if (!pub)
      throw new InternalServerErrorException(
        `${errMesMain} (Not a Valid PublicKey)`,
      )
    const result = await jose
      .jwtVerify(jws, pub, {
        issuer: unit.domain,
        audience: base.domain,
      })
      .catch(() => null)
    if (!result) throw new BadRequestException(`${errMesMain} (sign Not Match)`)
    else {
      const email = `${payload.sub}[bot]@${payload.iss}`
      const botUser = await this.authInstance
        .get()
        .api.listUsers({
          query: {
            searchField: 'email',
            searchOperator: 'contains',
            searchValue: email,
            limit: 1,
          },
        })
        .then((botUsers) => {
          if (botUsers.total === 0)
            throw new InternalServerErrorException(
              `${errMesMain} (Bot('${email}') Not Found, Please Contact admin to Recreate it!)`,
            )
          return botUsers.users[0]
        })
        .then((botU: UserWithRole & { scopes: string[] }) => {
          if (!isSubsetOf(new Set(payload.scopes), new Set(botU.scopes)))
            throw new BadRequestException(
              `${errMesMain} (Bot('${email}') version is too low, Please Contact admin to Update it!)`,
            )
          return botU
        })
      const apiKey = await this.authInstance
        .get()
        .api.createApiKey({
          body: {
            userId: botUser.id,
            // metadata: { domain: unit.domain, botId: bot.botId },
            // permissions: { danuni: bot.scopes },
            expiresIn: 60 * 60 * 24, // 1 day
            rateLimitTimeWindow: 1000 * 60 * 60, // 1h
            rateLimitMax: 100, // every hour, they can use up to 100 requests
            rateLimitEnabled: true,
          },
        })
        .catch((error: string) => {
          throw new InternalServerErrorException(error)
        })
      return apiKey
    }
  }
}
