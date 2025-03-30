import type { ExecutionContext } from '@nestjs/common'
import type { Levels } from '~/modules/user/user.model'

import { createParamDecorator, SetMetadata } from '@nestjs/common'

import { getNestExecutionContextRequest } from '~/transformers/get-req.transformer'

// enum Levels {
//   GuestOrBan = 0,
//   Min = 1,
//   Low = 2,
//   Default = 3,
//   Mid4 = 4,
//   Mid5 = 5,
//   High6 = 6,
//   High7 = 7,
//   High8 = 8,
//   Creator = 9,
//   Admin = 10,
// }
export const Level = (...levels: Levels[]) => SetMetadata('level', levels)

export const CurrentCtx = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    return getNestExecutionContextRequest(ctx)
  },
)
