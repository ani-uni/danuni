import { UniDMTools } from '@dan-uni/dan-any'
import { BadRequestException, Injectable, Logger } from '@nestjs/common'

import { InjectModel } from '~/transformers/model.transformer'

import {
  DanmakuAdvDto,
  DanmakuMarkChapterDto,
  DanmakuStdDto,
} from './danmaku.dto'
import { DanmakuModel } from './danmaku.model'
import { DanmakuService } from './danmaku.service'

@Injectable()
export class DanmakuSendService {
  private Logger = new Logger(DanmakuSendService.name)
  constructor(
    @InjectModel(DanmakuModel)
    private readonly danmakuService: DanmakuService,
  ) {}
  async sendDanStd(ID: string, dan: DanmakuAdvDto, adv = false) {
    if (!adv && dan.mode === UniDMTools.Modes.Ext)
      throw new BadRequestException('该接口不支持高级弹幕')
    const pre = await this.danmakuService.preDan(ID)
    const authn = this.danmakuService.currentAuthn
    const newDan = await this.danmakuService.sendDan(
      {
        ...dan,
        EPID: pre.ID.EPID,
        SOID: pre.ID.SOID,
        // senderID: pre.uid + pre.suffix,
        senderID: authn.sid,
        // weight: pre.level,
        weight: authn.weight,
        pool: adv ? UniDMTools.Pools.Adv : UniDMTools.Pools.Def,
        // platform: pre.baseConf.domain, // TODO platform为空时表示danuni
      },
      pre.meta,
    )
    return newDan
  }
  async sendDanSub(ID: string, dan: DanmakuStdDto) {
    if (dan.mode === UniDMTools.Modes.Ext)
      throw new BadRequestException('该接口不支持高级弹幕')
    const pre = await this.danmakuService.preDan(ID),
      authn = this.danmakuService.currentAuthn,
      danFull = {
        ...dan,
        EPID: pre.ID.EPID,
        SOID: pre.ID.SOID,
        // senderID: pre.uid + pre.suffix,
        senderID: authn.sid,
        // weight: pre.level,
        weight: authn.weight,
        pool: UniDMTools.Pools.Sub,
        // platform: pre.baseConf.domain,
      },
      newDan = await this.danmakuService.sendDan(danFull, pre.meta)
    return newDan
  }
  async sendDanMarkChapter(ID: string, dan: DanmakuMarkChapterDto) {
    // 此处允许mode为空而上方接口不可是由于此处Dto与std分离
    let mode = dan.mode
    if (!mode) mode = UniDMTools.Modes.Ext
    if (mode !== UniDMTools.Modes.Ext)
      throw new BadRequestException('该接口不支持非章节标记弹幕')
    const pre = await this.danmakuService.preDan(ID)
    const authn = this.danmakuService.currentAuthn
    return this.danmakuService.sendDan(
      {
        ...dan,
        EPID: pre.ID.EPID,
        SOID: pre.ID.SOID,
        // senderID: pre.uid + pre.suffix,
        senderID: authn.sid,
        // weight: pre.level,
        weight: authn.weight,
        pool: UniDMTools.Pools.Sub,
        // platform: pre.baseConf.domain,
        extraStr: JSON.stringify({
          danuni: {
            chapter: {
              duration: dan.chpt_duration,
              type: dan.chpt_type,
              // action: dan.chpt_action,
            },
          },
        } satisfies UniDMTools.Extra),
      },
      pre.meta,
    )
  }
}
