// import { compareSync } from 'bcryptjs'
import { zstdCompressSync, zstdDecompressSync } from 'node:zlib'
import { arrayNotEmpty, isInt } from 'class-validator'
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
    return UniDM.create({
      ...dan.toJSON(),
      SOID: IdPrefixPostHandlers.so(dan.SOID),
      ctime: new Date(dan.ctime),
      DMID: IdPrefixPostHandlers.dm(dan.DMID),
    })
    // return new UniDM(
    //   IdPrefixPostHandlers.ep(dan.SOID),
    //   dan.progress,
    //   dan.mode,
    //   dan.fontsize,
    //   dan.color,
    //   dan.senderID,
    //   dan.content,
    //   new Date(dan.ctime),
    //   dan.weight,
    //   dan.pool,
    //   dan.attr,
    //   dan.platform,
    //   dan.extraStr,
    //   IdPrefixPostHandlers.dm(dan.DMID),
    // )
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
  async getDan(oid: string, checkHide?: boolean) {
    const dan = await this.danmakuModel.findOne({
      DMID: IdPrefixPreHandlers.dm(oid),
    })
    if (!dan) throw new NotFoundException('未找到该弹幕')
    if (dan.attr?.includes(UniDMTools.DMAttr.Hide) && !checkHide)
      throw new ForbiddenException('该弹幕已被删除/隐藏')
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
    const id = checkID(ID, ['ep', 'so'])
    if (seg && (seg < 0 || !isInt(seg)))
      throw new BadRequestException('seg应为自然数')
    let query: any = {
        SOID:
          id.type === 'so'
            ? id.id
            : { $in: await this.metaSourceService.listEpContainedSo(id.id) },
        attr: {
          $not: { $in: [UniDMTools.DMAttr.Hide] satisfies UniDMTools.DMAttr[] },
        },
      }, //TODO undefined测试是否符合预期ID结果
      pool1Query: any = {
        ...query,
        pool: UniDMTools.Pools.Sub,
        attr: {
          $not: { $in: [UniDMTools.DMAttr.Hide] satisfies UniDMTools.DMAttr[] },
        },
      }
    if (seg > 0) {
      const progress = {
        $gte: (seg - 1) * 6 * 60,
        $lt: seg * 6 * 60,
      }
      query = { ...query, progress }
      pool1Query = { ...pool1Query, progress }
    }
    if (id.type === 'ep') {
      pool1Query.SOID.$in = pool1Query.SOID.$in.map(IdPrefixPreHandlers.so)
      query.SOID.$in = query.SOID.$in.map(IdPrefixPreHandlers.so)
    }
    const pool1Dans = await this.danmakuModel
        .find(pool1Query)
        .sort({ ctime: -1, progress: 1, weight: -1 }),
      dans = await this.danmakuModel
        .find(query)
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
    const newUniDM = UniDM.create(dan, { dmid: 64 })
    newUniDM.attr.push(UniDMTools.DMAttr.Unchecked)
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
        if (OnFail === 'addHideAttr') {
          const res = await this.setDanProp(dan.DMID, [UniDMTools.DMAttr.Hide])
          if (res?.DMID) return 'OK'
          else throw new BadRequestException('弹幕隐藏失败')
        }
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
    DMID: string,
    prop: UniDMTools.DMAttr[],
    rm: boolean = false,
  ) {
    DMID = IdPrefixPreHandlers.dm(DMID)
    if (rm)
      return this.danmakuModel.findOneAndUpdate(
        { DMID },
        {
          $pull: { attr: { $in: prop } },
        },
      )
    else
      return this.danmakuModel.findOneAndUpdate(
        { DMID },
        {
          $addToSet: { attr: { $each: prop } },
        },
      )
  }

  async diffDan(
    input: (Omit<DanmakuModel, '_id' | 'DMID'> & { oriDMID?: string })[],
    sign = false,
  ) {
    const data = input.map((d) =>
      UniDM.create(IdPrefixPreHandler(d), { dmid: 64 }),
    )
    const toUpdatedDMID = new Set<string>(),
      newDan = new Set<Omit<DanmakuModel, '_id'>>(),
      inUpdatedDan = new Set<Omit<DanmakuModel, '_id'>>()
    data.forEach((d) => {
      toUpdatedDMID.add(d.DMID!)
      inUpdatedDan.add(d as Omit<DanmakuModel, '_id'>)
    })
    const toUpdatedDan = await this.model
      .find({ DMID: { $in: [...toUpdatedDMID] } })
      .lean({ virtuals: true })
    const toUpdatedDanMap = new Map(toUpdatedDan.map((d) => [d.DMID, d]))

    const updatedItems: {
        updatedFields: (keyof DanmakuModel)[]
        newData: Omit<DanmakuModel, '_id'>
      }[] = [],
      duplicatedDMID: string[] = [],
      bulkOperations: AnyBulkWriteOperation[] = []
    for (const d of inUpdatedDan) {
      const oriDan = toUpdatedDanMap.get(d.DMID)
      if (!oriDan) {
        newDan.add(d)
        if (sign)
          bulkOperations.push({
            insertOne: {
              document: d,
            },
          })
      } else if (d.DMID === oriDan!.DMID) duplicatedDMID.push(oriDan!.DMID)
      else {
        const updatedFields: (keyof DanmakuModel)[] = []
        // 比较每个 key (除了 _id)
        for (const key in d) {
          if (key !== '_id' && key !== 'DMID' && d[key] !== oriDan![key]) {
            updatedFields.push(key as keyof DanmakuModel)
          }
        }
        updatedItems.push({
          updatedFields,
          newData: d,
        })
        if (sign)
          bulkOperations.push({
            updateOne: {
              filter: { DMID: oriDan!.DMID },
              update: { $set: d }, // 使用 $set 更新整个文档
            },
          })
      }
    }
    // for (const d of data) {
    //   if (!d.DMID) throw new BadRequestException('无法计算DMID')
    //   const existingDoc = existingDanMap.get(d.DMID)data
    //   // 新增项
    //   if (!existingDoc) {
    //     newItems.push(
    //       d as UniDM & {
    //         DMID: string
    //         platform: platform.PlatformDanmakuSource
    //       },
    //     )
    //     if (sign)
    //       bulkOperations.push({
    //         insertOne: {
    //           document: d,
    //         },
    //       })
    //   } else {
    //     // 已存在，比较字段以确定是否更新
    //     const updatedFields: (keyof DanmakuModel)[] = []
    //     let isModified = false
    //     // 比较每个 key (除了 _id)
    //     for (const key in d) {
    //       if (key !== '_id' && key !== 'DMID' && d[key] !== existingDoc[key]) {
    //         updatedFields.push(key as keyof DanmakuModel)
    //         isModified = true
    //       }
    //     }
    //     if (isModified) {
    //       updatedItems.push({
    //         updatedFields,
    //         newData: d as UniDM & {
    //           DMID: string
    //           platform: platform.PlatformDanmakuSource
    //         },
    //       })
    //       if (sign)
    //         bulkOperations.push({
    //           updateOne: {
    //             filter: { DMID: d.DMID },
    //             update: { $set: d }, // 使用 $set 更新整个文档
    //           },
    //         })
    //     } else duplicatedDMID.push(d.DMID)
    //   }
    // }
    let jwt: string | undefined = undefined
    if (sign)
      jwt = arrayNotEmpty(bulkOperations)
        ? await new SignJWT({
            bulkOperations: zstdCompressSync(
              Buffer.from(JSON.stringify(bulkOperations)),
            ).toString('base64'),
          })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime(Math.floor(Date.now() / 1000) + 10)
            .sign(new TextEncoder().encode(SECURITY.jwtSecret))
        : undefined
    return {
      new: [...newDan],
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
      jwt = arrayNotEmpty(bulkOperations)
        ? await new SignJWT({
            bulkOperations: zstdCompressSync(
              Buffer.from(JSON.stringify(bulkOperations)),
            ).toString('base64'),
          })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime(Math.floor(Date.now() / 1000) + 10)
            .sign(new TextEncoder().encode(SECURITY.jwtSecret))
        : undefined
    return {
      missing: Array.from(missingDMIDSet),
      jwt,
    }
  }

  async importDan(jwt: string) {
    if (!jwt) throw new BadRequestException('jwt 不能为空')
    const decoded = await jwtVerify(
      jwt,
      new TextEncoder().encode(SECURITY.jwtSecret),
    ).catch(() => {
      throw new BadRequestException('jwt 验证失败')
    })
    const bulkOperations = JSON.safeParse(
      zstdDecompressSync(
        Buffer.from(decoded.payload.bulkOperations as string, 'base64'),
      ).toString('utf-8'),
    )
    if (bulkOperations && bulkOperations.length > 0) {
      // console.log('bulkOperations', bulkOperations[0])
      await this.model.bulkWrite(bulkOperations, { ordered: false })
      // const session = await this.model.db.startSession()
      // await session
      //   .withTransaction(async (currentSession) => {
      //     await this.model.bulkWrite(bulkOperations, {
      //       ordered: false,
      //       session: currentSession,
      //     })
      //   })
      //   .catch((e) => {
      //     throw new BadRequestException('导入失败，操作已回滚' + e)
      //   })
      //   .finally(async () => await session.endSession())
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
