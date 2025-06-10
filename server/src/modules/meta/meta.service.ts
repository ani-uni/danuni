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

import { RequestContext } from '~/common/contexts/request.context'
import { META_SOURCE_COLLECTION_NAME } from '~/constants/db.constant'
import { InjectModel } from '~/transformers/model.transformer'
import { NotInScopeException } from '~/utils/custom-request-exception'
import { IdPrefixPreHandler } from '~/utils/id-prefix.util'

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
    if (!epReal) throw new NotFoundException('未找到该剧集')
    if (epReal.maintainer === this.currentAuthn.sid) return true

    if (throwError) throw new ForbiddenException('您不是该剧集的维护者')
    else return false
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
    if (!this.isMaintainer(hasEPID))
      throw new ForbiddenException('您不是该剧集的维护者')
    const ep = await this.model.deleteOne(IdPrefixPreHandler({ EPID }))
    if (ep.acknowledged) return 'OK'
    else throw new BadRequestException('剧集删除失败')
  }

  async preMeta(addons: { [key: string]: boolean } = { metaConf: false }) {
    const baseConf = await this.configService.get('base'), //记得初始化domain
      suffix = `@${baseConf.domain}`,
      metaConf = addons.metaConf
        ? await this.configService.get('meta')
        : this.configService.defaultConfig.meta
    return { baseConf, suffix, metaConf }
  }
}
