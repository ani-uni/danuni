import { Type } from 'class-transformer'
import {
  // IsBoolean,
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

// import type { platfrom } from '@dan-uni/dan-any/src/utils/id-gen'
import { platform as PF } from '@dan-uni/dan-any'

// import { IsAllowedUrl } from '~/decorators/dto/isAllowedUrl'

// class UserOptionDto {
//   @IsOptional()
//   @IsString()
//   @IsNotEmpty()
//   readonly introduce?: string

//   @IsEmail()
//   @IsOptional()
//   readonly mail?: string

//   @IsUrl({ require_protocol: true }, { message: '请更正为正确的网址' })
//   @IsOptional()
//   readonly url?: string

//   @IsString()
//   @IsOptional()
//   name?: string

//   // @IsAllowedUrl()
//   @IsOptional()
//   readonly avatar?: string

//   @IsOptional()
//   @IsObject()
//   readonly socialIds?: Record<string, any>
// }

// class UniNodeDto {
//   @IsString()
//   domain: string

//   @IsString()
//   pub: string
// }

// class thirdPlatformDto {
//   @IsString()
//   platform: platfrom

//   @IsString()
//   id: string
// }

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
