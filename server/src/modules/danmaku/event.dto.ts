import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator'
import { isObjectIdOrHexString } from 'mongoose'

// import type { platfrom } from '@dan-uni/dan-any/src/utils/id-gen'
// import { platfrom, UniDMTools } from '@dan-uni/dan-any'

import { DanmakuEventAction } from './event.constant'

export enum DanmakuEventVoteAction {
  Like = 1,
  Dislike = -1,
  Report = -1,
  Pass = 0,
}

export class DanmakuEventPIDDto {
  @IsObjectIdOrHexString()
  @IsNotEmpty({ message: '上级对象ID?' })
  PID: string
}
class DanmakuEventBaseDto {
  @IsObjectIdOrHexString()
  @IsOptional()
  // @IsNotEmpty({ message: '上级对象ID?' })
  PID?: string
}

export class DanmakuEventDto extends DanmakuEventBaseDto {
  @IsString()
  @IsEnum(DanmakuEventAction)
  @IsNotEmpty({ message: '事件类型?' })
  action: string

  @IsString()
  @IsOptional()
  reason?: string
}

export class DanmakuEventFinishDto extends DanmakuEventBaseDto {
  @IsInt()
  @IsEnum(DanmakuEventVoteAction)
  @IsOptional()
  action?: number
}
export class DanmakuEventVoteDto extends DanmakuEventFinishDto {
  @IsInt()
  @IsEnum(DanmakuEventVoteAction)
  @IsNotEmpty({ message: '事件类型?' })
  action: number
}

export function IsObjectIdOrHexString(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'IsObjectIdOrHexString',
      target: object.constructor,
      propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: any, _args: ValidationArguments) {
          return isObjectIdOrHexString(value)
        },
      },
    })
  }
}
