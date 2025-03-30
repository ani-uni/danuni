// import { compareSync } from 'bcryptjs'
// import { isInt } from 'class-validator'
// import { ObjectId } from 'mongoose'
// import type { DanmakuDocument } from './danmaku.model'

// import {
//   Extra,
//   ExtraDanUni,
//   Modes,
//   Pools,
//   UniDM,
// } from '@dan-uni/dan-any/src/utils/dm-gen'
// import { UniDM, UniDMTools, UniPool } from '@dan-uni/dan-any'
import { UniDMTools } from '@dan-uni/dan-any'
// import { createDMID } from '@dan-uni/dan-any/src/utils/id-gen'
import {
  BadRequestException,
  // ForbiddenException,
  // ForbiddenException,
  Injectable,
  Logger,
  // NotFoundException,
  // UnprocessableEntityException,
} from '@nestjs/common'

import { AuthnModel } from '~/constants/authn.constant'
// import { ReturnModelType } from '@typegoose/typegoose'

// import { FastifyBizRequest } from '~/transformers/get-req.transformer'
// import {
//   BizException,
//   BusinessException,
// } from '~/common/exceptions/biz.exception'
// import { ErrorCodeEnum } from '~/constants/error-code.constant'
import { InjectModel } from '~/transformers/model.transformer'

// import { LevelLowException } from '~/utils/custom-request-exception'

// import { ConfigsService } from '../configs/configs.service'
// import { MetaDocument } from '../meta/meta.model'
import { MetaService } from '../meta/meta.service'
import {
  DanmakuAdvDto,
  // DanmakuFullDto,
  // DanmakuImportDto,
  DanmakuMarkChapterDto,
  DanmakuStdDto,
} from './danmaku.dto'
import { DanmakuEService } from './danmaku.e.service'
// import { getAvatar } from '~/utils/tool.util'

// import { AuthService } from '../auth/auth.service'
import { DanmakuModel } from './danmaku.model'
import { DanmakuEventService } from './event.service'

// class UniDMExt extends UniDM {
//   constructor(
//     public PID: ObjectId | string,
//     ...args: any[]
//   ) {
//     super(
//       args[0],
//       args[1],
//       args[2],
//       args[3],
//       args[4],
//       args[5],
//       args[6],
//       args[7],
//       args[8],
//       args[9],
//       args[10],
//       args[11],
//       args[12],
//       args[13],
//       args[14],
//       // args[15],
//       // args[16],
//     )
//   }
// }
// class UniPoolExt extends UniPool {
//   public dans: UniDMExt[]
//   constructor(dans: UniDMExt[]) {
//     super(dans.sort((a, b) => a.progress - b.progress)) //按进度排序
//   }
// }

@Injectable()
export class DanmakuService {
  private Logger = new Logger(DanmakuService.name)
  constructor(
    @InjectModel(DanmakuModel)
    // private readonly danmakuModel: ReturnModelType<typeof DanmakuModel>,
    private readonly metaService: MetaService,
    private readonly danmakuEService: DanmakuEService,
    private readonly danmakuEventService: DanmakuEventService,
    // private readonly configService: ConfigsService,
    // private readonly authService: AuthService,
  ) {}
  // public get model() {
  //   return this.danmakuModel
  // }
  // async canEdit(meta: MetaDocument, ctx: FastifyBizRequest) {
  //   const { level, uid } = ctx
  //   if (level === Levels.Creator || uid === meta.creator) return true
  //   return false
  // }
  // fmtSingleDan(dan: DanmakuDocument) {
  //   // console.log(String(dan._id))
  //   return new UniDMExt(
  //     String(dan._id),
  //     dan.FCID,
  //     dan.progress,
  //     dan.mode,
  //     dan.fontsize,
  //     dan.color,
  //     dan.senderID,
  //     dan.content,
  //     new Date(dan.ctime),
  //     dan.weight,
  //     dan.pool,
  //     dan.attr,
  //     dan.platfrom,
  //     dan.SPMO,
  //     dan.extraStr,
  //     dan.DMID,
  //   )
  // }
  // fmt2Uni(dans: DanmakuDocument[]): UniDMExt[] {
  //   return new UniPoolExt(dans.map((dan) => this.fmtSingleDan(dan))).dans
  // } // 不将extraStr转为json，防止服务端snakecase键

  // async getDan(FCID: string, DMID: string) {
  //   const dan = await this.danmakuModel.findOne({
  //     FCID,
  //     DMID,
  //   })
  //   if (!dan) return null
  //   return dan
  // }
  // async getDanByObjectID(objectID: ObjectId | string) {
  //   const dan = await this.danmakuModel.findById(objectID)
  //   if (!dan) return null
  //   return dan
  // }
  // async hasDan(FCID: string, DMID: string) {
  //   return !!(await this.getDan(FCID, DMID))?.DMID
  // }

  // async listDanByFCID({
  //   FCID,
  //   SPMO,
  //   seg = 0,
  // }: {
  //   FCID: string
  //   SPMO?: string
  //   seg?: number
  // }) {
  //   if (seg && (seg < 0 || !isInt(seg)))
  //     throw new BadRequestException('seg应为自然数')
  //   let query: object = { FCID, SPMO },
  //     pool1Query: object = { ...query, pool: UniDMTools.Pools.Sub }
  //   if (seg > 0) {
  //     const progress = {
  //       $gte: (seg - 1) * 6 * 60,
  //       $lt: seg * 6 * 60,
  //     }
  //     query = { ...query, progress }
  //     pool1Query = { ...pool1Query, progress }
  //   }
  //   const pool1Dans = await this.danmakuModel
  //       .find(pool1Query)
  //       .sort({ ctime: -1, progress: 1 }),
  //     dans = await this.danmakuModel
  //       .find(query)
  //       .sort({ ctime: -1, progress: 1 })
  //       .limit(3000)
  //   // .lean({ virtuals: true })
  //   return new UniPoolExt([...this.fmt2Uni(dans), ...this.fmt2Uni(pool1Dans)])
  // }
  // async listDanBySender(sender: string, FCID?: string, SPMO?: string) {
  //   const { domain } = await this.configService.get('base'),
  //     suffix = `@${domain}`
  //   const filter = {
  //     senderID: sender + suffix,
  //     FCID,
  //     SPMO,
  //   }
  //   if (!FCID) delete filter.FCID
  //   if (!SPMO) delete filter.SPMO
  //   const dans = await this.danmakuModel.find(filter)
  //   // .lean({ virtuals: true })
  //   return this.fmt2Uni(dans)
  // }

  // async preDan(FCID: string, ctx: FastifyBizRequest, sub = false) {
  //   const { uid, level } = ctx
  //   if (!uid) throw new BadRequestException('未登录')
  //   const meta = await this.metaService.getMeta(FCID)
  //   if (!meta) throw new NotFoundException('未找到该弹幕库')
  //   const baseConf = await this.configService.get('base')
  //   return {
  //     uid,
  //     level,
  //     meta,
  //     baseConf,
  //     suffix: `@${baseConf.domain}`,
  //     danmakuConf: sub
  //       ? await this.configService.get('danmaku')
  //       : this.configService.defaultConfig.danmaku,
  //   }
  // }
  // // async canEdit(FCID: string, ctx: FastifyBizRequest)
  // public async canEdit(dan: DanmakuDocument, ctx: FastifyBizRequest) {
  //   // const danReal = typeof dan === 'string' ? await this.getDan(dan) : dan
  //   // if (!danReal) throw new NotFoundException('未找到该弹幕')
  //   if (dan.senderID === ctx.uid) return true
  //   else return this.metaService.canEdit(dan.FCID, ctx)
  // }

  // async sendDan(dan: DanmakuFullDto, meta: MetaDocument) {
  //   if (meta.duration && dan.progress > meta.duration)
  //     throw new BadRequestException('弹幕时间超出视频长度')
  //   // const ctime = UniDM.transCtime(new Date())
  //   // DMID = createDMID(dan.content, dan.senderID, ctime)
  //   // const newDan = await this.danmakuModel.create({ ...dan, ctime })
  //   const newDan = await this.danmakuModel.create(UniDM.create(dan))
  //   // console.log(newDan._id)
  //   return this.fmtSingleDan(newDan)
  // }
  async sendDanStd(
    FCID: string,
    dan: DanmakuAdvDto,
    // ctx: FastifyBizRequest,
    authn: AuthnModel,
    adv = false,
  ) {
    if (!adv && dan.mode === UniDMTools.Modes.Ext)
      throw new BadRequestException('该接口不支持高级弹幕')
    const pre = await this.danmakuEService.preDan(FCID, authn)
    authn = pre.authn
    const newDan = await this.danmakuEService.sendDan(
      {
        ...dan,
        FCID,
        // senderID: pre.uid + pre.suffix,
        senderID: authn.sid,
        // weight: pre.level,
        weight: authn.weight,
        pool: adv ? UniDMTools.Pools.Adv : UniDMTools.Pools.Def,
        platfrom: pre.baseConf.domain,
      },
      pre.meta,
    )
    // if (adv && newDan.PID && ctx.level < pre.danmakuConf.extFullMinLv) {
    if (
      adv &&
      newDan.PID &&
      // !authn.scopes.has(Scopes.danmakuSendAdvPassCheck)
      !authn.pass
    ) {
      this.danmakuEventService.operateDan(
        {
          PID: newDan.PID.toString(),
          action: 'permit',
        },
        authn,
      )
      this.danmakuEService.setDanProp(newDan.PID, 'Hide')
    }
    return newDan
  }
  async sendDanSub(FCID: string, dan: DanmakuStdDto, authn: AuthnModel) {
    if (dan.mode === UniDMTools.Modes.Ext)
      throw new BadRequestException('该接口不支持高级弹幕')
    // const pre = await this.danmakuEService.preDan(FCID, authn, true),
    const pre = await this.danmakuEService.preDan(FCID, authn),
      danFull = {
        ...dan,
        FCID,
        // senderID: pre.uid + pre.suffix,
        senderID: authn.sid,
        // weight: pre.level,
        weight: authn.weight,
        pool: UniDMTools.Pools.Sub,
        platfrom: pre.baseConf.domain,
      },
      newDan = await this.danmakuEService.sendDan(danFull, pre.meta)
    // if (pre.level >= pre.danmakuConf.extFullMinLv) return newDan
    authn = pre.authn
    if (authn.pass) return newDan
    // else if (pre.level >= pre.danmakuConf.subMinLv) return this.sendDan(dan)
    // else throw new LevelLowException(pre.danmakuConf.subMinLv, pre.level)
    else {
      this.danmakuEventService.operateDan(
        {
          PID: newDan.PID.toString(),
          action: 'permit',
        },
        authn,
      )
      this.danmakuEService.setDanProp(newDan.PID, 'Hide')
      return newDan
    }
  }
  async sendDanMarkChapter(
    FCID: string,
    dan: DanmakuMarkChapterDto,
    // ctx: FastifyBizRequest,
    authn: AuthnModel,
  ) {
    // 此处允许mode为空而上方接口不可是由于此处Dto与std分离
    let mode = dan.mode
    if (!mode) mode = UniDMTools.Modes.Ext
    if (mode !== UniDMTools.Modes.Ext)
      throw new BadRequestException('该接口不支持非章节标记弹幕')
    const pre = await this.danmakuEService.preDan(FCID, authn)
    authn = pre.authn // 目前pre中的修改没有该api的影响项，故也可注释该行
    return this.danmakuEService.sendDan(
      {
        ...dan,
        FCID,
        // senderID: pre.uid + pre.suffix,
        senderID: authn.sid,
        // weight: pre.level,
        weight: authn.weight,
        pool: UniDMTools.Pools.Sub,
        platfrom: pre.baseConf.domain,
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

  // async delDan(FCID: string, DMID: string, ctx: FastifyBizRequest) {
  //   const dan = await this.getDan(FCID, DMID)
  //   if (!dan?.DMID) throw new NotFoundException('未找到该弹幕')
  //   if (!(await this.canEdit(dan, ctx)))
  //     throw new ForbiddenException('无删除权限')
  //   return this.danmakuModel.deleteOne({ FCID, DMID })
  // }
  // async delDanById(oid: ObjectId | string) {
  //   return this.danmakuModel.findByIdAndDelete(oid)
  // }

  // async setDanProp(
  //   oid: ObjectId | string,
  //   prop: UniDMTools.DMAttr,
  //   rm: boolean = false,
  // ) {
  //   if (rm)
  //     return this.danmakuModel.findByIdAndUpdate(oid, {
  //       $pull: { attr: prop },
  //     })
  //   else
  //     return this.danmakuModel.findByIdAndUpdate(oid, {
  //       $addToSet: { attr: prop },
  //     })
  // }

  // async exportDan(FCID?: string) {
  //   return this.danmakuModel.find(FCID ? { FCID } : {}).lean()
  // }
  // async importDan(dans: DanmakuImportDto[]) {
  //   return this.danmakuModel.insertMany(dans)
  // }

  // async patchDan(
  //   DMID: string,
  //   data: Partial<DanmakuModel>,
  //   ctx: FastifyBizRequest,
  // ) {
  //   const dan = await this.getDan(DMID)
  //   if (!dan?.DMID) throw new NotFoundException('未找到该弹幕')
  //   if (!(await this.canEdit(dan, ctx)))
  //     throw new ForbiddenException('无修改权限')
  //   return this.danmakuModel.updateOne({ DMID }, data)
  // }
}
