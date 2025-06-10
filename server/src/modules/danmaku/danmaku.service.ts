// import { compareSync } from 'bcryptjs'
import { isInt } from 'class-validator'
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

import { RequestContext } from '~/common/contexts/request.context'
// import { FastifyBizRequest } from '~/transformers/get-req.transformer'
// import {
//   BizException,
//   BusinessException,
// } from '~/common/exceptions/biz.exception'
// import { ErrorCodeEnum } from '~/constants/error-code.constant'
import { InjectModel } from '~/transformers/model.transformer'
import {
  checkID,
  IdPrefixPostHandlers,
  IdPrefixPreHandler,
  IdPrefixPreHandlers,
} from '~/utils/id-prefix.util'

// import { LevelLowException } from '~/utils/custom-request-exception'

import { ConfigsService } from '../configs/configs.service'
import { MetaDocument } from '../meta/meta.model'
import { MetaService } from '../meta/meta.service'
import { MetaSourceService } from '../meta/source.service'
import { DanmakuFullDto, DanmakuImportDto } from './danmaku.dto'
// import { getAvatar } from '~/utils/tool.util'

// import { AuthService } from '../auth/auth.service'
import { DanmakuModel } from './danmaku.model'

class UniPoolExt extends UniPool {
  public dans: UniDM[]
  constructor(dans: UniDM[]) {
    super(dans.sort((a, b) => a.progress - b.progress)) //按进度排序
  }
}

@Injectable()
export class DanmakuService {
  private Logger = new Logger(DanmakuService.name)
  constructor(
    @InjectModel(DanmakuModel)
    private readonly danmakuModel: ReturnModelType<typeof DanmakuModel>,
    private readonly metaService: MetaService,
    private readonly metaSourceService: MetaSourceService,
    private readonly configService: ConfigsService,
    // private readonly authService: AuthService,
  ) {}
  public get model() {
    return this.danmakuModel
  }

  get currentAuthn() {
    return RequestContext.currentAuthn()
  }

  // async canEdit(meta: MetaDocument, ctx: FastifyBizRequest) {
  //   const { level, uid } = ctx
  //   if (level === Levels.Creator || uid === meta.creator) return true
  //   return false
  // }
  fmtSingleDan(dan: DanmakuDocument) {
    // dan = this.modelPostHook(dan)
    // console.log(String(dan._id))
    return new UniDM(
      IdPrefixPostHandlers.ep(dan.EPID),
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
      dan.platform,
      IdPrefixPostHandlers.so(dan.SOID),
      dan.extraStr,
      IdPrefixPostHandlers.dm(dan.DMID),
    )
  }
  fmt2Uni(dans: DanmakuDocument[]): UniDM[] {
    return new UniPoolExt(dans.map((dan) => this.fmtSingleDan(dan))).dans
  } // 不将extraStr转为json，防止服务端snakecase键

  async toDanmakuDocument(dan: DanmakuDocument | string) {
    const danReal = typeof dan === 'string' ? await this.getDan(dan) : dan
    if (!danReal) throw new NotFoundException('未找到该弹幕')
    return danReal
  }

  // async getDan(FCID: string, DMID: string) {
  //   const dan = await this.danmakuModel.findOne({
  //     FCID,
  //     DMID,
  //   })
  //   if (!dan) return null
  //   return dan
  // }
  async getDan(oid: string) {
    const dan = await this.danmakuModel.findById(IdPrefixPreHandlers.dm(oid))
    if (!dan) throw new NotFoundException('未找到该弹幕')
    // if (!dan) return null
    return dan
  }
  // async hasDan(FCID: string, DMID: string) {
  //   return !!(await this.getDan(FCID, DMID))?.DMID
  // }

  async listDan({
    ID,
    seg = 0,
  }: {
    ID: string
    // EPID?: string
    // SOID?: string
    seg?: number
  }) {
    const id = checkID(ID, ['ep', 'so']),
      EPID: string | undefined = id.type === 'ep' ? id.id : undefined,
      SOID: string | undefined = id.type === 'so' ? id.id : undefined
    if (seg && (seg < 0 || !isInt(seg)))
      throw new BadRequestException('seg应为自然数')
    let query: object = { EPID, SOID, attr: { $not: { $in: ['Hide'] } } }, //TODO undefined测试是否符合预期ID结果
      pool1Query: object = {
        ...query,
        pool: UniDMTools.Pools.Sub,
        attr: { $not: { $in: ['Hide'] } },
      }
    if (seg > 0) {
      const progress = {
        $gte: (seg - 1) * 6 * 60,
        $lt: seg * 6 * 60,
      }
      query = { ...query, progress }
      pool1Query = { ...pool1Query, progress }
    }
    const pool1Dans = await this.danmakuModel
        .find(IdPrefixPreHandler(pool1Query))
        .sort({ ctime: -1, progress: 1 }),
      dans = await this.danmakuModel
        .find(IdPrefixPreHandler(query))
        .sort({ ctime: -1, progress: 1 })
        .limit(3000)
    // .lean({ virtuals: true })
    return new UniPoolExt([...this.fmt2Uni(dans), ...this.fmt2Uni(pool1Dans)])
  }
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

  // async preDan(FCID: string, authn: AuthnModel, sub = false) {
  async preDan(
    ID: string,
    addons: { [key: string]: boolean } = { danmakuConf: false },
  ) {
    // const authn = this.currentAuthn
    // if (!authn.sid) throw new BadRequestException('未登录')
    // const meta = await this.metaService.getMeta(FCID)
    const id = checkID(ID, ['ep', 'so'])
    const so =
      id.type === 'so' ? await this.metaSourceService.getSo(ID) : undefined
    if (id.type === 'so' && !so) throw new NotFoundException('未找到该弹幕库')
    // if (await this.metaService.isScopeAdmin(meta, authn)) authn.pass = true
    const baseConf = await this.configService.get('base')
    const IDs = {
      EPID: id.type === 'ep' ? id.id : so!.EPID, // id为so(及非ep)时，上方已获取so
      SOID: id.type === 'so' ? id.id : 'default',
    }
    return {
      // authn,
      ID: IDs,
      meta: await this.metaService.getEp(IDs.EPID),
      so,
      baseConf,
      suffix: `@${baseConf.domain}`,
      danmakuConf: addons.danmakuConf
        ? await this.configService.get('danmaku')
        : this.configService.defaultConfig.danmaku,
    }
  }
  // // async canEdit(FCID: string, ctx: FastifyBizRequest)
  async isSender(dan: DanmakuDocument | string) {
    dan = await this.toDanmakuDocument(dan)
    const authn = this.currentAuthn
    if (dan.senderID === authn.sid) return true
    else return false
  }
  async canEditDm(dan: DanmakuDocument | string) {
    dan = await this.toDanmakuDocument(dan)
    return (
      (await this.isSender(dan)) ||
      (await this.metaService.isMaintainer(dan.EPID))
    )
  }

  async sendDan(dan: DanmakuFullDto, meta: MetaDocument) {
    if (meta.duration && dan.progress > meta.duration)
      throw new BadRequestException('弹幕时间超出视频长度')
    // const ctime = UniDM.transCtime(new Date())
    // DMID = createDMID(dan.content, dan.senderID, ctime)
    // const newDan = await this.danmakuModel.create({ ...dan, ctime })
    const newUniDM = UniDM.create(dan)
    newUniDM.attr.push('Unchecked')
    const newDan = await this.danmakuModel.create(IdPrefixPreHandler(newUniDM))
    // console.log(newDan._id)
    return this.fmtSingleDan(newDan)
  }

  async delDan(DMID: string, OnFail?: 'addHideAttr', internalMode?: boolean) {
    const dan = await this.getDan(DMID)
    if (!dan) throw new NotFoundException('未找到该弹幕')
    if (internalMode || (await this.canEditDm(dan))) {
      // const pre = await this.preDan(ID, { danmakuConf: true })
      const danmakuConf = await this.configService.get('danmaku')
      if (
        Date.now() <=
        new Date(dan.ctime).getTime() + danmakuConf.inBufferTime
      ) {
        const res = await dan.deleteOne()
        if (res.acknowledged) return 'OK'
        else throw new BadRequestException('弹幕删除失败')
      } else {
        if (OnFail === 'addHideAttr') await this.setDanProp(dan.id, ['Hide'])
        throw new ForbiddenException('弹幕已从缓冲区入库(超出弹幕可操作时间)')
      }
    } else throw new ForbiddenException('无删除权限')
  }
  // async delDanById(oid: ObjectId | string) {
  //   return this.danmakuModel.findByIdAndDelete(oid)
  // }
  /**
   * EPID + 'ep' = 该剧集所有弹幕
   * EPID + 'so' = 该剧集的'default'资源所有弹幕
   * SOID + 'so' = 该资源所有弹幕
   */
  async delAllDan(ID: string, layer: 'ep' | 'so' = 'so') {
    const id = checkID(ID, ['ep', 'so'])
    if (id.type === 'ep') {
      const res = await this.danmakuModel.deleteMany(
        layer === 'ep'
          ? IdPrefixPreHandler({ EPID: id.id })
          : IdPrefixPreHandler({ EPID: id.id, SOID: 'default' }),
      )
      if (res.acknowledged) return 'OK'
    } else if (id.type === 'so') {
      const res = await this.danmakuModel.deleteMany(
        IdPrefixPreHandler({ SOID: id.id }),
      )
      if (res.acknowledged) return 'OK'
    } else throw new BadRequestException('ID格式错误(无"ep_"或"so_"标识前缀)')
    throw new BadRequestException('弹幕删除失败')
  }

  async setDanProp(
    oid: string,
    prop: UniDMTools.DMAttr[],
    rm: boolean = false,
  ) {
    oid = IdPrefixPreHandlers.dm(oid)
    if (rm)
      return this.danmakuModel.findByIdAndUpdate(oid, {
        $pull: { attr: { $in: prop } },
      })
    else
      return this.danmakuModel.findByIdAndUpdate(oid, {
        $addToSet: { attr: { $each: prop } },
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
