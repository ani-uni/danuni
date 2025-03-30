import { Global, Module } from '@nestjs/common'

import { MetaAdvService } from './meta.adv.service'
// import { AuthnModule } from '../authn/auth.module'
import { MetaController } from './meta.controller'
import { MetaService } from './meta.service'

@Global()
@Module({
  controllers: [MetaController],
  providers: [MetaService, MetaAdvService],
  // imports: [forwardRef(() => AuthnModule)],
  exports: [MetaService, MetaAdvService],
})
export class MetaModule {}
