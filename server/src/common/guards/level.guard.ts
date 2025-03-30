// import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
// import { Reflector } from '@nestjs/core'

// import { AuthService } from '~/modules/auth/auth.service'
// import { Levels } from '~/modules/user/user.model'
// import {
//   FastifyBizRequest,
//   getNestExecutionContextRequest,
// } from '~/transformers/get-req.transformer'
// import { LevelLowException } from '~/utils/custom-request-exception'

// @Injectable()
// export class LevelGuard implements CanActivate {
//   constructor(
//     private reflector: Reflector,
//     protected readonly authService: AuthService,
//   ) {}

//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     const targetLevels = this.reflector.getAllAndOverride<Levels>('level', [
//       context.getHandler(),
//       context.getClass(),
//     ])
//     if (!targetLevels || targetLevels[0] === Levels.GuestOrBan) {
//       return true
//     }
//     const request = this.getRequest(context)
//     const level = request.level || (await this.refreshCtxLevel(request))
//     if (level >= targetLevels[0]) return true
//     else throw new LevelLowException(targetLevels[0], level)
//     // return requiredLevels.some((level) => request.user?.level)
//   }

//   getRequest(context: ExecutionContext) {
//     return getNestExecutionContextRequest(context)
//   }

//   attachLevel(
//     request: FastifyBizRequest,
//     level: Levels = Levels.GuestOrBan,
//     uid?: string,
//   ) {
//     request.level = level
//     request.uid = uid
//     Object.assign(request.raw, { level, uid })
//   }

//   async refreshCtxLevel(request: FastifyBizRequest) {
//     const session = await this.authService.getSessionUser(request.raw)
//     if (session) {
//       let level = session.user?.level
//       if (session.user?.role === 'admin') level = Levels.Admin
//       else if (session.user?.banned) level = Levels.GuestOrBan
//       this.attachLevel(request, level, session.user?.id)
//     }
//     return request.level
//   }
// }
