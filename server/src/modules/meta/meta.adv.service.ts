import {
  BadRequestException,
  // ForbiddenException,
  Injectable,
  Logger,
  // UnprocessableEntityException,
} from '@nestjs/common'

import { InjectModel } from '~/transformers/model.transformer'
import { IdPrefixPreHandler } from '~/utils/id-prefix.util'

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
  async delMeta(EPID: string) {
    await this.metaService.canEditEp(EPID, true)
    const res = await this.danmakuService.model.deleteOne(
      IdPrefixPreHandler({ EPID }),
    )
    if (res.acknowledged) return 'OK'
    else throw new BadRequestException('剧集删除失败')
  }
}
