import { Body, Get, Param, Post, UseGuards } from '@nestjs/common'

import { ApiController } from '~/common/decorators/api-controller.decorator'
import { Authn } from '~/common/decorators/authn.decorator'
import { HttpCache } from '~/common/decorators/cache.decorator'
import { AuthnGuard } from '~/common/guards/authn.guard'
import { Roles, Scopes } from '~/constants/authn.constant'
import { IdPrefixPreHandlers } from '~/utils/id-prefix.util'

import { DanmakuEventDto } from './event.dto'
import { DanmakuEventService } from './event.service'

@ApiController(['community'])
@UseGuards(AuthnGuard)
export class DanmakuEventController {
  constructor(private readonly danmakuEventService: DanmakuEventService) {}
  @Post('/:DMID/new')
  @HttpCache({ disable: true })
  @Authn({ role: [Roles.user, Roles.bot], scope: [Scopes.danmakuEventIssue] })
  async operateDan(
    @Param('DMID') PID: string,
    @Body() danmakuEventDto: DanmakuEventDto,
  ) {
    danmakuEventDto.PID = IdPrefixPreHandlers.dm(PID)
    return await this.danmakuEventService.operateDan(danmakuEventDto)
  }
  @Post('/:DMID/vote')
  @HttpCache({ disable: true })
  @Authn({ role: [Roles.user, Roles.bot], scope: [Scopes.danmakuEventVote] })
  async voteDanEvent(
    @Param('DMID') PID: string,
    @Body() danmakuEventDto: DanmakuEventDto,
  ) {
    return await this.danmakuEventService.voteAction(
      IdPrefixPreHandlers.dm(PID),
      danmakuEventDto.action,
    )
  }

  @Get(['/', '/:DMID']) // 为空时返回任意一条公开event
  @Authn({ role: [Roles.user, Roles.bot] })
  async getDanEvent(@Param('DMID') PID: string) {
    return this.danmakuEventService.fmtEvent(
      await this.danmakuEventService.getDanEvent(IdPrefixPreHandlers.dm(PID)),
    )
  }
  // @Get(['', '/list'])
  // // @Level(Levels.Creator)
  // @Authn({ role: [Roles.user, Roles.bot] }) //guard中读取uid->可控meta/dan/event->授予作用域(scopes分全局与局部)
  // async listDanEvent() {
  //   return await this.danmakuEventService.listDanEvent()
  // }
  // @Get('/list/:FCID')
  // // @Level(Levels.GuestOrBan)
  // @Authn({ role: [Roles.user, Roles.bot] })
  // async listDanEventByFCID(
  //   @Param('FCID') FCID: string,
  //   // @CurrentCtx() ctx: FastifyBizRequest,
  //   @CurrentAuthnModel() authn: AuthnModel,
  // ) {
  //   return await this.danmakuEventService.listDanEventByFCID(FCID, authn)
  // }
  @Post('/:DMID/done')
  @HttpCache({ disable: true })
  @Authn({ role: [Roles.user, Roles.bot], scope: [Scopes.danmakuEventClose] })
  async finishDanEvent(
    @Param('DMID') PID: string,
    @Body() danmakuEventDto: DanmakuEventDto,
  ) {
    return await this.danmakuEventService.finishEvent(
      IdPrefixPreHandlers.dm(PID),
      danmakuEventDto.action,
    )
  }
}
