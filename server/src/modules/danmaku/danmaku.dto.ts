import {
  IsArray,
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
} from 'class-validator'

// import type { platfrom } from '@dan-uni/dan-any/src/utils/id-gen'
import { platfrom, UniDMTools } from '@dan-uni/dan-any'

// import {
//   DMAttr,
//   ExtraDanUniChapterAction,
//   ExtraDanUniChapterType,
//   Modes,
//   Pools,
// } from '@dan-uni/dan-any/src/utils/dm-gen'

export class DanmakuDto {
  @IsNumber()
  @IsNotEmpty({ message: '弹幕进度?' })
  progress: number

  // @IsInt()
  @IsEnum(UniDMTools.Modes)
  @IsOptional()
  // @IsNotEmpty({ message: '弹幕类型?' })
  mode?: UniDMTools.Modes

  @IsNumber()
  @IsOptional()
  fontsize?: number

  @IsInt()
  @IsOptional()
  color?: number

  @IsString()
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
  @IsNotEmpty({ message: '章节类型?' })
  chpt_type: UniDMTools.ExtraDanUniChapterType

  // @IsEnum(UniDMTools.ExtraDanUniChapterAction)
  // @IsNotEmpty({ message: '章节行为?' })
  // chpt_action: UniDMTools.ExtraDanUniChapterAction
}

export class DanmakuFullDto extends DanmakuAdvDto {
  @IsEmail()
  @IsNotEmpty({ message: '弹幕ID?' })
  readonly FCID: string

  @IsEmail()
  @IsNotEmpty({ message: '发送者ID?' })
  senderID!: string

  // // 或可直接调用 created 参数
  // @IsNumberString()
  // ctime?: bigint
  // // ctime?: bigint = BigInt(Number(this.created))

  @IsInt()
  @Min(1)
  @Max(10)
  weight?: number

  @IsEnum(UniDMTools.Pools)
  @IsNotEmpty({ message: '弹幕池?' })
  pool?: UniDMTools.Pools

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  // @Type(() => String)
  attr?: UniDMTools.DMAttr[]

  @IsString()
  @IsOptional()
  platfrom?: platfrom | string

  @IsString()
  @IsOptional()
  SPMO?: string
}

export class DanmakuImportDto extends DanmakuFullDto {
  @IsString()
  @IsNotEmpty({ message: '弹幕ID?' })
  DMID!: string

  @IsDateString()
  @IsOptional()
  // @IsNotEmpty({ message: '发送时间?' })
  ctime?: string
}
