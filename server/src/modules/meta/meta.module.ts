import { Global, Module } from '@nestjs/common'

import { MetaAdvService } from './meta.adv.service'
import { MetaController } from './meta.controller'
import { MetaService } from './meta.service'
import { MetaSourceService } from './source.service'

@Global()
@Module({
  controllers: [MetaController],
  providers: [MetaService, MetaAdvService, MetaSourceService],
  exports: [MetaService, MetaAdvService, MetaSourceService],
})
export class MetaModule {}
