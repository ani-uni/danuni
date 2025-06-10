import { Global, Module } from '@nestjs/common'

// import { AuthnModule } from '../authn/auth.module'
import { DanmakuController } from './danmaku.controller'
import { DanmakuSendService } from './danmaku.send.service'
import { DanmakuService } from './danmaku.service'
import { DanmakuEventController } from './event.controller'
import { DanmakuEventService } from './event.service'

@Global()
@Module({
  controllers: [DanmakuController, DanmakuEventController],
  providers: [DanmakuService, DanmakuSendService, DanmakuEventService],
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
  exports: [DanmakuService, DanmakuSendService, DanmakuEventService],
})
export class DanmakuModule {}
