// import { compareSync } from 'bcryptjs'
import { isInt } from 'class-validator'
import { ObjectId } from 'mongoose'
import type { DanmakuDocument } from './danmaku.model'

// import {
//   Extra,
//   ExtraDanUni,
//   Modes,
//   Pools,
//   UniDM,
// } from '@dan-uni/dan-any/src/utils/dm-gen'
import { UniDM, UniDMTools, UniPool } from '@dan-uni/dan-any'
// import { createDMID } from '@dan-uni/dan-any/src/utils/id-gen'
import {
  BadRequestException,
  ForbiddenException,
  // ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  // UnprocessableEntityException,
} from '@nestjs/common'
import { ReturnModelType } from '@typegoose/typegoose'

import { AuthnModel } from '~/constants/authn.constant'
// import { FastifyBizRequest } from '~/transformers/get-req.transformer'
// import {
//   BizException,
//   BusinessException,
// } from '~/common/exceptions/biz.exception'
// import { ErrorCodeEnum } from '~/constants/error-code.constant'
import { InjectModel } from '~/transformers/model.transformer'

// import { LevelLowException } from '~/utils/custom-request-exception'

import { ConfigsService } from '../configs/configs.service'
import { MetaDocument } from '../meta/meta.model'
import { MetaService } from '../meta/meta.service'
import { DanmakuFullDto, DanmakuImportDto } from './danmaku.dto'
// import { getAvatar } from '~/utils/tool.util'

// import { AuthService } from '../auth/auth.service'
import { DanmakuModel } from './danmaku.model'

class UniDMExt extends UniDM {
  constructor(
    public PID: ObjectId | string,
    ...args: any[]
  ) {
    super(
      args[0],
      args[1],
      args[2],
      args[3],
      args[4],
      args[5],
      args[6],
      args[7],
      args[8],
      args[9],
      args[10],
      args[11],
      args[12],
      args[13],
      args[14],
      // args[15],
      // args[16],
    )
  }
}
class UniPoolExt extends UniPool {
  public dans: UniDMExt[]
  constructor(dans: UniDMExt[]) {
    super(dans.sort((a, b) => a.progress - b.progress)) //按进度排序
  }
}

@Injectable()
export class DanmakuEService {
  private Logger = new Logger(DanmakuEService.name)
  constructor(
    @InjectModel(DanmakuModel)
    private readonly danmakuModel: ReturnModelType<typeof DanmakuModel>,
    private readonly metaService: MetaService,
    private readonly configService: ConfigsService,
    // private readonly authService: AuthService,
  ) {}
  public get model() {
    return this.danmakuModel
  }
  // async canEdit(meta: MetaDocument, ctx: FastifyBizRequest) {
  //   const { level, uid } = ctx
  //   if (level === Levels.Creator || uid === meta.creator) return true
  //   return false
  // }
  fmtSingleDan(dan: DanmakuDocument) {
    // console.log(String(dan._id))
    return new UniDMExt(
      String(dan._id),
      dan.FCID,
      dan.progress,
      dan.mode,
      dan.fontsize,
      dan.color,
      dan.senderID,
      dan.content,
      new Date(dan.ctime),
      dan.weight,
      dan.pool,
      dan.attr,
      dan.platfrom,
      dan.SPMO,
      dan.extraStr,
      dan.DMID,
    )
  }
  fmt2Uni(dans: DanmakuDocument[]): UniDMExt[] {
    return new UniPoolExt(dans.map((dan) => this.fmtSingleDan(dan))).dans
  } // 不将extraStr转为json，防止服务端snakecase键

  async getDan(FCID: string, DMID: string) {
    const dan = await this.danmakuModel.findOne({
      FCID,
      DMID,
    })
    if (!dan) return null
    return dan
  }
  async getDanByObjectID(objectID: ObjectId | string) {
    const dan = await this.danmakuModel.findById(objectID)
    if (!dan) return null
    return dan
  }
  async hasDan(FCID: string, DMID: string) {
    return !!(await this.getDan(FCID, DMID))?.DMID
  }

  async listDanByFCID({
    FCID,
    SPMO,
    seg = 0,
  }: {
    FCID: string
    SPMO?: string
    seg?: number
  }) {
    if (seg && (seg < 0 || !isInt(seg)))
      throw new BadRequestException('seg应为自然数')
    let query: object = { FCID, SPMO },
      pool1Query: object = { ...query, pool: UniDMTools.Pools.Sub }
    if (seg > 0) {
      const progress = {
        $gte: (seg - 1) * 6 * 60,
        $lt: seg * 6 * 60,
      }
      query = { ...query, progress }
      pool1Query = { ...pool1Query, progress }
    }
    const pool1Dans = await this.danmakuModel
        .find(pool1Query)
        .sort({ ctime: -1, progress: 1 }),
      dans = await this.danmakuModel
        .find(query)
        .sort({ ctime: -1, progress: 1 })
        .limit(3000)
    // .lean({ virtuals: true })
    return new UniPoolExt([...this.fmt2Uni(dans), ...this.fmt2Uni(pool1Dans)])
  }
  async listDanBySender(sender: string, FCID?: string, SPMO?: string) {
    const { domain } = await this.configService.get('base'),
      suffix = `@${domain}`
    const filter = {
      senderID: sender + suffix,
      FCID,
      SPMO,
    }
    if (!FCID) delete filter.FCID
    if (!SPMO) delete filter.SPMO
    const dans = await this.danmakuModel.find(filter)
    // .lean({ virtuals: true })
    return this.fmt2Uni(dans)
  }

  // async preDan(FCID: string, authn: AuthnModel, sub = false) {
  async preDan(
    FCID: string,
    authn: AuthnModel,
    addons: { [key: string]: boolean } = { danmakuConf: false },
  ) {
    // const { uid, level } = ctx
    if (!authn.sid) throw new BadRequestException('未登录')
    const meta = await this.metaService.getMeta(FCID)
    if (!meta) throw new NotFoundException('未找到该弹幕库')
    if (await this.metaService.isScopeAdmin(meta, authn)) authn.pass = true
    const baseConf = await this.configService.get('base')
    return {
      authn,
      meta,
      baseConf,
      suffix: `@${baseConf.domain}`,
      danmakuConf: addons.danmakuConf
        ? await this.configService.get('danmaku')
        : this.configService.defaultConfig.danmaku,
    }
  }
  // async canEdit(FCID: string, ctx: FastifyBizRequest)
  public async isScopeAdmin(dan: DanmakuDocument, authn: AuthnModel) {
    // const danReal = typeof dan === 'string' ? await this.getDan(dan) : dan
    // if (!danReal) throw new NotFoundException('未找到该弹幕')
    if (dan.senderID === authn.sid) return true
    else return this.metaService.isScopeAdmin(dan.FCID, authn)
  }

  async sendDan(dan: DanmakuFullDto, meta: MetaDocument) {
    if (meta.duration && dan.progress > meta.duration)
      throw new BadRequestException('弹幕时间超出视频长度')
    // const ctime = UniDM.transCtime(new Date())
    // DMID = createDMID(dan.content, dan.senderID, ctime)
    // const newDan = await this.danmakuModel.create({ ...dan, ctime })
    const newDan = await this.danmakuModel.create(UniDM.create(dan))
    // console.log(newDan._id)
    return this.fmtSingleDan(newDan)
  }

  async delDan(FCID: string, DMID: string, authn: AuthnModel) {
    const dan = await this.getDan(FCID, DMID)
    if (!dan?.DMID) throw new NotFoundException('未找到该弹幕')
    if (authn.pass) dan.deleteOne()
    else if (await this.isScopeAdmin(dan, authn)) {
      const pre = await this.preDan(FCID, authn, { danmakuConf: true })
      if (
        Date.now() <=
        new Date(dan.ctime).getTime() + pre.danmakuConf.inBufferTime
      )
        dan.deleteOne()
      else
        throw new ForbiddenException('弹幕已从缓冲区入库(超出弹幕可操作时间)')
    } else throw new ForbiddenException('无删除权限')
  }
  async delDanById(oid: ObjectId | string) {
    return this.danmakuModel.findByIdAndDelete(oid)
  }
  async delAllDanByFCID(FCID: string) {
    return this.danmakuModel.deleteMany({ FCID })
  }

  async setDanProp(
    oid: ObjectId | string,
    prop: UniDMTools.DMAttr,
    rm: boolean = false,
  ) {
    if (rm)
      return this.danmakuModel.findByIdAndUpdate(oid, {
        $pull: { attr: prop },
      })
    else
      return this.danmakuModel.findByIdAndUpdate(oid, {
        $addToSet: { attr: prop },
      })
  }

  async exportDan(FCID?: string) {
    const conf = await this.configService.get('danmaku'),
      search = { $lt: Date.now() - conf.inBufferTime }
    return this.danmakuModel.find(FCID ? { ...search, FCID } : search).lean()
  }
  async importDan(dans: DanmakuImportDto[]) {
    return this.danmakuModel.insertMany(dans)
  }
}
