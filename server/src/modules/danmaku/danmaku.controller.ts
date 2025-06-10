import { DM_format } from '@dan-uni/dan-any'
import {
  BadRequestException,
  Body,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'

import { ApiController } from '~/common/decorators/api-controller.decorator'
import { Authn } from '~/common/decorators/authn.decorator'
import { HttpCache } from '~/common/decorators/cache.decorator'
import { AuthnGuard } from '~/common/guards/authn.guard'
import { Roles, Scopes } from '~/constants/authn.constant'

import {
  DanmakuAdvDto,
  DanmakuMarkChapterDto,
  DanmakuStdDto,
} from './danmaku.dto'
import { DanmakuSendService } from './danmaku.send.service'
import { DanmakuService } from './danmaku.service'

@ApiController(['danmaku'])
@UseGuards(AuthnGuard)
export class DanmakuController {
  constructor(
    private readonly danmakuService: DanmakuService,
    private readonly danmakuSendService: DanmakuSendService,
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

  @Delete('/:ID/:DMID')
  @HttpCache({ disable: true })
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
