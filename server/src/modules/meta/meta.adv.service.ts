import {
  BadRequestException,
  // ForbiddenException,
  Injectable,
  Logger,
  // UnprocessableEntityException,
} from '@nestjs/common'

import { InjectModel } from '~/transformers/model.transformer'

import { DanmakuService } from '../danmaku/danmaku.service'
import { MetaModel } from './meta.model'
import { MetaService } from './meta.service'

@Injectable()
export class MetaAdvService {
  private Logger = new Logger(MetaAdvService.name)
  constructor(
    @InjectModel(MetaModel)
    private readonly metaService: MetaService,
    private readonly danmakuService: DanmakuService,
  ) {}
  // async delMeta(FCID: string, ctx: FastifyBizRequest) {
  async delMeta(EPID: string) {
    await this.metaService.canEditEp(EPID, true)
    const res = await this.danmakuService.model.deleteOne(
      this.metaService.modelPreHook({ EPID }),
    )
    if (res.acknowledged) return 'OK'
    else throw new BadRequestException('剧集删除失败')
  }
}
