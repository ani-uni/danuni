import { Type } from 'class-transformer'
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator'

import { Scopes } from '~/constants/authn.constant'

export class BotAuthBotUnitDto {
  @IsString()
  @IsNotEmpty({ message: 'BotAuth可用botID' })
  botId: string

  //BotAuth可用权限
  @IsEnum(Scopes, { each: true })
  @IsOptional()
  scopes: Scopes[]

  @IsInt({})
  @IsOptional()
  version: string
}

export class BotAuthUnitDto {
  @IsString()
  @IsNotEmpty({ message: 'BotAuth域' })
  domain: string

  @IsArray()
  @Type(() => BotAuthBotUnitDto)
  @IsNotEmpty({ message: 'BotAuth可用bot列表' })
  bots: BotAuthBotUnitDto[]

  //BotAuth公钥
  @IsString()
  @IsOptional()
  publicKey: string
}
