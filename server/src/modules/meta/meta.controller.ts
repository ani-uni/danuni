import { platform as PF } from '@dan-uni/dan-any'
import {
  BadRequestException,
  Body,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'

import { ApiController } from '~/common/decorators/api-controller.decorator'
import { Authn } from '~/common/decorators/authn.decorator'
// import { Auth } from '~/common/decorators/auth.decorator'
import { HttpCache } from '~/common/decorators/cache.decorator'
// import { CurrentCtx, Level } from '~/common/decorators/level.decorator'
import { AuthnGuard } from '~/common/guards/authn.guard'
import { Roles, Scopes } from '~/constants/authn.constant'
import { checkID } from '~/utils/id-prefix.util'

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
import { MetaDto, MetaSourceDto, MetaTransferDto } from './meta.dto'
// import { MetaDocument } from './meta.model'
import { MetaService } from './meta.service'
import { MetaSourceService } from './source.service'

@ApiController(['meta'])
@UseGuards(AuthnGuard)
export class MetaController {
  constructor(
    private readonly metaService: MetaService,
    private readonly metaAdvService: MetaAdvService,
    private readonly metaSourceService: MetaSourceService,
    // private readonly authService: AuthService,
    // private readonly configService: ConfigsService,

    // @Inject(forwardRef(() => AuthnService))
    // private readonly authnService: AuthnService,
  ) {}

  @Get('/:ID')
  @Authn({ role: [Roles.guest] })
  async getEp(
    @Param('ID') ID: string,
    // @Query('hash') hash?: string,
  ) {
    const Id = checkID(ID, ['ep', 'so'])
    if (Id.type === 'ep') return await this.metaService.getEp(Id.id, true)
    else if (Id.type === 'so') return await this.metaSourceService.getSo(Id.id)
    else throw new BadRequestException('ID格式错误') // 此行由于checkID不会异常
  }
  @Get(['/:type/external-id/:platform', '/external-id/:platform'])
  @Authn({ role: [Roles.guest] })
  async findEpByExternalID(
    @Param('platform') platform: PF.PlatformSource,
    @Query('id') id: string,
    @Param('type') type?: 'ep' | 'so',
  ) {
    if (platform in PF.PlatformDanmakuSources) {
      const so = await this.metaSourceService.findSo(
        id,
        platform as PF.PlatformDanmakuSource,
      )
      if (!type || type === 'so') return so
      else if (type === 'ep') {
        if (so.exact) return this.metaService.getEp(so.exact.EPID)
        else throw new NotFoundException('未找到该剧集')
      }
    } else if (platform in PF.PlatformInfoSources) {
      const ep = await this.metaService.findEp(
        id,
        platform as PF.PlatformInfoSource,
      )
      return ep
    }
  }
  @Get(['/:type/hash/:hash', '/hash/:hash'])
  @Authn({ role: [Roles.guest] })
  async findEpByHash(
    @Param('hash') hash?: string,
    @Param('type') type?: 'ep' | 'so',
    @Query('hash') hash2?: string,
  ) {
    hash = hash ?? hash2
    if (!hash) throw new BadRequestException('Hash?')
    const so = await this.metaSourceService.findSo(hash, 'hash')
    if (!type || type === 'so') return so
    else if (type === 'ep') {
      if (so.exact) return this.metaService.getEp(so.exact.EPID)
      else throw new NotFoundException('未找到该剧集')
    }
  }
  // @Get(['/up/me', '/up/:creator'])
  // // @Level(Levels.GuestOrBan)
  // @Authn({ role: [Roles.user, Roles.bot] })
  // async getMetasByCreator(
  //   @Param('creator') creator: string,
  //   // @CurrentCtx() ctx: FastifyBizRequest,
  //   @CurrentAuthnModel() authn: AuthnModel,
  // ) {
  //   return this.metaService.listMetasByCreator(creator || 'me', authn)
  // }

  @Post('/ep')
  @HttpCache({ disable: true })
  @Authn({ role: [Roles.user, Roles.bot], scope: [Scopes.metaCreate] })
  async createEp(@Body() metaDto: MetaDto) {
    return this.metaService.createEp(metaDto)
    // 已启用了dto whitelist，无需手动删除多余字段
    // return this.metaService.createEp({
    //   ...metaDto,
    //   EPID: undefined,
    //   maintainer: undefined,
    //   pgc: undefined,
    // })
  }
  @Post('/ep/:EPID/transfer')
  @HttpCache({ disable: true })
  @Authn({
    role: [Roles.user, Roles.bot],
    scope: [Scopes.metaEdit],
  })
  async transferEp(
    @Param('EPID') EPID: string,
    @Body() metaTransferDto: MetaTransferDto,
  ) {
    return this.metaService.transferEp(EPID, metaTransferDto.sid)
  }
  @Patch('/ep/:EPID')
  @HttpCache({ disable: true })
  @Authn({
    role: [Roles.user, Roles.bot],
    scope: [Scopes.metaEdit],
    pass: { scope: [Scopes.metaEditPgc] }, // 该scope与pass配合canEditEp
  })
  async editEp(@Param('EPID') EPID: string, @Body() metaDto: MetaDto) {
    return this.metaService.editEp({ ...metaDto, EPID })
  }
  @Delete('/ep/:EPID')
  @HttpCache({ disable: true })
  @Authn({ role: [Roles.user, Roles.bot], scope: [Scopes.metaDel] })
  async delEp(@Param('EPID') EPID: string) {
    return this.metaService.delEp(EPID)
  }

  @Post('/so')
  @HttpCache({ disable: true })
  @Authn({
    role: [Roles.user, Roles.bot],
    scope: [Scopes.metaEdit],
    pass: { scope: [Scopes.metaEditPgc] },
  })
  async createSo(@Body() metaSourceDto: MetaSourceDto) {
    return this.metaSourceService.createSo(metaSourceDto)
    // return this.metaSourceService.createSo({
    //   ...metaSourceDto,
    //   SOID: undefined,
    // })
  }
  @Patch('/so/:SOID')
  @HttpCache({ disable: true })
  @Authn({
    role: [Roles.user, Roles.bot],
    scope: [Scopes.metaEdit],
    pass: { scope: [Scopes.metaEditPgc] },
  })
  async editSo(
    @Param('SOID') SOID: string,
    @Body() metaSourceDto: MetaSourceDto,
  ) {
    return this.metaSourceService.editSo({ ...metaSourceDto, SOID })
  }
  @Delete('/so/:SOID')
  @HttpCache({ disable: true })
  @Authn({
    role: [Roles.user, Roles.bot],
    scope: [Scopes.metaEdit],
    pass: { scope: [Scopes.metaEditPgc] },
  })
  async delSo(@Param('SOID') SOID: string) {
    return this.metaSourceService.delSo(SOID)
  }

  // @Post('/')
  // @HttpCache({ disable: true })
  // // @Level(Levels.Min) // 根据config判断决定等级要求，此处仅运行中间层获取必要ctx
  // @Authn({ role: [Roles.user, Roles.bot], scope: [Scopes.metaCreate] })
  // async createMetaRandom(
  //   @Body() metaDto: MetaDto,
  //   // @CurrentCtx() ctx: FastifyBizRequest,
  //   @CurrentAuthnModel() authn: AuthnModel,
  // ) {
  //   return this.metaService.createMeta(
  //     authn,
  //     {
  //       ...metaDto,
  //       hashes: metaDto.hashes?.map((hash) => ({ ...hash, exact: true })),
  //     },
  //     // ctx.uid,
  //   )
  // }
  // // @Post('/FCID')
  // // @HttpCache({ disable: true })
  // // //auth admin
  // // async createMeta(@Body() metaDto: MetaDto) {
  // //   return this.metaService.createMeta(metaDto.FCID, metaDto)
  // // }
  // @Post('/:FCID/hash/:hash/vote')
  // @HttpCache({ disable: true })
  // // @Level(Levels.Default)
  // @Authn({
  //   role: [Roles.user],
  //   scope: [Scopes.metaHashVote],
  //   pass: { scope: [Scopes.metaHashNew] },
  // })
  // async voteHash(
  //   @Param('FCID') FCID: string,
  //   @Param('hash') hash: string,
  //   @CurrentAuthnModel() authn: AuthnModel,
  // ) {
  //   if (!hash) throw new BadRequestException('hash不能为空') // 此处type hash必有值，但js不会校验是否有值
  //   const meta = await this.metaService.getMeta(FCID)
  //   if (meta) return this.metaService.voteHash(meta, hash, authn)
  //   else throw new BadRequestException('未找到该弹幕库')
  // }

  // @Delete('/:FCID')
  // @HttpCache({ disable: true })
  // // @Level(Levels.GuestOrBan)
  // @Authn({ role: [Roles.user, Roles.bot], pass: { scope: [Scopes.metaDel] } })
  // async delMeta(
  //   @Param('FCID') FCID: string,
  //   // @CurrentCtx() ctx: FastifyBizRequest,
  //   @CurrentAuthnModel() authn: AuthnModel,
  // ) {
  //   return this.metaAdvService.delMeta(FCID, authn)
  // }

  // @Patch('/:FCID')
  // @HttpCache({ disable: true })
  // // @Level(Levels.GuestOrBan)
  // @Authn({
  //   role: [Roles.user, Roles.bot],
  //   pass: { scope: [Scopes.metaModify] },
  // })
  // async updateMeta(
  //   @Param('FCID') FCID: string,
  //   @Body() metaDto: MetaDto,
  //   // @CurrentCtx() ctx: FastifyBizRequest,
  //   @CurrentAuthnModel() authn: AuthnModel,
  // ) {
  //   return this.metaService.patchMeta(FCID, metaDto, authn)
  // }

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
