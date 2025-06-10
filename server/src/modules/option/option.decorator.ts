import { applyDecorators, UseGuards } from '@nestjs/common'

import { ApiController } from '~/common/decorators/api-controller.decorator'
import { Role } from '~/common/decorators/authn.decorator'
import { AuthnGuard } from '~/common/guards/authn.guard'
import { Roles } from '~/constants/authn.constant'

export function OptionController(name?: string, postfixRoute?: string) {
  const routes = ['options', 'config']
  return applyDecorators(
    UseGuards(AuthnGuard),
    Role([Roles.admin]),
    ApiController(
      postfixRoute
        ? routes.map((route) => `/${route}/${postfixRoute}`)
        : routes,
    ),
  )
}
