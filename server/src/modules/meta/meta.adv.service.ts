import {
  ForbiddenException,
  // ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  // UnprocessableEntityException,
} from '@nestjs/common'

import { AuthnModel } from '~/constants/authn.constant'
import { InjectModel } from '~/transformers/model.transformer'

import { DanmakuEService } from '../danmaku/danmaku.e.service'
import { MetaModel } from './meta.model'
import { MetaService } from './meta.service'

@Injectable()
export class MetaAdvService {
  private Logger = new Logger(MetaAdvService.name)
  constructor(
    @InjectModel(MetaModel)
    private readonly metaService: MetaService,
    private readonly danmakuService: DanmakuEService,
  ) {}
  // async delMeta(FCID: string, ctx: FastifyBizRequest) {
  async delMeta(FCID: string, authn: AuthnModel) {
    const meta = await this.metaService.getMeta(FCID)
    if (!meta) throw new NotFoundException('未找到该弹幕库')
    if (!authn.pass && !(await this.metaService.isScopeAdmin(meta, authn)))
      throw new ForbiddenException('无删除权限')
    this.danmakuService.delAllDanByFCID(FCID)
    return this.metaService.model.deleteOne({ FCID })
  }
}
