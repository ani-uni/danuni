import type { Scopes } from '~/constants/authn.constant'
import type { Levels } from '~/modules/user/user.model'

import { ForbiddenException } from '@nestjs/common'

import { Roles } from '~/constants/authn.constant'

import { difference } from './set.util'

export class LevelLowException {
  constructor(targetLv: Levels, userLv?: number) {
    if (!userLv) return new ForbiddenException(`未登录`)
    else return new ForbiddenException(`等级过低(${userLv} < ${targetLv})`)
  }
}

export class NotSpecificRoleException {
  constructor(targetRoles: Roles[], userRole?: Roles) {
    if (!userRole || userRole === Roles.guest)
      return new ForbiddenException(`未登录`)
    else {
      return new ForbiddenException(
        `非特定用户组( ${userRole} 不属于 ${targetRoles.join(', ')} )`,
      )
    }
  }
}

export class NotInScopeException {
  constructor(targetScopes: Set<Scopes>, userScopes: Set<Scopes>) {
    const lack = difference(targetScopes, userScopes)
    return new ForbiddenException(
      `缺少${lack.size}个权限(${[...lack].join(', ')})`,
    )
  }
}
