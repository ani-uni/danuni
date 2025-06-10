import type { ExecutionContext } from '@nestjs/common'
import type { GroupsClass, Roles, Scopes } from '~/constants/authn.constant'

import { createParamDecorator, SetMetadata } from '@nestjs/common'

import {
  AUTHN_ROLES_OPTIONS,
  AUTHN_ROLES_PASS_OPTIONS,
  AUTHN_SCOPE_OPTIONS,
  AUTHN_SCOPE_PASS_OPTIONS,
  Groups,
} from '~/constants/authn.constant'
import { getNestExecutionContextRequest } from '~/transformers/get-req.transformer'

// 在authn.guard.ts里await获取config比对即可
// 顺带把service里的check改掉
export const Role = (roles: Roles[]) => SetMetadata(AUTHN_ROLES_OPTIONS, roles)
export const Scope = (scopes: Scopes[]) =>
  SetMetadata(AUTHN_SCOPE_OPTIONS, new Set(scopes))

/**
 * 只能在单个接口上使用，因为controller级上无参数2、3（descriptor）
 */
export const Authn = (options: {
  role?: Roles[]
  scope?: Scopes[]
  pass?: {
    role?: Roles[]
    scope?: Scopes[]
  }
  group?: keyof GroupsClass
}): MethodDecorator => {
  const s = options.scope || [],
    g = options.group ? Groups[options.group] : []
  return (_, __, descriptor: PropertyDescriptor) => {
    if (options.role)
      SetMetadata(AUTHN_ROLES_OPTIONS, options.role)(descriptor.value)
    if (options.scope || options.group)
      SetMetadata(AUTHN_SCOPE_OPTIONS, new Set([...s, ...g]))(descriptor.value)
    if (options.pass) {
      if (options.pass.role)
        SetMetadata(
          AUTHN_ROLES_PASS_OPTIONS,
          options.pass.role,
        )(descriptor.value)
      if (options.pass.scope)
        SetMetadata(
          AUTHN_SCOPE_PASS_OPTIONS,
          new Set(options.pass.scope),
        )(descriptor.value)
    }

    return descriptor
  }
}

export const CurrentAuthnModel = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const ectx = getNestExecutionContextRequest(ctx)
    return ectx.authn
  },
)
