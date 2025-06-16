// import { compareSync } from 'bcryptjs'
import { zstdCompressSync, zstdDecompressSync } from 'node:zlib'
import { isInt } from 'class-validator'
import { jwtVerify, SignJWT } from 'jose'
import { AnyBulkWriteOperation } from 'mongoose'
import type { DanmakuDocument } from './danmaku.model'

// import {
//   Extra,
//   ExtraDanUni,
//   Modes,
//   Pools,
//   UniDM,
// } from '@dan-uni/dan-any/src/utils/dm-gen'
import { UniDM, UniDMTools, UniPool } from '@dan-uni/dan-any'
import { DMAttr } from '@dan-uni/dan-any/dist/src/utils/dm-gen'
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

import { SECURITY } from '~/app.config'
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
import { difference } from '~/utils/set.util'

// import { LevelLowException } from '~/utils/custom-request-exception'

import { ConfigsService } from '../configs/configs.service'
import { MetaDocument } from '../meta/meta.model'
import { MetaService } from '../meta/meta.service'
import { MetaSourceService } from '../meta/source.service'
import { DanmakuFullDto } from './danmaku.dto'
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
      IdPrefixPostHandlers.ep(dan.SOID),
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
    let query: object = {
        EPID,
        SOID,
        attr: { $not: { $in: ['Hide'] satisfies DMAttr[] } },
      }, //TODO undefined测试是否符合预期ID结果
      pool1Query: object = {
        ...query,
        pool: UniDMTools.Pools.Sub,
        attr: { $not: { $in: ['Hide'] satisfies DMAttr[] } },
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

  async preDan(
    SOID: string,
    addons: { [key: string]: boolean } = { danmakuConf: false },
  ) {
    const id = checkID(SOID, ['so'])
    const so = await this.metaSourceService.getSo(id.id)
    if (!so) throw new NotFoundException('未找到该弹幕库')
    const baseConf = await this.configService.get('base')
    const IDs = {
      EPID: so.EPID,
      SOID: id.id,
    }
    return {
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
      (await this.metaSourceService.isMaintainer(dan.SOID, true))
    )
  }

  async sendDan(dan: DanmakuFullDto, meta: MetaDocument) {
    if (meta.duration && dan.progress > meta.duration)
      throw new BadRequestException('弹幕时间超出视频长度')
    const newUniDM = UniDM.create(dan)
    newUniDM.attr.push('Unchecked')
    const newDan = await this.danmakuModel.create(IdPrefixPreHandler(newUniDM))
    return this.fmtSingleDan(newDan)
  }

  async delDan(DMID: string, OnFail?: 'addHideAttr', internalMode?: boolean) {
    const dan = await this.getDan(DMID)
    if (!dan) throw new NotFoundException('未找到该弹幕')
    if (internalMode || (await this.canEditDm(dan))) {
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
  async delAllDan(ID: string) {
    const id = checkID(ID, ['so'])
    const res = await this.danmakuModel.deleteMany(
      IdPrefixPreHandler({ SOID: id.id }),
    )
    if (res.acknowledged) return 'OK'
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

  async diffDan(data: Omit<DanmakuModel, 'id'>[], sign = false) {
    data = data.map(IdPrefixPreHandler) as Omit<DanmakuModel, 'id'>[]
    const inDMID = data.map((d) => d.DMID)
    const existingDan = await this.model
      .find({ DMID: { $in: inDMID } })
      .lean({ virtuals: true })
    const existingDanMap = new Map(existingDan.map((d) => [d.DMID, d]))

    const newItems: Omit<DanmakuModel, 'id'>[] = [],
      updatedItems: {
        updatedFields: (keyof DanmakuModel)[]
        newData: Omit<DanmakuModel, 'id'>
      }[] = [],
      duplicatedDMID: string[] = [],
      bulkOperations: AnyBulkWriteOperation[] = []
    for (const d of data) {
      const existingDoc = existingDanMap.get(d.DMID)
      // 新增项
      if (!existingDoc) {
        newItems.push(d)
        if (sign)
          bulkOperations.push({
            insertOne: {
              document: d,
            },
          })
      } else {
        // 已存在，比较字段以确定是否更新
        const updatedFields: (keyof DanmakuModel)[] = []
        let isModified = false
        // 比较每个 key (除了 _id)
        for (const key in d) {
          if (key !== '_id' && d[key] !== existingDoc[key]) {
            updatedFields.push(key as keyof DanmakuModel)
            isModified = true
          }
        }
        if (isModified) {
          updatedItems.push({
            updatedFields,
            newData: d,
          })
          if (sign)
            bulkOperations.push({
              updateOne: {
                filter: { DMID: d.DMID },
                update: { $set: d }, // 使用 $set 更新整个文档
              },
            })
        } else duplicatedDMID.push(d.DMID)
      }
    }
    let jwt: string | undefined = undefined
    if (sign)
      jwt = await new SignJWT({
        bulkOperations: zstdCompressSync(
          Buffer.from(JSON.stringify(bulkOperations)),
        ).toString('utf-8'),
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(Math.floor(Date.now() / 1000) + 10)
        .sign(new TextEncoder().encode(SECURITY.jwtSecret))
    return {
      new: newItems,
      updated: updatedItems,
      duplicated: duplicatedDMID,
      jwt,
    }
  }

  async batchDelDan(DMID: string[], sign = false) {
    const existingDMID = await this.model
      .find({ DMID }, { DMID: 1 })
      .lean({ virtuals: true })
    const inDMIDSet = new Set(DMID),
      existingDMIDSet = new Set(existingDMID.map((d) => d.DMID)),
      missingDMIDSet = difference(inDMIDSet, existingDMIDSet)
    const bulkOperations: AnyBulkWriteOperation[] = [
      {
        deleteMany: {
          filter: { DMID: { $in: existingDMID } },
        },
      },
    ]
    let jwt: string | undefined = undefined
    if (sign)
      jwt = await new SignJWT({
        bulkOperations: zstdCompressSync(
          Buffer.from(JSON.stringify(bulkOperations)),
        ).toString('utf-8'),
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(Math.floor(Date.now() / 1000) + 10)
        .sign(new TextEncoder().encode(SECURITY.jwtSecret))
    return {
      missing: Array.from(missingDMIDSet),
      jwt,
    }
  }

  async importDan(jwt: string) {
    const decoded = await jwtVerify(
      jwt,
      new TextEncoder().encode(SECURITY.jwtSecret),
    ).catch(() => {
      throw new BadRequestException('jwt 验证失败')
    })
    const bulkOperations = JSON.safeParse(
      zstdDecompressSync(
        Buffer.from(decoded.payload.bulkOperations as string),
      ).toString('utf-8'),
    )
    if (bulkOperations && bulkOperations.length > 0) {
      const session = await this.model.db.startSession()
      await session
        .withTransaction(async (currentSession) => {
          await this.model.bulkWrite(bulkOperations, {
            ordered: false,
            session: currentSession,
          })
        })
        .catch(() => {
          throw new BadRequestException('导入失败，操作已回滚')
        })
        .finally(async () => await session.endSession())
      return 'OK'
    } else throw new BadRequestException('jwt 验证失败')
  }

  async exportDan(SOID: string[]) {
    SOID = SOID.map(IdPrefixPreHandlers.so)
    const conf = await this.configService.get('danmaku')
    const existingDan = await this.model
      .find({
        SOID: { $in: SOID },
        ctime: { $lt: Date.now() - conf.inBufferTime },
      })
      .lean({ virtuals: true })
    const existingSOID = new Set()
    existingDan.forEach((dan) => existingSOID.add(dan.SOID))
    return {
      existing: existingDan,
      missing: SOID.filter((id) => !existingSOID.has(id)),
    }
  }
}
