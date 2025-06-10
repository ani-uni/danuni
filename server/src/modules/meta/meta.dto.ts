import { Type } from 'class-transformer'
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  registerDecorator,
  ValidateNested,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator'

import { platform as PF } from '@dan-uni/dan-any'

import { HashAlgorithm } from './source.constant'

class MetaExternalIdInfoDto {
  @IsEnum(PF.PlatformInfoSource)
  @IsNotEmpty({ message: '剧集信息源平台?' })
  platform: PF.PlatformInfoSource

  @IsString()
  @Length(0, 32)
  @IsNotEmpty({ message: '剧集信息源ID?' })
  id: string
}

export class MetaDto {
  // 不应由body传入
  // @IsString()
  // @IsEmail({ require_tld: false })
  // @IsOptional()
  // // @IsNotEmpty({ message: '弹幕库ID?' })
  // readonly EPID: string

  @IsNumber()
  @IsOptional()
  duration?: number

  // @IsEmail({ require_tld: false })
  // @IsOptional()
  // maintainer?: string

  @ValidateNested({ each: true })
  @IsNonPrimitiveArray()
  @Type(() => MetaExternalIdInfoDto)
  @IsOptional()
  externalIds?: MetaExternalIdInfoDto[]

  // @IsBoolean()
  // @IsOptional()
  // pgc?: boolean
}

class MetaSourceHashDto {
  @IsString()
  @Length(5, 128, { message: '请输入正确的Hash(长度错误)' })
  @Matches(
    /^[a-f0-9]{32}$|^[a-f0-9]{40}$|^[a-f0-9]{48}$|^[a-f0-9]{56}$|^[a-f0-9]{64}$|^[a-f0-9]{96}$|^[a-f0-9]{128}$/i,
    { message: '请输入正确的Hash(格式/长度错误)' },
  )
  @IsNotEmpty({ message: 'Hash?' })
  hash!: string

  @IsEnum(HashAlgorithm)
  @IsNotEmpty({ message: 'Hash算法?' })
  algorithm!: HashAlgorithm

  // @IsNumber()
  // vote: number

  // @IsBoolean()
  // @IsOptional()
  // exact: boolean
}

class MetaExternalIdDanmakuDto {
  @IsIn(PF.PlatformDanmakuSources)
  @IsNotEmpty({ message: '资源弹幕源平台?' })
  platform: PF.PlatformDanmakuSource

  @IsString()
  @Length(0, 256)
  @IsNotEmpty({ message: '资源弹幕源ID?' })
  id: string
}

export class MetaSourceDto {
  @IsString()
  @IsEmail({ require_tld: false })
  @IsNotEmpty({ message: '所属剧集?' })
  readonly EPID: string

  // @IsString()
  // @IsEmail({ require_tld: false })
  // @IsOptional()
  // SOID?: string

  @IsString()
  @Length(2, 30)
  @IsOptional()
  subGroup?: string

  @ValidateNested({ each: true })
  @IsNonPrimitiveArray()
  @Type(() => MetaSourceHashDto)
  @IsOptional()
  hash?: MetaSourceHashDto[]

  @ValidateNested({ each: true })
  @IsNonPrimitiveArray()
  @Type(() => MetaExternalIdDanmakuDto)
  @IsOptional()
  externalIds?: MetaExternalIdDanmakuDto[]
}

export class MetaTransferDto {
  @IsString()
  @IsEmail({ require_tld: false })
  @IsNotEmpty({ message: '所属剧集?' })
  sid: string
}

// 是否为 非基本类型数组 Object[]
export function IsNonPrimitiveArray(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'IsNonPrimitiveArray',
      target: object.constructor,
      propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: any, _args: ValidationArguments) {
          return (
            Array.isArray(value) &&
            value.reduce(
              (a, b) => a && typeof b === 'object' && !Array.isArray(b),
              true,
            )
          )
        },
      },
    })
  }
}
