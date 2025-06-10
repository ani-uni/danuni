import { Global, Module } from '@nestjs/common'

import { MetaAdvService } from './meta.adv.service'
// import { AuthnModule } from '../authn/auth.module'
import { MetaController } from './meta.controller'
import { MetaService } from './meta.service'
import { MetaSourceService } from './source.service'

@Global()
@Module({
  controllers: [MetaController],
  providers: [MetaService, MetaAdvService, MetaSourceService],
  // imports: [forwardRef(() => AuthnModule)],
  exports: [MetaService, MetaAdvService, MetaSourceService],
})
export class MetaModule {}
