import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator'
import { isObjectIdOrHexString } from 'mongoose'

import { DanmakuEventAction } from './event.constant'

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
