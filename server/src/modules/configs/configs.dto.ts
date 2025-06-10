import { Exclude, Type } from 'class-transformer'
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsFQDN,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator'
import { JSONSchema } from 'class-validator-jsonschema'

import { Oauth2Provider } from '../auth/auth.constant'
import { Encrypt } from './configs.encrypt.util'
import {
  JSONSchemaArrayField,
  JSONSchemaHalfGirdPlainField,
  JSONSchemaNumberField,
  JSONSchemaPasswordField,
  JSONSchemaPlainField,
  JSONSchemaToggleField,
} from './configs.jsonschema.decorator'

const SecretField = (target: object, propertyKey: string | symbol) => {
  Encrypt(target, propertyKey)
  Exclude({ toPlainOnly: true })(target, propertyKey)
}

@JSONSchema({ title: '基本设置' })
export class BaseDto {
  @IsFQDN()
  @IsNotEmpty()
  @JSONSchemaHalfGirdPlainField('服务API域名')
  domain: string

  @IsString({ message: '标题必须是字符串' })
  @IsNotEmpty({ message: '不能为空!!' })
  @IsOptional()
  @JSONSchemaPlainField('网站标题')
  title: string

  @IsString({ message: '描述信息必须是字符串' })
  @IsNotEmpty({ message: '不能为空!!' })
  @IsOptional()
  @JSONSchemaPlainField('网站描述')
  description: string
}

@JSONSchema({ title: 'Oauth2单元设置' })
export class Oauth2UnitDto {
  @IsString()
  @IsEnum(Oauth2Provider)
  @IsNotEmpty()
  @JSONSchemaPlainField('Ouath2 提供者')
  provider: string

  @IsString()
  @IsNotEmpty()
  @JSONSchemaPlainField('Client ID')
  @SecretField
  clientId: string

  @IsString()
  @IsNotEmpty()
  @JSONSchemaPasswordField('Client Secret')
  @SecretField
  clientSecret: string

  @IsBoolean()
  @IsNotEmpty()
  @JSONSchemaToggleField('是否启用')
  enabled: boolean
}
@JSONSchema({ title: 'Oauth2设置' })
export class Oauth2Dto {
  @IsArray()
  @ArrayUnique()
  @Type(() => Oauth2UnitDto)
  @IsOptional()
  @JSONSchemaArrayField('Oauth2 单元')
  units: Oauth2UnitDto[]
}

@JSONSchema({ title: 'BotAuth单元设置' })
export class BotAuthUnitDto {
  @IsString()
  @IsNotEmpty()
  @JSONSchemaPlainField('BotAuth域')
  domain: string

  @IsString()
  @IsNotEmpty()
  @JSONSchemaPlainField('BotAuth公钥')
  publicKey: string
}
@JSONSchema({ title: 'BotAuth设置' })
export class BotAuthDto {
  @IsArray()
  @ArrayUnique()
  @Type(() => BotAuthUnitDto)
  @IsOptional()
  @JSONSchemaArrayField('BotAuth单元')
  units: BotAuthUnitDto[]
}

@JSONSchema({ title: '元数据设置' })
export class MetaDto {}

@JSONSchema({ title: '权限分配设置' })
export class ScopeDto {
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  @JSONSchemaNumberField('lv1所需注册时长')
  lv1: number

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  @JSONSchemaNumberField('lv2所需注册时长')
  lv2: number

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  @JSONSchemaNumberField('lv3所需注册时长')
  lv3: number

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  @JSONSchemaNumberField('lv4所需注册时长')
  lv4: number

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  @JSONSchemaNumberField('lv5所需注册时长')
  lv5: number

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  @JSONSchemaNumberField('lv6所需注册时长')
  lv6: number
}

@JSONSchema({ title: '弹幕设置' })
export class DanmakuDto {
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  @JSONSchemaNumberField('弹幕处于缓冲区的时间', {
    description:
      '在弹幕发送后该秒数以内，弹幕可被发送者撤回/修改，且不会出现在exportAPI中(不会被备份)',
  })
  inBufferTime: number
}

@JSONSchema({ title: '弹幕事件设置' })
export class DanmakuEventDto {
  @IsInt()
  @Min(3)
  @IsNotEmpty()
  @JSONSchemaNumberField('完成弹幕事件所需人数')
  participantNum: number

  @IsInt()
  @Min(0)
  @Max(100)
  @IsNotEmpty()
  @JSONSchemaNumberField('弹幕事件积极响应的票数占比要求')
  positiveRatio: number

  @IsInt()
  @Min(0)
  @Max(100)
  @IsNotEmpty()
  @JSONSchemaNumberField('弹幕事件消极响应的票数占比要求')
  negativeRatio: number

  @IsInt()
  @Min(0)
  @Max(100)
  @IsNotEmpty()
  @JSONSchemaNumberField('弹幕事件自动删除举报弹幕的票数占比要求')
  autoDelRatio: number
}
