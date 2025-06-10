import { platform as PF } from '@dan-uni/dan-any'
import {
  BadRequestException,
  Body,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'

import { ApiController } from '~/common/decorators/api-controller.decorator'
import { Authn } from '~/common/decorators/authn.decorator'
import { HttpCache } from '~/common/decorators/cache.decorator'
import { AuthnGuard } from '~/common/guards/authn.guard'
import { Roles, Scopes } from '~/constants/authn.constant'
import { checkID } from '~/utils/id-prefix.util'

import { MetaDto, MetaSourceDto, MetaTransferDto } from './meta.dto'
import { MetaService } from './meta.service'
import { MetaSourceService } from './source.service'

@ApiController(['meta'])
@UseGuards(AuthnGuard)
export class MetaController {
  constructor(
    private readonly metaService: MetaService,
    private readonly metaSourceService: MetaSourceService,
  ) {}

  @Get('/:ID')
  @Authn({ role: [Roles.guest] })
  async getEp(@Param('ID') ID: string) {
    const Id = checkID(ID, ['ep', 'so'])
    if (Id.type === 'ep') return await this.metaService.getEp(Id.id, true)
    else if (Id.type === 'so') return await this.metaSourceService.getSo(Id.id)
    else throw new BadRequestException('ID格式错误') // 此行由于checkID不会异常
  }
  @Get(['/:type/external-id/:platform', '/external-id/:platform'])
  @Authn({ role: [Roles.guest] })
  async findEpByExternalID(
    @Param('platform') platform: PF.PlatformSource,
    @Query('id') id: string,
    @Param('type') type?: 'ep' | 'so',
  ) {
    if (platform in PF.PlatformDanmakuSources) {
      const so = await this.metaSourceService.findSo(
        id,
        platform as PF.PlatformDanmakuSource,
      )
      if (!type || type === 'so') return so
      else if (type === 'ep') {
        if (so.exact) return this.metaService.getEp(so.exact.EPID)
        else throw new NotFoundException('未找到该剧集')
      }
    } else if (platform in PF.PlatformInfoSources) {
      const ep = await this.metaService.findEp(
        id,
        platform as PF.PlatformInfoSource,
      )
      return ep
    }
  }
  @Get(['/:type/hash/:hash', '/hash/:hash'])
  @Authn({ role: [Roles.guest] })
  async findEpByHash(
    @Param('hash') hash?: string,
    @Param('type') type?: 'ep' | 'so',
    @Query('hash') hash2?: string,
  ) {
    hash = hash ?? hash2
    if (!hash) throw new BadRequestException('Hash?')
    const so = await this.metaSourceService.findSo(hash, 'hash')
    if (!type || type === 'so') return so
    else if (type === 'ep') {
      if (so.exact) return this.metaService.getEp(so.exact.EPID)
      else throw new NotFoundException('未找到该剧集')
    }
  }
  // @Get(['/up/me', '/up/:creator'])
  // // @Level(Levels.GuestOrBan)
  // @Authn({ role: [Roles.user, Roles.bot] })
  // async getMetasByCreator(
  //   @Param('creator') creator: string,
  //   // @CurrentCtx() ctx: FastifyBizRequest,
  //   @CurrentAuthnModel() authn: AuthnModel,
  // ) {
  //   return this.metaService.listMetasByCreator(creator || 'me', authn)
  // }

  @Post('/ep')
  @HttpCache({ disable: true })
  @Authn({ role: [Roles.user, Roles.bot], scope: [Scopes.metaCreate] })
  async createEp(@Body() metaDto: MetaDto) {
    return this.metaService.createEp(metaDto)
    // 已启用了dto whitelist，无需手动删除多余字段
    // return this.metaService.createEp({
    //   ...metaDto,
    //   EPID: undefined,
    //   maintainer: undefined,
    //   pgc: undefined,
    // })
  }
  @Post('/ep/:EPID/transfer')
  @HttpCache({ disable: true })
  @Authn({
    role: [Roles.user, Roles.bot],
    scope: [Scopes.metaEdit],
  })
  async transferEp(
    @Param('EPID') EPID: string,
    @Body() metaTransferDto: MetaTransferDto,
  ) {
    return this.metaService.transferEp(EPID, metaTransferDto.sid)
  }
  @Patch('/ep/:EPID')
  @HttpCache({ disable: true })
  @Authn({
    role: [Roles.user, Roles.bot],
    scope: [Scopes.metaEdit],
    pass: { scope: [Scopes.metaEditPgc] }, // 该scope与pass配合canEditEp
  })
  async editEp(@Param('EPID') EPID: string, @Body() metaDto: MetaDto) {
    return this.metaService.editEp({ ...metaDto, EPID })
  }
  @Delete('/ep/:EPID')
  @HttpCache({ disable: true })
  @Authn({ role: [Roles.user, Roles.bot], scope: [Scopes.metaDel] })
  async delEp(@Param('EPID') EPID: string) {
    return this.metaService.delEp(EPID)
  }

  @Post('/so')
  @HttpCache({ disable: true })
  @Authn({
    role: [Roles.user, Roles.bot],
    scope: [Scopes.metaEdit],
    pass: { scope: [Scopes.metaEditPgc] },
  })
  async createSo(@Body() metaSourceDto: MetaSourceDto) {
    return this.metaSourceService.createSo(metaSourceDto)
    // return this.metaSourceService.createSo({
    //   ...metaSourceDto,
    //   SOID: undefined,
    // })
  }
  @Patch('/so/:SOID')
  @HttpCache({ disable: true })
  @Authn({
    role: [Roles.user, Roles.bot],
    scope: [Scopes.metaEdit],
    pass: { scope: [Scopes.metaEditPgc] },
  })
  async editSo(
    @Param('SOID') SOID: string,
    @Body() metaSourceDto: MetaSourceDto,
  ) {
    return this.metaSourceService.editSo({ ...metaSourceDto, SOID })
  }
  @Delete('/so/:SOID')
  @HttpCache({ disable: true })
  @Authn({
    role: [Roles.user, Roles.bot],
    scope: [Scopes.metaEdit],
    pass: { scope: [Scopes.metaEditPgc] },
  })
  async delSo(@Param('SOID') SOID: string) {
    return this.metaSourceService.delSo(SOID)
  }
}
