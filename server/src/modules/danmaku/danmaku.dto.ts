import { Type } from 'class-transformer'
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
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
  @IsNotEmpty({ message: '弹幕进度?' })
  @IsNumber()
  progress: number

  @IsOptional()
  @IsEnum(UniDMTools.Modes)
  // @IsNotEmpty({ message: '弹幕类型?' })
  mode?: UniDMTools.Modes

  @IsOptional()
  @IsNumber()
  fontsize?: number

  @IsOptional()
  @IsInt()
  color?: number

  @IsOptional()
  @IsString() // TODO 这一文件里3个content上regex关键词检查
  content?: string
}

export class DanmakuStdDto extends DanmakuDto {
  @IsNotEmpty({ message: '弹幕内容?' })
  @IsString()
  content!: string
}

export class DanmakuAdvDto extends DanmakuDto {
  @IsOptional()
  @IsString()
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

  @IsNotEmpty({ message: '章节持续时间?' })
  @IsNumber()
  chpt_duration: number

  @IsNotEmpty({ message: '章节类型?' })
  @IsEnum(UniDMTools.ExtraDanUniChapterType)
  chpt_type: UniDMTools.ExtraDanUniChapterType

  // @IsEnum(UniDMTools.ExtraDanUniChapterAction)
  // @IsNotEmpty({ message: '章节行为?' })
  // chpt_action: UniDMTools.ExtraDanUniChapterAction
}

export class DanmakuFullDto extends DanmakuAdvDto {
  @IsNotEmpty({ message: '资源ID?' })
  @IsEmail()
  SOID: string

  @IsNotEmpty({ message: '发送者ID?' })
  @IsEmail()
  senderID!: string

  // // 或可直接调用 created 参数
  // @IsNumberString()
  // ctime?: bigint
  // // ctime?: bigint = BigInt(Number(this.created))

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  weight?: number

  @IsNotEmpty({ message: '弹幕池?' })
  @IsEnum(UniDMTools.Pools)
  pool?: UniDMTools.Pools

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  // @Type(() => String)
  attr?: UniDMTools.DMAttr[]

  @IsOptional()
  @IsString()
  platform?: platform.PlatformDanmakuSource
}

class DanmakuImportUnitDto extends DanmakuFullDto {
  @IsNotEmpty({ message: '弹幕ID?' })
  @IsString()
  DMID!: string

  @IsNotEmpty({ message: '发送时间?' })
  // @IsOptional()
  @IsDateString()
  ctime: string
}

export class DanmakuImportDto {
  @IsNotEmpty({ message: '导入剧集单元?' })
  @IsNonPrimitiveArray()
  @ArrayUnique()
  @ValidateNested({ each: true })
  @Type(() => DanmakuImportUnitDto)
  units: DanmakuImportUnitDto[]

  @IsNotEmpty({ message: '是否需要签名批量操作?' })
  @IsBoolean()
  sign: boolean
}

export class DanmakuBatchDelOrExportDto {
  @IsNotEmpty({ message: '批量删除/导出的弹幕单元?' })
  @ArrayUnique()
  @ValidateNested({ each: true })
  @Type(() => String)
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
