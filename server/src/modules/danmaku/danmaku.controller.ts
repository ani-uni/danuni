import { DM_format } from '@dan-uni/dan-any'
import {
  BadRequestException,
  Body,
  Delete,
  Get,
  Param,
  Post,
  Query,
  // UnauthorizedException,
  UseGuards,
} from '@nestjs/common'

import { ApiController } from '~/common/decorators/api-controller.decorator'
import { Authn } from '~/common/decorators/authn.decorator'
// import { Auth } from '~/common/decorators/auth.decorator'
import { HttpCache } from '~/common/decorators/cache.decorator'
// import { HTTPDecorators } from '~/common/decorators/http.decorator'
// import { CurrentCtx, Level } from '~/common/decorators/level.decorator'
import { AuthnGuard } from '~/common/guards/authn.guard'
import { Roles, Scopes } from '~/constants/authn.constant'

// import { LevelGuard } from '~/common/guards/level.guard'
// import { FastifyBizRequest } from '~/transformers/get-req.transformer'

// import { Levels } from '../user/user.model'
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
import {
  DanmakuAdvDto,
  DanmakuMarkChapterDto,
  DanmakuStdDto,
} from './danmaku.dto'
// import { MetaDocument } from './meta.model'
import { DanmakuSendService } from './danmaku.send.service'
import { DanmakuService } from './danmaku.service'

// import {
//   DanmakuEventDto,
//   DanmakuEventFinishDto,
//   DanmakuEventVoteDto,
// } from './event.dto'
// import { DanmakuEventService } from './event.service'

@ApiController(['danmaku'])
@UseGuards(AuthnGuard)
export class DanmakuController {
  constructor(
    private readonly danmakuService: DanmakuService,
    private readonly danmakuSendService: DanmakuSendService,
    // private readonly danmakuEventService: DanmakuEventService,
    // private readonly authService: AuthService,
    // private readonly configService: ConfigsService,

    // @Inject(forwardRef(() => AuthnService))
    // private readonly authnService: AuthnService,
  ) {}

  @Get(['/:ID', '/:ID/:fmt'])
  @Authn({ role: [Roles.guest] })
  async listDan(
    @Param('ID') ID: string,
    @Param('fmt') fmt: DM_format,
    @Query('seg') seg?: number,
  ) {
    const pool = await this.danmakuService.listDan({ ID, seg })
    if (!fmt) return pool.dans
    else {
      try {
        return pool.convert2(fmt)
      } catch (error: unknown) {
        throw new BadRequestException(error)
      }
    }
  }

  // @Get(['/:FCID', '/:FCID/seg/:seg'])
  // // @Level(Levels.GuestOrBan)
  // @Authn({ role: [Roles.guest] })
  // async listDanByFCID(
  //   @Param('FCID') FCID: string,
  //   @Param('seg') seg?: number,
  //   @Query('SPMO') SPMO?: string,
  // ) {
  //   return (await this.danmakuEService.listDanByFCID({ FCID, seg, SPMO })).dans
  // }
  // @Get(['/:FCID/:fmt', '/:FCID/seg/:seg/:fmt'])
  // // @Level(Levels.GuestOrBan)
  // @Authn({ role: [Roles.guest] })
  // @HTTPDecorators.Bypass
  // async listDanByFCIDwithFmt(
  //   @Param('FCID') FCID: string,
  //   @Param('fmt') fmt: DM_format,
  //   @Param('seg') seg?: number,
  //   @Query('SPMO') SPMO?: string,
  // ) {
  //   const pool = await this.danmakuEService.listDanByFCID({ FCID, seg, SPMO }),
  //     res = pool.convert2(fmt)
  //   if (typeof res === 'string') {
  //     if (res.startsWith('(err)')) throw new BadRequestException(res)
  //     else return res // common.ass
  //   } else return res
  // }
  // // @Get('/mine')
  // // // @Level(Levels.GuestOrBan)
  // // @Authn({ role: [Roles.user] })
  // // async listMyDan(@CurrentAuthnModel() authn: AuthnModel) {
  // //   if (!authn.uid) throw new UnauthorizedException('未登录')
  // //   return await this.danmakuEService.listDanBySender(authn.uid)
  // // }
  // @Get(['/mine', '/:FCID/mine'])
  // // @Level(Levels.GuestOrBan)
  // @Authn({ role: [Roles.user, Roles.bot] })
  // async listMyDanInFCID(
  //   @CurrentAuthnModel() authn: AuthnModel,
  //   @Param('FCID') FCID?: string,
  //   // @CurrentCtx() ctx: FastifyBizRequest,
  // ) {
  //   // if (!authn.uid) throw new UnauthorizedException('未登录')
  //   return await this.danmakuEService.listDanBySender(authn.sid, FCID)
  // }
  // @Get('/:FCID/:uid')
  // async listSbDanInFCID(
  //   @Param('FCID') FCID: string,
  //   @Param('uid') uid: string,
  //   @CurrentCtx() ctx: FastifyBizRequest,
  // ) {
  //   if (!ctx.uid) throw new UnauthorizedException('未登录')
  //   return await this.danmakuService.listDanBySender(uid, FCID)
  // }
  // TODO 做一下creator和管理员可用的通过sender查弹幕，记得验证uid权限

  @Post('/:ID')
  @HttpCache({ disable: true })
  @Authn({ role: [Roles.user, Roles.bot], scope: [Scopes.danmakuSend] })
  async sendDanStd(@Param('ID') ID: string, @Body() danmakuDto: DanmakuStdDto) {
    return await this.danmakuSendService.sendDanStd(ID, danmakuDto)
  }

  @Post('/:ID/adv')
  @HttpCache({ disable: true })
  @Authn({ role: [Roles.user, Roles.bot], scope: [Scopes.danmakuSendAdv] })
  async sendDanAdv(@Param('ID') ID: string, @Body() danmakuDto: DanmakuAdvDto) {
    return await this.danmakuSendService.sendDanStd(ID, danmakuDto, true)
  }

  @Post('/:ID/sub')
  @HttpCache({ disable: true })
  @Authn({ role: [Roles.user, Roles.bot], scope: [Scopes.danmakuSendSub] })
  async sendDanSub(@Param('ID') ID: string, @Body() danmakuDto: DanmakuStdDto) {
    return await this.danmakuSendService.sendDanSub(ID, danmakuDto)
  }

  @Post('/:ID/chpt')
  @HttpCache({ disable: true })
  @Authn({ role: [Roles.user, Roles.bot], scope: [Scopes.danmakuSendChapter] })
  async sendDanMarkChapter(
    @Param('ID') ID: string,
    @Body() danmakuDto: DanmakuMarkChapterDto,
  ) {
    return await this.danmakuSendService.sendDanMarkChapter(ID, danmakuDto)
  }

  // @Post('/:FCID')
  // @HttpCache({ disable: true })
  // // @Level(Levels.Default) //TODO 所有controller 的 level guard 用configservice里的设置值
  // @Authn({ role: [Roles.user, Roles.bot], scope: [Scopes.danmakuSend] })
  // async sendDanStd(
  //   @Param('FCID') FCID: string,
  //   @Body() danmakuDto: DanmakuStdDto,
  //   // @CurrentCtx() ctx: FastifyBizRequest,
  //   @CurrentAuthnModel() authn: AuthnModel,
  // ) {
  //   return await this.danmakuService.sendDanStd(FCID, danmakuDto, authn)
  // }
  // @Post('/:FCID/adv')
  // @HttpCache({ disable: true })
  // // @Level(Levels.High7) //TODO 所有controller 的 level guard 用configservice里的设置值
  // @Authn({
  //   role: [Roles.user, Roles.bot],
  //   scope: [Scopes.danmakuSendAdv],
  //   pass: {
  //     scope: [Scopes.danmakuSendAdvPassCheck],
  //   },
  // })
  // async sendDanAdv(
  //   @Param('FCID') FCID: string,
  //   @Body() danmakuDto: DanmakuAdvDto,
  //   // @CurrentCtx() ctx: FastifyBizRequest,
  //   @CurrentAuthnModel() authn: AuthnModel,
  // ) {
  //   return await this.danmakuService.sendDanStd(FCID, danmakuDto, authn, true)
  // }
  // @Post('/:FCID/sub')
  // @HttpCache({ disable: true })
  // // @Level(Levels.Mid5)
  // @Authn({
  //   role: [Roles.user, Roles.bot],
  //   scope: [Scopes.danmakuSendSub],
  //   pass: {
  //     scope: [Scopes.danmakuSendSubPassCheck],
  //   },
  // })
  // async sendDanSub(
  //   @Param('FCID') FCID: string,
  //   @Body() danmakuDto: DanmakuStdDto,
  //   // @CurrentCtx() ctx: FastifyBizRequest,
  //   @CurrentAuthnModel() authn: AuthnModel,
  // ) {
  //   return await this.danmakuService.sendDanSub(FCID, danmakuDto, authn)
  // }
  // @Post('/:FCID/mark')
  // @HttpCache({ disable: true })
  // // @Level(Levels.Default)
  // @Authn({
  //   role: [Roles.user, Roles.bot],
  //   scope: [Scopes.danmakuSendChapter],
  //   pass: {
  //     scope: [Scopes.danmakuSendChapterPassCheck],
  //   },
  // })
  // async sendDanMarkChapter(
  //   @Param('FCID') FCID: string,
  //   @Body() danmakuDto: DanmakuMarkChapterDto,
  //   // @CurrentCtx() ctx: FastifyBizRequest,
  //   @CurrentAuthnModel() authn: AuthnModel,
  // ) {
  //   return await this.danmakuService.sendDanMarkChapter(FCID, danmakuDto, authn)
  // }

  @Delete('/:ID/:DMID')
  @HttpCache({ disable: true })
  // @Level(Levels.Creator)
  @Authn({
    role: [Roles.user, Roles.bot],
    scope: [Scopes.danmakuDel],
  })
  async deleteDan(@Param('ID') _ID: string, @Param('DMID') DMID: string) {
    return await this.danmakuService.delDan(DMID)
  }

  // @Get(['/export', '/export/:FCID'])
  // // @Level(Levels.Creator)
  // @Authn({ role: [Roles.bot], scope: [Scopes.danmakuExport] })
  // async exportDan(@Param('FCID') FCID?: string) {
  //   return await this.danmakuEService.exportDan(FCID)
  // }
  // @Put('import')
  // // @Level(Levels.Creator)
  // @Authn({ role: [Roles.bot], scope: [Scopes.danmakuImport] })
  // async importDan(@Body() danmakuDto: DanmakuImportDto[]) {
  //   return await this.danmakuEService.importDan(danmakuDto)
  // }
}
