import { zstdCompressSync, zstdDecompressSync } from 'node:zlib'
import { jwtVerify, SignJWT } from 'jose'
import { AnyBulkWriteOperation } from 'mongoose'
import { nanoid } from 'nanoid'
import type { MetaDocument } from './meta.model'

import { platform as PF } from '@dan-uni/dan-any'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { ReturnModelType } from '@typegoose/typegoose'

import { SECURITY } from '~/app.config'
import { RequestContext } from '~/common/contexts/request.context'
import { META_SOURCE_COLLECTION_NAME } from '~/constants/db.constant'
import { InjectModel } from '~/transformers/model.transformer'
import { NotInScopeException } from '~/utils/custom-request-exception'
import { IdPrefixPreHandler, IdPrefixPreHandlers } from '~/utils/id-prefix.util'
import { difference } from '~/utils/set.util'

import { ConfigsService } from '../configs/configs.service'
import { MetaModel } from './meta.model'
import { MetaSourceDocument } from './source.model'

@Injectable()
export class MetaService {
  private Logger = new Logger(MetaService.name)
  constructor(
    @InjectModel(MetaModel)
    private readonly metaModel: ReturnModelType<typeof MetaModel>,
    private readonly configService: ConfigsService,
  ) {}
  public get model() {
    return this.metaModel
  }

  get currentAuthn() {
    return RequestContext.currentAuthn()
  }

  async getEp(EPID: string, aggregateSOID?: boolean) {
    const ep = aggregateSOID
      ? ((
          await this.model.aggregate([
            {
              $lookup: {
                from: META_SOURCE_COLLECTION_NAME,
                localField: 'EPID',
                foreignField: 'EPID',
                as: 'sources',
              },
            },
            { $match: IdPrefixPreHandler({ EPID }) },
          ])
        )[0] as MetaDocument & { sources: MetaSourceDocument[] }) || null
      : await this.model.findOne(IdPrefixPreHandler({ EPID }))
    if (!ep) throw new NotFoundException('未找到该剧集')
    // return this.modelPostHook(ep)
    return ep
  }

  async findEp(id: string, platform?: PF.PlatformInfoSource) {
    const ep = await this.model.findOne(
      IdPrefixPreHandler({
        'externalIds.platform': platform,
        'externalIds.id': id,
      }),
    )
    if (!ep) throw new NotFoundException('未找到该剧集')
    // return this.modelPostHook(ep)
    return ep
  }

  async hasEp(data: Partial<MetaModel>) {
    if (data.EPID)
      return !!(await this.model.findOne(
        IdPrefixPreHandler({ EPID: data.EPID }),
      ))
    if (data.externalIds && data.externalIds.length > 0)
      return !!(await this.model.findOne(
        IdPrefixPreHandler({
          externalIds: { $in: data.externalIds },
        }),
      ))
    return false
  }

  async isMaintainer(ep: string | MetaDocument, throwError?: boolean) {
    const epReal = typeof ep === 'string' ? await this.getEp(ep) : ep
    // if (!epReal) throw new NotFoundException('未找到该剧集')
    if (epReal.maintainer === this.currentAuthn.sid) return true

    if (throwError) throw new ForbiddenException('您不是该剧集的维护者')
    else return false
  }

  async preMeta(addons: { [key: string]: boolean } = { metaConf: false }) {
    const baseConf = await this.configService.get('base'), //记得初始化domain
      suffix = `@${baseConf.domain}`,
      metaConf = addons.metaConf
        ? await this.configService.get('meta')
        : this.configService.defaultConfig.meta
    return { baseConf, suffix, metaConf }
  }

  async createEp(data: Partial<MetaModel>) {
    // controller API 默认传入无EPID，则hasEp无需检测
    // 若其它接口传入EPID(创建指定EP)，则hasEp检测是否存在该ID
    const has = await this.hasEp(data)
    if (has) throw new ConflictException('已存在相同剧集')

    const pre = await this.preMeta({ metaConf: false }),
      EPID = data.EPID || `${nanoid()}${pre.suffix}`,
      maintainer = this.currentAuthn.sid
    // if (data.externalIds && data.externalIds.length > 0) data.pgc = true
    const ep = await this.model.create(
      IdPrefixPreHandler({
        ...data,
        EPID,
        maintainer,
        pgc: data.externalIds && data.externalIds.length > 0 ? true : false,
      }),
    )
    // if (ep.EPID) return this.modelPostHook(ep)
    if (ep.EPID) return ep
    else throw new BadRequestException('剧集创建失败')
  }

  async transferEp(EPID: string, sid: string) {
    const ep = await this.getEp(EPID)
    if (!ep) throw new NotFoundException('未找到该剧集')
    await this.isMaintainer(ep, true)

    if (ep.maintainer === sid)
      throw new BadRequestException('剧集编辑失败(不能将维护者权限转移给自己)')
    // TODO 检测sid是否对应某个用户
    // const user = await this.authService.authInstancePublic.api.
    // if (!user) throw new NotFoundException('未找到该用户')
    ep.maintainer = sid
    await ep.save().catch(() => {
      throw new BadRequestException('剧集编辑失败(维护者权限转移失败)')
    })
    return 'OK'
  }

  async canEditEp(ep: string | MetaDocument, throwError?: boolean) {
    const epReal = typeof ep === 'string' ? await this.getEp(ep) : ep
    if (!epReal) throw new NotFoundException('未找到该剧集')

    const isMaintainer = await this.isMaintainer(epReal)
    if (!isMaintainer) {
      // private强制要求maintainer
      if (!epReal.pgc)
        if (throwError) throw new ForbiddenException('您不是该剧集的维护者')
        else return false
      // pgc 要求maintainer或pass
      else if (!this.currentAuthn.pass)
        if (throwError)
          throw new NotInScopeException(
            this.currentAuthn.no_pass_scopes,
            this.currentAuthn.scopes,
          )
        else return false
    }
    return true
  }

  async editEp(data: Partial<MetaModel> & { EPID: string }) {
    // await this.canEditEp(data.EPID, true) // canEditEp会检测是否有该剧集
    const hasEPID = data.EPID ? await this.getEp(data.EPID) : false
    if (!hasEPID) throw new NotFoundException('未找到该剧集')
    await this.canEditEp(hasEPID, true)
    const hasConflictInfo = await this.hasEp({ ...data, EPID: undefined })
    if (hasConflictInfo) throw new ConflictException('已存在相同剧集信息')

    if (!data.externalIds || data.externalIds.length === 0) data.pgc = false

    const ep = await this.model.updateOne(
      IdPrefixPreHandler({ EPID: data.EPID }),
      IdPrefixPreHandler({ ...hasEPID.toJSON(), ...data }),
    )
    if (ep.acknowledged) return 'OK'
    else throw new BadRequestException('剧集编辑失败')
  }

  async delEp(EPID: string) {
    // TODO: 记得删下级So和弹幕
    const hasEPID = await this.getEp(EPID)
    if (!hasEPID) throw new NotFoundException('未找到该剧集')
    await this.isMaintainer(hasEPID, true)
    const ep = await this.model.deleteOne(IdPrefixPreHandler({ EPID }))
    if (ep.acknowledged) return 'OK'
    else throw new BadRequestException('剧集删除失败')
  }

  async diffEp(data: Omit<MetaModel, 'id'>[], sign = false) {
    data = data.map(IdPrefixPreHandler) as Omit<MetaModel, 'id'>[]
    const inEPID = data.map((d) => d.EPID)
    const existingEp = await this.model
      .find({ EPID: { $in: inEPID } })
      .lean({ virtuals: true })
    const existingEpMap = new Map(existingEp.map((d) => [d.EPID, d]))

    const newItems: Omit<MetaModel, 'id'>[] = [],
      updatedItems: {
        updatedFields: (keyof MetaModel)[]
        newData: Omit<MetaModel, 'id'>
      }[] = [],
      duplicatedEPID: string[] = [],
      bulkOperations: AnyBulkWriteOperation[] = []
    for (const d of data) {
      const existingDoc = existingEpMap.get(d.EPID)
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
        const updatedFields: (keyof MetaModel)[] = []
        let isModified = false
        // 比较每个 key (除了 _id)
        for (const key in d) {
          if (key !== '_id' && d[key] !== existingDoc[key]) {
            updatedFields.push(key as keyof MetaModel)
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
                filter: { EPID: d.EPID },
                update: { $set: d }, // 使用 $set 更新整个文档
              },
            })
        } else duplicatedEPID.push(d.EPID)
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
      duplicated: duplicatedEPID,
      jwt,
    }
  }

  async batchDelEp(EPID: string[], sign = false) {
    const existingEPID = await this.model
      .find({ EPID }, { EPID: 1 })
      .lean({ virtuals: true })
    const inEPIDSet = new Set(EPID),
      existingEPIDSet = new Set(existingEPID.map((d) => d.EPID)),
      missingEPIDSet = difference(inEPIDSet, existingEPIDSet)
    // const bulkOperations: AnyBulkWriteOperation[] = existingEPID.map((d) => ({
    //   deleteOne: {
    //     filter: { EPID: d.EPID },
    //   },
    // }))
    const bulkOperations: AnyBulkWriteOperation[] = [
      {
        deleteMany: {
          filter: { EPID: { $in: existingEPID } },
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
      missing: Array.from(missingEPIDSet),
      jwt,
    }
  }

  async importEp(jwt: string) {
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
      // console.log('正在执行批量写入...')
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
      // console.log('批量写入结果:', result)
      return 'OK'
    } else throw new BadRequestException('jwt 验证失败')
  }

  async exportEp(EPID: string[]) {
    EPID = EPID.map(IdPrefixPreHandlers.ep)
    const existingEp = await this.model
      .find({ EPID: { $in: EPID } })
      .lean({ virtuals: true })
    const existingEPID = existingEp.map((d) => d.EPID)
    return {
      existing: existingEp,
      missing: EPID.filter((id) => !existingEPID.includes(id)),
    }
  }
}
