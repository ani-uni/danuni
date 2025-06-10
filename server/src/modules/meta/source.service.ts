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

import { InjectModel } from '~/transformers/model.transformer'
import { IdPrefixPreHandler } from '~/utils/id-prefix.util'

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

  modelPreHook(source: { EPID?: string; SOID?: string; [key: string]: any }) {
    if (source.EPID) {
      if (source.EPID.startsWith('ep_')) source.EPID = source.EPID.slice(3)
      else if (source.EPID.startsWith('so_') || source.EPID.startsWith('dm_'))
        throw new BadRequestException('EPID must start with "ep_" or "".')
    }
    if (source.SOID) {
      if (source.SOID.startsWith('so_')) source.SOID = source.SOID.slice(3)
      else if (source.SOID.startsWith('ep_') || source.SOID.startsWith('dm_'))
        throw new BadRequestException('SOID must start with "so_" or "".')
    }
    return source
  }
  modelPostHook(source: MetaSourceDocument) {
    if (source.EPID) source.EPID = `ep_${source.EPID}`
    if (source.SOID) source.SOID = `so_${source.SOID}`
    return source
  }
  modelArray(
    source: MetaSourceDocument[],
    cb: (source: MetaSourceDocument) => MetaSourceDocument,
  ) {
    return source.map(cb)
  }

  async getSo(SOID: string) {
    const so = await this.model.findOne(IdPrefixPreHandler({ SOID }))
    // .lean({ virtuals: true })
    if (!so) throw new NotFoundException('未找到该资源')
    return this.modelPostHook(so)
  }

  async findSo(id: string, platform?: PF.PlatformDanmakuSource | 'hash') {
    // const ep = await this.model.findOne({ platform, id })
    if (platform === 'hash') {
      const exact = await this.model.findOne(
        IdPrefixPreHandler({
          'hash.hash': id,
          'hash.exact': true,
        }),
      )
      // .lean({ virtuals: true })
      if (!exact) {
        const similar = await this.model
          .find(
            IdPrefixPreHandler({
              'hash.hash': id,
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
          similar: this.modelArray(similar, this.modelPostHook),
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
      return { exact: this.modelPostHook(so), similar: [] }
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
    if (so.EPID && so.SOID) return this.modelPostHook(so)
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
}
