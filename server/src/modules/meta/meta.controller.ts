import { platfrom } from '@dan-uni/dan-any'
import {
  BadRequestException,
  Body,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'

import { ApiController } from '~/common/decorators/api-controller.decorator'
import { Authn, CurrentAuthnModel } from '~/common/decorators/authn.decorator'
// import { Auth } from '~/common/decorators/auth.decorator'
import { HttpCache } from '~/common/decorators/cache.decorator'
// import { CurrentCtx, Level } from '~/common/decorators/level.decorator'
import { AuthnGuard } from '~/common/guards/authn.guard'
import { AuthnModel, Roles, Scopes } from '~/constants/authn.constant'

// import { LevelGuard } from '~/common/guards/level.guard'
// import { FastifyBizRequest } from '~/transformers/get-req.transformer'

// import { Levels } from '../user/user.model'
import { MetaAdvService } from './meta.adv.service'
// import {
//   CurrentUser,
//   CurrentUserToken,
// } from '~/common/decorators/current-user.decorator'
// import { BanInDemo } from '~/common/decorators/demo.decorator'
// import { HTTPDecorators } from '~/common/decorators/http.decorator'
// import { IpLocation, IpRecord } from '~/common/decorators/ip.decorator'

// import { IsAuthenticated } from '~/common/decorators/role.decorator'
// import { getAvatar } from '~/utils/tool.util'

// import { AuthService } from '../auth/auth.service'
// import { AuthnService } from '../authn/authn.service'
// import { ConfigsService } from '../configs/configs.service'
import { MetaDto } from './meta.dto'
// import { MetaDocument } from './meta.model'
import { MetaService } from './meta.service'

@ApiController(['meta'])
@UseGuards(AuthnGuard)
export class MetaController {
  constructor(
    private readonly metaService: MetaService,
    private readonly metaAdvService: MetaAdvService,
    // private readonly authService: AuthService,
    // private readonly configService: ConfigsService,

    // @Inject(forwardRef(() => AuthnService))
    // private readonly authnService: AuthnService,
  ) {}

  @Get('/:FCID')
  @Authn({ role: [Roles.guest] })
  async getMetaByFCID(
    @Param('FCID') FCID: string,
    // @Query('hash') hash?: string,
  ) {
    const meta = await this.metaService.getMetaByID(FCID)
    //TODO 由config读取是否无则创建新meta，或指定domain下自动创建, eg. xxx@bgm.tv
    // if (meta && hash) meta = await this.metaService.voteHash(meta, hash)
    return meta
  }
  @Get('/hash/:hash')
  @Authn({ role: [Roles.guest] })
  async getMetaByHash(@Param('hash') hash: string) {
    return this.metaService.listMetaByHash(hash)
  }
  @Get('/3rd/:platform/:id')
  @Authn({
    role: [Roles.guest],
    pass: {
      role: [Roles.user, Roles.bot],
      scope: [Scopes.metaRefreshOrFetchFromRemoteOrigin],
    },
  })
  async getMetaBy3rdID(
    @Param('platform') platform: platfrom,
    @Param('id') id: string,
    @Query('refresh') refresh: boolean = false,
    @CurrentAuthnModel() authn: AuthnModel,
  ) {
    return this.metaService.getMetaBy3rdID(
      platform,
      id,
      refresh ? authn : undefined,
    )
  }
  @Get(['/up/me', '/up/:creator'])
  // @Level(Levels.GuestOrBan)
  @Authn({ role: [Roles.user, Roles.bot] })
  async getMetasByCreator(
    @Param('creator') creator: string,
    // @CurrentCtx() ctx: FastifyBizRequest,
    @CurrentAuthnModel() authn: AuthnModel,
  ) {
    return this.metaService.listMetasByCreator(creator || 'me', authn)
  }

  @Post('/')
  @HttpCache({ disable: true })
  // @Level(Levels.Min) // 根据config判断决定等级要求，此处仅运行中间层获取必要ctx
  @Authn({ role: [Roles.user, Roles.bot], scope: [Scopes.metaCreate] })
  async createMetaRandom(
    @Body() metaDto: MetaDto,
    // @CurrentCtx() ctx: FastifyBizRequest,
    @CurrentAuthnModel() authn: AuthnModel,
  ) {
    return this.metaService.createMeta(
      authn,
      {
        ...metaDto,
        hashes: metaDto.hashes?.map((hash) => ({ ...hash, exact: true })),
      },
      // ctx.uid,
    )
  }
  // @Post('/FCID')
  // @HttpCache({ disable: true })
  // //auth admin
  // async createMeta(@Body() metaDto: MetaDto) {
  //   return this.metaService.createMeta(metaDto.FCID, metaDto)
  // }
  @Post('/:FCID/hash/:hash/vote')
  @HttpCache({ disable: true })
  // @Level(Levels.Default)
  @Authn({
    role: [Roles.user],
    scope: [Scopes.metaHashVote],
    pass: { scope: [Scopes.metaHashNew] },
  })
  async voteHash(
    @Param('FCID') FCID: string,
    @Param('hash') hash: string,
    @CurrentAuthnModel() authn: AuthnModel,
  ) {
    if (!hash) throw new BadRequestException('hash不能为空') // 此处type hash必有值，但js不会校验是否有值
    const meta = await this.metaService.getMeta(FCID)
    if (meta) return this.metaService.voteHash(meta, hash, authn)
    else throw new BadRequestException('未找到该弹幕库')
  }

  @Delete('/:FCID')
  @HttpCache({ disable: true })
  // @Level(Levels.GuestOrBan)
  @Authn({ role: [Roles.user, Roles.bot], pass: { scope: [Scopes.metaDel] } })
  async delMeta(
    @Param('FCID') FCID: string,
    // @CurrentCtx() ctx: FastifyBizRequest,
    @CurrentAuthnModel() authn: AuthnModel,
  ) {
    return this.metaAdvService.delMeta(FCID, authn)
  }

  @Patch('/:FCID')
  @HttpCache({ disable: true })
  // @Level(Levels.GuestOrBan)
  @Authn({
    role: [Roles.user, Roles.bot],
    pass: { scope: [Scopes.metaModify] },
  })
  async updateMeta(
    @Param('FCID') FCID: string,
    @Body() metaDto: MetaDto,
    // @CurrentCtx() ctx: FastifyBizRequest,
    @CurrentAuthnModel() authn: AuthnModel,
  ) {
    return this.metaService.patchMeta(FCID, metaDto, authn)
  }

  // @Get()
  // async getMasterInfo(@IsAuthenticated() isAuthenticated: boolean) {
  //   return await this.userService.getMasterInfo(isAuthenticated)
  // }

  // @Post('/register')
  // async register(@Body() userDto: UserDto) {
  //   userDto.name = userDto.name ?? userDto.username
  //   return await this.userService.createMaster(userDto as UserModel)
  // }

  // @Put('/login')
  // @Auth()
  // async loginWithToken(
  //   @IpLocation() ipLocation: IpRecord,
  //   @CurrentUser() user: UserDocument,
  //   @CurrentUserToken() token: string,
  // ) {
  //   await this.userService.recordFootstep(ipLocation.ip)
  //   const singedToken = await this.authService.jwtServicePublic.sign(user.id, {
  //     ip: ipLocation.ip,
  //     ua: ipLocation.agent,
  //   })

  //   this.authService.jwtServicePublic.revokeToken(token, 6000)
  //   return {
  //     token: singedToken,
  //   }
  // }

  // @Get('/allow-login')
  // @HttpCache({ disable: true })
  // @HTTPDecorators.Bypass
  // async allowLogin() {
  //   const [allowPasswordLogin, canAuthByPasskey, oauthProviders] =
  //     await Promise.all([
  //       this.configService
  //         .get('authSecurity')
  //         .then((config) => config.disablePasswordLogin === false),
  //       this.authnService.hasAuthnItem(),
  //       this.authService.getOauthProviders(),
  //     ])

  //   return {
  //     password: isDev ? true : allowPasswordLogin,
  //     passkey: canAuthByPasskey,
  //     ...oauthProviders.reduce(
  //       (acc, cur) => {
  //         acc[cur.toLowerCase()] = true
  //         return acc
  //       },
  //       {} as Record<string, boolean>,
  //     ),
  //   }
  // }

  // @Post('/login')
  // @HttpCache({ disable: true })
  // @HttpCode(200)
  // async login(@Body() dto: LoginDto, @IpLocation() ipLocation: IpRecord) {
  //   const allowPasswordLogin =
  //     (await this.configService.get('authSecurity')).disablePasswordLogin ===
  //     false

  //   if (!allowPasswordLogin && !isDev)
  //     throw new BadRequestException('密码登录已禁用')

  //   const user = await this.userService.login(dto.username, dto.password)
  //   const footstep = await this.userService.recordFootstep(ipLocation.ip)
  //   const { name, username, created, url, mail, id } = user
  //   const avatar = user.avatar ?? getAvatar(mail)

  //   return {
  //     token: await this.authService.jwtServicePublic.sign(user.id, {
  //       ip: ipLocation.ip,
  //       ua: ipLocation.agent,
  //     }),
  //     ...footstep,
  //     name,
  //     username,
  //     created,
  //     url,
  //     mail,
  //     avatar,
  //     id,
  //   }
  // }

  // @Get('check_logged')
  // @HttpCache.disable
  // checkLogged(@IsAuthenticated() isAuthenticated: boolean) {
  //   return { ok: +isAuthenticated, isGuest: !isAuthenticated }
  // }

  // @Patch()
  // @Auth()
  // @HttpCache.disable
  // @BanInDemo
  // async patchMasterData(
  //   @Body() body: UserPatchDto,
  //   @CurrentUser() user: UserDocument,
  // ) {
  //   return await this.userService.patchUserData(user, body)
  // }

  // @Post('/logout')
  // @Auth()
  // singout(@CurrentUserToken() token: string) {
  //   return this.userService.signout(token)
  // }

  // @Get('/session')
  // @Auth()
  // getAllSession(@CurrentUserToken() token: string) {
  //   return this.authService.jwtServicePublic.getAllSignSession(token)
  // }

  // @Delete('/session/:tokenId')
  // @Auth()
  // deleteSession(@Param('tokenId') tokenId: string) {
  //   return this.authService.jwtServicePublic.revokeToken(tokenId)
  // }

  // @Delete('/session/all')
  // @Auth()
  // deleteAllSession(@CurrentUserToken() currentToken: string) {
  //   return this.authService.jwtServicePublic.revokeAll([currentToken])
  // }
}
