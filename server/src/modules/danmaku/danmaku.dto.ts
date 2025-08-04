import { Type } from 'class-transformer'
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsEmpty,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  registerDecorator,
  ValidateNested,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator'

import { platform, UniDMTools } from '@dan-uni/dan-any'

export class DanmakuDto {
  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty({ message: '弹幕进度?' })
  progress: number

  @IsEnum(UniDMTools.Modes)
  @IsInt()
  // @IsOptional()
  @IsNotEmpty({ message: '弹幕类型?' })
  mode?: number

  @IsNumber()
  @IsOptional()
  fontsize?: number

  @IsInt()
  @IsOptional()
  color?: number

  @IsString() // TODO 这一文件里3个content上regex关键词检查
  @IsOptional()
  content?: string
}

export class DanmakuStdDto extends DanmakuDto {
  @IsString()
  @IsNotEmpty({ message: '弹幕内容?' })
  content!: string
}

export class DanmakuAdvDto extends DanmakuDto {
  @IsString()
  @IsOptional()
  extraStr?: string
}

export class DanmakuMarkChapterDto extends DanmakuDto {
  @IsEmpty({ message: '章节标记无需字号参数' })
  fontsize?: number

  @IsEmpty({ message: '章节标记无需颜色参数' })
  color?: number

  @IsEmpty({ message: '章节标记无需内容参数' })
  content?: string

  // @IsNumber()
  // // @IsNotEmpty({ message: '章节开始时刻?' })
  // @IsOptional()
  // chpt_seg_start: number // alia of progress

  @IsNumber()
  @IsNotEmpty({ message: '章节持续时间?' })
  chpt_duration: number

  @IsEnum(UniDMTools.ExtraDanUniChapterType)
  @IsString()
  @IsNotEmpty({ message: '章节类型?' })
  chpt_type: UniDMTools.ExtraDanUniChapterType

  // @IsEnum(UniDMTools.ExtraDanUniChapterAction)
  // @IsNotEmpty({ message: '章节行为?' })
  // chpt_action: UniDMTools.ExtraDanUniChapterAction
}

export class DanmakuFullDto extends DanmakuAdvDto {
  @IsEmail({ require_tld: false })
  @IsNotEmpty({ message: '资源ID?' })
  SOID: string

  @IsEmail({ require_tld: false })
  @IsNotEmpty({ message: '发送者ID?' })
  senderID!: string

  // // 或可直接调用 created 参数
  // @IsNumberString()
  // ctime?: bigint
  // // ctime?: bigint = BigInt(Number(this.created))

  @Max(11)
  @Min(0)
  @IsInt()
  @IsOptional()
  weight?: number

  @IsEnum(UniDMTools.Pools)
  @IsInt()
  @IsNotEmpty({ message: '弹幕池?' })
  pool?: UniDMTools.Pools

  @IsString({ each: true })
  @ArrayUnique()
  @IsArray()
  @IsOptional()
  // @Type(() => String)
  attr?: UniDMTools.DMAttr[]

  @IsString()
  @IsOptional()
  platform?: platform.PlatformDanmakuSource
}

class DanmakuImportUnitDto extends DanmakuFullDto {
  @IsString()
  @IsOptional({ message: '待修改弹幕的原弹幕ID?' })
  oriDMID!: string

  // @IsOptional()
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty({ message: '发送时间?' })
  // @IsDateString()
  ctime: Date
}

export class DanmakuImportDto {
  @ValidateNested({ each: true })
  @IsNonPrimitiveArray()
  @Type(() => DanmakuImportUnitDto)
  @IsNotEmpty({ message: '导入剧集单元?' })
  units: DanmakuImportUnitDto[]

  @IsBoolean()
  @IsNotEmpty({ message: '是否需要签名批量操作?' })
  sign: boolean
}

export class DanmakuBatchDelOrExportDto {
  @IsString({ each: true })
  @ArrayUnique()
  @IsArray()
  @IsNotEmpty({ message: '批量删除/导出的弹幕单元?' })
  units: string[]
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
