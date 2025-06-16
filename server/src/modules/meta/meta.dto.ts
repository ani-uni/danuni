import { Type } from 'class-transformer'
import {
  ArrayUnique,
  IsBoolean,
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
  @IsNotEmpty({ message: '剧集信息源平台?' })
  @IsEnum(PF.PlatformInfoSource)
  platform: PF.PlatformInfoSource

  @IsNotEmpty({ message: '剧集信息源ID?' })
  @IsString()
  @Length(0, 32)
  id: string
}

export class MetaDto {
  // 不应由body传入
  // @IsString()
  // @IsEmail({ require_tld: false })
  // @IsOptional()
  // // @IsNotEmpty({ message: '弹幕库ID?' })
  // readonly EPID: string

  @IsOptional()
  @IsNumber()
  duration?: number

  // @IsEmail({ require_tld: false })
  // @IsOptional()
  // maintainer?: string

  @IsOptional()
  @IsNonPrimitiveArray()
  @ArrayUnique()
  @ValidateNested({ each: true })
  @Type(() => MetaExternalIdInfoDto)
  externalIds?: MetaExternalIdInfoDto[]

  // @IsBoolean()
  // @IsOptional()
  // pgc?: boolean
}

class MetaImportUnitDto extends MetaDto {
  @IsNotEmpty({ message: '所属剧集?' })
  @IsString()
  @IsEmail({ require_tld: false })
  EPID: string

  @IsOptional()
  @IsEmail({ require_tld: false })
  maintainer?: string

  // @IsOptional()
  @IsNotEmpty({ message: '是否为PGC?' })
  @IsBoolean()
  pgc: boolean
}

export class MetaImportDto {
  @IsNotEmpty({ message: '导入剧集单元?' })
  @IsNonPrimitiveArray()
  @ArrayUnique()
  @ValidateNested({ each: true })
  @Type(() => MetaImportUnitDto)
  units: MetaImportUnitDto[]

  @IsNotEmpty({ message: '是否需要签名批量操作?' })
  @IsBoolean()
  sign: boolean
}

export class MetaBatchDelOrExportDto {
  @IsNotEmpty({ message: '批量删除/导出 的 剧集/资源 单元?' })
  @ArrayUnique()
  @ValidateNested({ each: true })
  @Type(() => String)
  units: string[]
}

class MetaSourceHashDto {
  @IsNotEmpty({ message: 'Hash?' })
  @IsString()
  @Length(5, 128, { message: '请输入正确的Hash(长度错误)' })
  @Matches(
    /^[a-f0-9]{32}$|^[a-f0-9]{40}$|^[a-f0-9]{48}$|^[a-f0-9]{56}$|^[a-f0-9]{64}$|^[a-f0-9]{96}$|^[a-f0-9]{128}$/i,
    { message: '请输入正确的Hash(格式/长度错误)' },
  )
  hash!: string

  @IsNotEmpty({ message: 'Hash算法?' })
  @IsEnum(HashAlgorithm)
  algorithm!: HashAlgorithm

  // @IsNumber()
  // vote: number

  // @IsBoolean()
  // @IsOptional()
  // exact: boolean
}

class MetaExternalIdDanmakuDto {
  @IsNotEmpty({ message: '资源弹幕源平台?' })
  @IsIn(PF.PlatformDanmakuSources)
  platform: PF.PlatformDanmakuSource

  @IsNotEmpty({ message: '资源弹幕源ID?' })
  @IsString()
  @Length(0, 256)
  id: string
}

export class MetaSourceDto {
  @IsNotEmpty({ message: '所属剧集?' })
  @IsString()
  @IsEmail({ require_tld: false })
  readonly EPID: string

  // @IsString()
  // @IsEmail({ require_tld: false })
  // @IsOptional()
  // SOID?: string

  @IsOptional()
  @IsString()
  @Length(2, 30)
  subGroup?: string

  @IsOptional()
  @IsNonPrimitiveArray()
  @ArrayUnique()
  @ValidateNested({ each: true })
  @Type(() => MetaSourceHashDto)
  hash?: MetaSourceHashDto[]

  @IsOptional()
  @IsNonPrimitiveArray()
  @ArrayUnique()
  @ValidateNested({ each: true })
  @Type(() => MetaExternalIdDanmakuDto)
  externalIds?: MetaExternalIdDanmakuDto[]
}

class MetaSourceImportUnitDto extends MetaSourceDto {
  @IsNotEmpty({ message: '所属资源?' })
  @IsString()
  @IsEmail({ require_tld: false })
  SOID: string
}

export class MetaSourceImportDto {
  @IsNotEmpty({ message: '导入资源单元?' })
  @IsNonPrimitiveArray()
  @ArrayUnique()
  @ValidateNested({ each: true })
  @Type(() => MetaSourceImportUnitDto)
  units: MetaSourceImportUnitDto[]

  @IsNotEmpty({ message: '是否需要签名批量操作?' })
  @IsBoolean()
  sign: boolean
}

export class MetaTransferDto {
  @IsNotEmpty({ message: '所属剧集?' })
  @IsString()
  @IsEmail({ require_tld: false })
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
