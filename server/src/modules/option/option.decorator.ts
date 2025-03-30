import { applyDecorators, UseGuards } from '@nestjs/common'

import { ApiController } from '~/common/decorators/api-controller.decorator'
import { Role } from '~/common/decorators/authn.decorator'
import { AuthnGuard } from '~/common/guards/authn.guard'
import { Roles } from '~/constants/authn.constant'

// import { Level } from '~/common/decorators/level.decorator'
// import { LevelGuard } from '~/common/guards/level.guard'

// import { Levels } from '../user/user.model'

// import { Auth } from '~/common/decorators/auth.decorator'

export function OptionController(name?: string, postfixRoute?: string) {
  const routes = ['options', 'config']
  return applyDecorators(
    // Auth(),
    // UseGuards(LevelGuard),
    // Level(Levels.Admin),
    UseGuards(AuthnGuard),
    Role([Roles.admin]),
    ApiController(
      postfixRoute
        ? routes.map((route) => `/${route}/${postfixRoute}`)
        : routes,
    ),
  )
}
