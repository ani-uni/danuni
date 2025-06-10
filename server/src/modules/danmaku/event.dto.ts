import {
  IsEnum,
  // IsInt,
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

// export enum DanmakuEventVoteAction {
//   Like = 1,
//   Dislike = -1,
//   Report = -1,
//   Pass = 0,
// }

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
  action: DanmakuEventAction

  @IsString()
  @IsOptional()
  reason?: string
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
