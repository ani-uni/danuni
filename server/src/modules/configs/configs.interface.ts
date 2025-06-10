import { Type } from 'class-transformer'
import { ValidateNested } from 'class-validator'
import { JSONSchema } from 'class-validator-jsonschema'
import type {
  ClassConstructor,
  TypeHelpOptions,
  TypeOptions,
} from 'class-transformer'

import {
  BaseDto,
  BotAuthDto,
  DanmakuDto,
  DanmakuEventDto,
  MetaDto,
  Oauth2Dto,
  ScopeDto,
} from './configs.dto'

export const configDtoMapping = {} as Record<string, ClassConstructor<any>>
const ConfigField =
  (typeFunction: (type?: TypeHelpOptions) => Function, options?: TypeOptions) =>
  (target: any, propertyName: string): void => {
    configDtoMapping[propertyName] = typeFunction() as ClassConstructor<any>
    Type(typeFunction, options)(target, propertyName)
    ValidateNested()(target, propertyName)
  }
@JSONSchema({
  title: '设置',
  ps: ['* 敏感字段不显示，后端默认不返回敏感字段，显示为空'],
})
export abstract class IConfig {
  @ConfigField(() => Oauth2Dto)
  oauth2: Oauth2Dto

  @ConfigField(() => BotAuthDto)
  botAuth: BotAuthDto

  @ConfigField(() => BaseDto)
  base: BaseDto

  @ConfigField(() => ScopeDto)
  scope: ScopeDto

  @ConfigField(() => MetaDto)
  meta: MetaDto

  @ConfigField(() => DanmakuDto)
  danmaku: DanmakuDto

  @ConfigField(() => DanmakuEventDto)
  danmakuEvent: DanmakuEventDto
}

export type IConfigKeys = keyof IConfig
