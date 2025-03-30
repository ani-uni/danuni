import { Global, Module } from '@nestjs/common'

// import { AuthnModule } from '../authn/auth.module'
import { DanmakuController } from './danmaku.controller'
import { DanmakuEService } from './danmaku.e.service'
import { DanmakuService } from './danmaku.service'
import { DanmakuEventService } from './event.service'

@Global()
@Module({
  controllers: [DanmakuController],
  providers: [DanmakuService, DanmakuEService, DanmakuEventService],
  // providers: [
  //   {
  //     provide: DanmakuService,
  //     useFactory: () => forwardRef(() => DanmakuService),
  //   },
  //   {
  //     provide: DanmakuEventService,
  //     useFactory: () => forwardRef(() => DanmakuEventService),
  //   },
  // ],
  // imports: [forwardRef(() => AuthnModule)],
  exports: [DanmakuService, DanmakuEService, DanmakuEventService],
})
export class DanmakuModule {}
