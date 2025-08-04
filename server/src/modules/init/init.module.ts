import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module'
// import { BackupModule } from '../backup/backup.module'
import { OptionModule } from '../option/option.module'
import { InitController } from './init.controller'
import { InitService } from './init.service'

@Module({
  providers: [InitService],
  exports: [InitService],
  controllers: [InitController],
  imports: [OptionModule, AuthModule],
})
export class InitModule {}
