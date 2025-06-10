import { Transform } from 'class-transformer'
import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator'

import {
  Body,
  Get,
  Headers,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'

import { ApiController } from '~/common/decorators/api-controller.decorator'
import { Authn } from '~/common/decorators/authn.decorator'
import { HttpCache } from '~/common/decorators/cache.decorator'
import { HTTPDecorators } from '~/common/decorators/http.decorator'
import { AuthnGuard } from '~/common/guards/authn.guard'
import { Roles } from '~/constants/authn.constant'
import { FastifyBizRequest } from '~/transformers/get-req.transformer'

import { AuthService } from './auth.service'
import { BotAuthUnitDto } from './bot-auth.dto'

export class TokenDto {
  @IsDate()
  @IsOptional()
  @Transform(({ value: v }) => new Date(v))
  expired?: Date

  @IsString()
  @IsNotEmpty()
  name: string
}
@ApiController({
  path: 'auth',
})
@UseGuards(AuthnGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Patch('as-owner')
  @Authn({ role: [Roles.admin] })
  async oauthAsOwner() {
    return this.authService.setCurrentOauthAsOwner()
  }

  @Get('get-session')
  @HttpCache({
    disable: true,
  })
  @HTTPDecorators.Bypass
  async getSession(@Req() req: FastifyBizRequest) {
    const session = await this.authService.getSessionUser(req.raw)

    if (!session) {
      throw new UnauthorizedException('未登录')
      // return null
    }

    return session

    // const account = await this.authService.getOauthUserAccount(
    //   session.providerAccountId,
    // )

    // return {
    //   ...session,
    //   account,
    // }
    // return {
    //   ...session.user,
    //   ...account,
    //   ...omit(session, ['session', 'user']),

    //   id: session?.user?.id ?? session.providerAccountId,
    // }
  }

  // @Get('providers')
  // @HttpCache({
  //   disable: true,
  // })
  // async getProviders() {
  //   return this.authInstance.get().api.getProviders()
  // }

  @Post('bot-auth/create')
  @Authn({ role: [Roles.admin] })
  async addBotAuth(@Body() body: BotAuthUnitDto) {
    return this.authService.addBotAuth(body)
  }

  @Post('api-key/create/bot-auth')
  @HTTPDecorators.Bypass
  async createApiKeyByBotAuth(@Headers('Authorization') auth: string) {
    if (!auth || !auth.startsWith('Bearer'))
      throw new UnauthorizedException('未登录')
    const jwt = auth.replace('Bearer ', '')
    return this.authService.createApiKeyByBotAuth(jwt)
  }
}
