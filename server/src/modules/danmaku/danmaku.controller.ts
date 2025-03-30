import { DM_format } from '@dan-uni/dan-any'
import {
  BadRequestException,
  Body,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  // UnauthorizedException,
  UseGuards,
} from '@nestjs/common'

import { ApiController } from '~/common/decorators/api-controller.decorator'
import { Authn, CurrentAuthnModel } from '~/common/decorators/authn.decorator'
// import { Auth } from '~/common/decorators/auth.decorator'
import { HttpCache } from '~/common/decorators/cache.decorator'
import { HTTPDecorators } from '~/common/decorators/http.decorator'
// import { CurrentCtx, Level } from '~/common/decorators/level.decorator'
import { AuthnGuard } from '~/common/guards/authn.guard'
import { AuthnModel, Roles, Scopes } from '~/constants/authn.constant'

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
  DanmakuImportDto,
  DanmakuMarkChapterDto,
  DanmakuStdDto,
} from './danmaku.dto'
import { DanmakuEService } from './danmaku.e.service'
// import { MetaDocument } from './meta.model'
import { DanmakuService } from './danmaku.service'
import {
  DanmakuEventDto,
  DanmakuEventFinishDto,
  DanmakuEventVoteDto,
} from './event.dto'
import { DanmakuEventService } from './event.service'

@ApiController(['danmaku'])
@UseGuards(AuthnGuard)
export class DanmakuController {
  constructor(
    private readonly danmakuService: DanmakuService,
    private readonly danmakuEService: DanmakuEService,
    private readonly danmakuEventService: DanmakuEventService,
    // private readonly authService: AuthService,
    // private readonly configService: ConfigsService,

    // @Inject(forwardRef(() => AuthnService))
    // private readonly authnService: AuthnService,
  ) {}

  @Get(['/:FCID', '/:FCID/seg/:seg'])
  // @Level(Levels.GuestOrBan)
  @Authn({ role: [Roles.guest] })
  async listDanByFCID(
    @Param('FCID') FCID: string,
    @Param('seg') seg?: number,
    @Query('SPMO') SPMO?: string,
  ) {
    return (await this.danmakuEService.listDanByFCID({ FCID, seg, SPMO })).dans
  }
  @Get(['/:FCID/:fmt', '/:FCID/seg/:seg/:fmt'])
  // @Level(Levels.GuestOrBan)
  @Authn({ role: [Roles.guest] })
  @HTTPDecorators.Bypass
  async listDanByFCIDwithFmt(
    @Param('FCID') FCID: string,
    @Param('fmt') fmt: DM_format,
    @Param('seg') seg?: number,
    @Query('SPMO') SPMO?: string,
  ) {
    const pool = await this.danmakuEService.listDanByFCID({ FCID, seg, SPMO }),
      res = pool.convert2(fmt)
    if (typeof res === 'string') {
      if (res.startsWith('(err)')) throw new BadRequestException(res)
      else return res // common.ass
    } else return res
  }
  // @Get('/mine')
  // // @Level(Levels.GuestOrBan)
  // @Authn({ role: [Roles.user] })
  // async listMyDan(@CurrentAuthnModel() authn: AuthnModel) {
  //   if (!authn.uid) throw new UnauthorizedException('未登录')
  //   return await this.danmakuEService.listDanBySender(authn.uid)
  // }
  @Get(['/mine', '/:FCID/mine'])
  // @Level(Levels.GuestOrBan)
  @Authn({ role: [Roles.user, Roles.bot] })
  async listMyDanInFCID(
    @CurrentAuthnModel() authn: AuthnModel,
    @Param('FCID') FCID?: string,
    // @CurrentCtx() ctx: FastifyBizRequest,
  ) {
    // if (!authn.uid) throw new UnauthorizedException('未登录')
    return await this.danmakuEService.listDanBySender(authn.sid, FCID)
  }
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

  @Post('/:FCID')
  @HttpCache({ disable: true })
  // @Level(Levels.Default) //TODO 所有controller 的 level guard 用configservice里的设置值
  @Authn({ role: [Roles.user, Roles.bot], scope: [Scopes.danmakuSend] })
  async sendDanStd(
    @Param('FCID') FCID: string,
    @Body() danmakuDto: DanmakuStdDto,
    // @CurrentCtx() ctx: FastifyBizRequest,
    @CurrentAuthnModel() authn: AuthnModel,
  ) {
    return await this.danmakuService.sendDanStd(FCID, danmakuDto, authn)
  }
  @Post('/:FCID/adv')
  @HttpCache({ disable: true })
  // @Level(Levels.High7) //TODO 所有controller 的 level guard 用configservice里的设置值
  @Authn({
    role: [Roles.user, Roles.bot],
    scope: [Scopes.danmakuSendAdv],
    pass: {
      scope: [Scopes.danmakuSendAdvPassCheck],
    },
  })
  async sendDanAdv(
    @Param('FCID') FCID: string,
    @Body() danmakuDto: DanmakuAdvDto,
    // @CurrentCtx() ctx: FastifyBizRequest,
    @CurrentAuthnModel() authn: AuthnModel,
  ) {
    return await this.danmakuService.sendDanStd(FCID, danmakuDto, authn, true)
  }
  @Post('/:FCID/sub')
  @HttpCache({ disable: true })
  // @Level(Levels.Mid5)
  @Authn({
    role: [Roles.user, Roles.bot],
    scope: [Scopes.danmakuSendSub],
    pass: {
      scope: [Scopes.danmakuSendSubPassCheck],
    },
  })
  async sendDanSub(
    @Param('FCID') FCID: string,
    @Body() danmakuDto: DanmakuStdDto,
    // @CurrentCtx() ctx: FastifyBizRequest,
    @CurrentAuthnModel() authn: AuthnModel,
  ) {
    return await this.danmakuService.sendDanSub(FCID, danmakuDto, authn)
  }
  @Post('/:FCID/mark')
  @HttpCache({ disable: true })
  // @Level(Levels.Default)
  @Authn({
    role: [Roles.user, Roles.bot],
    scope: [Scopes.danmakuSendChapter],
    pass: {
      scope: [Scopes.danmakuSendChapterPassCheck],
    },
  })
  async sendDanMarkChapter(
    @Param('FCID') FCID: string,
    @Body() danmakuDto: DanmakuMarkChapterDto,
    // @CurrentCtx() ctx: FastifyBizRequest,
    @CurrentAuthnModel() authn: AuthnModel,
  ) {
    return await this.danmakuService.sendDanMarkChapter(FCID, danmakuDto, authn)
  }

  @Delete('/:FCID/:DMID')
  @HttpCache({ disable: true })
  // @Level(Levels.Creator)
  @Authn({
    role: [Roles.user, Roles.bot],
    // scope: [Scopes.danmakuSend], //能发弹幕的人才能删(很合理吧 ，好吧，其实可能刚发完就被ban弹幕权限
    pass: { scope: [Scopes.danmakuDel] }, //Scopes中的权限为全局权限
  })
  async deleteDan(
    @Param('FCID') FCID: string,
    @Param('DMID') DMID: string,
    // @CurrentCtx() ctx: FastifyBizRequest,
    @CurrentAuthnModel() authn: AuthnModel,
  ) {
    return await this.danmakuEService.delDan(FCID, DMID, authn)
  }

  @Post('/community/:PID/new') //, '/:FCID/:DMID'
  @HttpCache({ disable: true })
  // @Level(Levels.Min)
  @Authn({ role: [Roles.user, Roles.bot], scope: [Scopes.danmakuEventIssue] })
  async operateDan(
    @Param('PID') PID: string,
    @Body() danmakuEventDto: DanmakuEventDto,
    // @CurrentCtx() ctx: FastifyBizRequest,
    @CurrentAuthnModel() authn: AuthnModel,
  ) {
    danmakuEventDto.PID = PID
    return await this.danmakuEventService.operateDan(danmakuEventDto, authn)
  }
  @Get('/community/:PID')
  // @Level(Levels.GuestOrBan)
  @Authn({ role: [Roles.user, Roles.bot] })
  async getDanEvent(
    @Param('PID') PID: string,
    // @CurrentCtx() ctx: FastifyBizRequest,
    @CurrentAuthnModel() authn: AuthnModel,
  ) {
    return await this.danmakuEventService.getDanEvent(PID, authn)
  }
  @Get(['/community', '/community/list'])
  // @Level(Levels.Creator)
  @Authn({ role: [Roles.user, Roles.bot] }) //guard中读取uid->可控meta/dan/event->授予作用域(scopes分全局与局部)
  async listDanEvent() {
    return await this.danmakuEventService.listDanEvent()
  }
  @Get('/community/list/:FCID')
  // @Level(Levels.GuestOrBan)
  @Authn({ role: [Roles.user, Roles.bot] })
  async listDanEventByFCID(
    @Param('FCID') FCID: string,
    // @CurrentCtx() ctx: FastifyBizRequest,
    @CurrentAuthnModel() authn: AuthnModel,
  ) {
    return await this.danmakuEventService.listDanEventByFCID(FCID, authn)
  }
  @Post('/community/:PID/vote')
  @HttpCache({ disable: true })
  // @Level(Levels.Default)
  @Authn({ role: [Roles.user, Roles.bot], scope: [Scopes.danmakuEventVote] })
  async voteDanEvent(
    @Param('PID') PID: string,
    @Body() danmakuEventDto: DanmakuEventVoteDto,
    // @CurrentCtx() ctx: FastifyBizRequest,
    @CurrentAuthnModel() authn: AuthnModel,
  ) {
    return await this.danmakuEventService.voteAction(
      PID,
      authn,
      danmakuEventDto.action,
    )
  }
  @Post('/community/:PID/done')
  @HttpCache({ disable: true })
  // @Level(Levels.Creator)
  @Authn({ role: [Roles.user, Roles.bot], scope: [Scopes.danmakuEventEnd] })
  async finishDanEvent(
    @Param('PID') PID: string,
    @Body() danmakuEventDto: DanmakuEventFinishDto,
  ) {
    return await this.danmakuEventService.finishEvent(
      PID,
      danmakuEventDto.action,
    )
  }

  @Get(['/export', '/export/:FCID'])
  // @Level(Levels.Creator)
  @Authn({ role: [Roles.bot], scope: [Scopes.danmakuExport] })
  async exportDan(@Param('FCID') FCID?: string) {
    return await this.danmakuEService.exportDan(FCID)
  }
  @Put('import')
  // @Level(Levels.Creator)
  @Authn({ role: [Roles.bot], scope: [Scopes.danmakuImport] })
  async importDan(@Body() danmakuDto: DanmakuImportDto[]) {
    return await this.danmakuEService.importDan(danmakuDto)
  }
}
