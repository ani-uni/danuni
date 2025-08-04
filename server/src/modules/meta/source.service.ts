import { zstdCompressSync, zstdDecompressSync } from 'node:zlib'
import { arrayNotEmpty } from 'class-validator'
import { jwtVerify, SignJWT } from 'jose'
import { AnyBulkWriteOperation } from 'mongoose'
import { nanoid } from 'nanoid'

import { platform as PF } from '@dan-uni/dan-any'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { ReturnModelType } from '@typegoose/typegoose'

import { SECURITY } from '~/app.config'
import { InjectModel } from '~/transformers/model.transformer'
import { IdPrefixPreHandler, IdPrefixPreHandlers } from '~/utils/id-prefix.util'
import { difference } from '~/utils/set.util'

import { MetaService } from './meta.service'
import { MetaSourceDocument, MetaSourceModel } from './source.model'

@Injectable()
export class MetaSourceService {
  private Logger = new Logger(MetaSourceService.name)
  constructor(
    @InjectModel(MetaSourceModel)
    private readonly metaSourceModel: ReturnModelType<typeof MetaSourceModel>,
    private readonly metaService: MetaService,
  ) {}
  public get model() {
    return this.metaSourceModel
  }

  async getSo(SOID: string) {
    const so = await this.model.findOne(IdPrefixPreHandler({ SOID }))
    // .lean({ virtuals: true })
    if (!so) throw new NotFoundException('未找到该资源')
    return so
  }

  async listEpContainedSo(EPID: string) {
    const res = await this.model
      .find({ EPID }, { SOID: 1 })
      .lean({ virtuals: true })
    return res.map((i) => i.SOID)
  }

  async findSo(
    id: string,
    platform?: PF.PlatformDanmakuSource | 'hash',
    hashAlg?: string,
  ) {
    // const ep = await this.model.findOne({ platform, id })
    if (platform === 'hash') {
      const exact = await this.model.findOne(
        IdPrefixPreHandler({
          'hash.hash': id,
          'hash.algorithm': hashAlg || undefined,
          'hash.exact': true,
        }),
      )
      // .lean({ virtuals: true })
      if (!exact) {
        const similar = await this.model
          .find(
            IdPrefixPreHandler({
              'hash.hash': id,
              'hash.algorithm': hashAlg || undefined,
              'hash.exact': false,
            }),
          )
          // .sort({ 'hashes.vote': -1 })
          .limit(5)
        // .lean({ virtuals: true })
        if (!similar || similar.length === 0)
          throw new NotFoundException('未找到该资源')
        return {
          exact: null,
          similar,
        }
      }
      return { exact, similar: [] }
    } else {
      const so = await this.model.findOne(
        IdPrefixPreHandler({
          'externalIds.platform': platform,
          'externalIds.id': id,
        }),
      )
      if (!so) throw new NotFoundException('未找到该资源')
      return { exact: so, similar: [] }
    }
  }

  /**
   * @description 传入EPID则检查(标准)，不传入则视为仅检查是否有该单独SOID(孤立So，应删除)
   */
  async hasSo(data: Partial<MetaSourceModel>) {
    // 创建Source需上级Ep
    // if (!data.EPID) return false
    if (data.EPID && !(await this.metaService.hasEp({ EPID: data.EPID })))
      throw new NotFoundException('未找到该剧集')

    if (data.SOID)
      return !!(await this.model.findOne(
        IdPrefixPreHandler({ SOID: data.SOID }),
      ))

    if (data.hash && data.hash.length > 0)
      return !!(await this.model.findOne(
        IdPrefixPreHandler({ hash: { $in: data.hash } }),
      ))
    if (data.externalIds && data.externalIds.length > 0)
      return !!(await this.model.findOne(
        IdPrefixPreHandler({
          externalIds: { $in: data.externalIds },
        }),
      ))
    return false
  }

  async isMaintainer(so: string | MetaSourceDocument, throwError?: boolean) {
    const soReal = typeof so === 'string' ? await this.getSo(so) : so,
      epReal = await this.metaService.getEp(soReal.EPID)
    return this.metaService.isMaintainer(epReal, throwError)
  }

  async createSo(data: Partial<MetaSourceModel> & { EPID: string }) {
    // const ep = await this.metaService.getEp(data.EPID)
    // await this.metaService.canEditEp(ep, true)
    await this.metaService.canEditEp(data.EPID, true)
    const has = await this.hasSo(
      IdPrefixPreHandler({ ...data, EPID: undefined }),
    ) // ep处已检测ep，无需在has处重复检测
    if (has) throw new ConflictException('已存在相同资源')

    const pre = await this.metaService.preMeta({ metaConf: false }),
      SOID = data.SOID || `${nanoid()}${pre.suffix}`
    const so = await this.model.create(
      IdPrefixPreHandler({
        ...data,
        // EPID: ep.EPID,
        SOID,
      }),
    )
    if (so.EPID && so.SOID) return so
    else throw new BadRequestException('资源创建失败')
  }

  async editSo(
    data: Partial<MetaSourceModel> & { EPID: string; SOID: string },
  ) {
    await this.metaService.canEditEp(data.EPID, true)
    const hasSOID = data.SOID ? await this.getSo(data.SOID) : false
    if (!hasSOID) throw new NotFoundException('未找到该资源')
    const hasConflictInfo = await this.hasSo({
      ...data,
      EPID: undefined,
      SOID: undefined,
    })
    if (hasConflictInfo) throw new ConflictException('已存在相同资源信息')

    const so = await this.model.updateOne(
      IdPrefixPreHandler({ EPID: data.EPID }),
      IdPrefixPreHandler({ ...hasSOID.toJSON(), ...data }),
    )
    if (so.acknowledged) return 'OK'
    else throw new BadRequestException('资源编辑失败')
  }

  async delSo(SOID: string) {
    // TODO: 记得删下级弹幕
    const so = await this.getSo(SOID)
    await this.metaService.canEditEp(so.EPID, true)
    const res = await this.model.deleteOne({ SOID })
    if (res.acknowledged) return 'OK'
    else throw new BadRequestException('资源删除失败')
  }

  async diffSo(data: Omit<MetaSourceModel, 'id'>[], sign = false) {
    data = data.map(IdPrefixPreHandler) as Omit<MetaSourceModel, 'id'>[]
    const SOID = data.map((d) => d.SOID)
    const existingSo = await this.model
      .find({ SOID: { $in: SOID } })
      .lean({ virtuals: true })
    const existingSoMap = new Map(existingSo.map((d) => [d.SOID, d]))

    const newItems: Omit<MetaSourceModel, 'id'>[] = [],
      updatedItems: {
        updatedFields: (keyof MetaSourceModel)[]
        newData: Omit<MetaSourceModel, 'id'>
      }[] = [],
      duplicatedSOID: string[] = [],
      bulkOperations: AnyBulkWriteOperation[] = []
    for (const d of data) {
      const existingDoc = existingSoMap.get(d.SOID)
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
        const updatedFields: (keyof MetaSourceModel)[] = []
        let isModified = false
        // 比较每个 key (除了 _id)
        for (const key in d) {
          if (key !== '_id' && d[key] !== existingDoc[key]) {
            updatedFields.push(key as keyof MetaSourceModel)
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
                filter: { SOID: d.SOID },
                update: { $set: d }, // 使用 $set 更新整个文档
              },
            })
        } else duplicatedSOID.push(d.SOID)
      }
    }
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
      new: newItems,
      updated: updatedItems,
      duplicated: duplicatedSOID,
      jwt,
    }
  }

  async batchDelSo(SOID: string[], sign = false) {
    const existingSOID = await this.model
      .find({ SOID }, { SOID: 1 })
      .lean({ virtuals: true })
    const inSOIDSet = new Set(SOID),
      existingSOIDSet = new Set(existingSOID.map((d) => d.SOID)),
      missingSOIDSet = difference(inSOIDSet, existingSOIDSet)
    const bulkOperations: AnyBulkWriteOperation[] = [
      {
        deleteMany: {
          filter: { EPID: { $in: existingSOID } },
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
      missing: Array.from(missingSOIDSet),
      jwt,
    }
  }

  async importSo(jwt: string) {
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
      await this.model.bulkWrite(bulkOperations, { ordered: false })
      return 'OK'
    } else throw new BadRequestException('jwt 验证失败')
  }

  async exportSo(SOID: string[]) {
    SOID = SOID.map(IdPrefixPreHandlers.so)
    const existingSo = await this.model
      .find({ SOID: { $in: SOID } })
      .lean({ virtuals: true })
    const existingSOID = existingSo.map((d) => d.SOID)
    return {
      existing: existingSo,
      missing: SOID.filter((id) => !existingSOID.includes(id)),
    }
  }
}
