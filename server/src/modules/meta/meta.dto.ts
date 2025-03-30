import { Type } from 'class-transformer'
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  registerDecorator,
  ValidateNested,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator'
// import type { platfrom } from '@dan-uni/dan-any/src/utils/id-gen'
import type { platfrom } from '@dan-uni/dan-any'

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

class HashDto {
  @IsString()
  @Length(5, 256)
  @IsNotEmpty({ message: 'Hash?' })
  hash!: string

  @IsNumber()
  vote: number

  @IsBoolean()
  @IsOptional()
  exact: boolean
}

class thirdPlatformDto {
  @IsString()
  platform: platfrom

  @IsString()
  id: string
}

export class MetaDto {
  @IsString()
  @IsOptional()
  // @IsNotEmpty({ message: '弹幕库ID?' })
  readonly FCID: string

  @IsNumber()
  @IsOptional()
  duration?: number

  @IsEmail({ require_tld: false })
  @IsOptional()
  creator: string

  // @ValidateNested({ each: true })
  // @IsNonPrimitiveArray()
  // @Type(() => UniNodeDto)
  // // @IsNotEmpty({ message: '密码？' })
  // readonly nodes: UniNodeDto[]

  @ValidateNested({ each: true })
  @IsNonPrimitiveArray()
  @Type(() => HashDto)
  @IsOptional()
  readonly hashes?: HashDto[]

  @ValidateNested({ each: true })
  @IsNonPrimitiveArray()
  @Type(() => thirdPlatformDto)
  @IsOptional()
  readonly thirdPlatforms?: thirdPlatformDto[]
}

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
