// import { compareSync } from 'bcryptjs'
import { nanoid } from 'nanoid'
import type { MetaDocument } from './meta.model'

import { platfrom } from '@dan-uni/dan-any'
import {
  ConflictException,
  ForbiddenException,
  // ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  // UnauthorizedException,
  // UnprocessableEntityException,
} from '@nestjs/common'
import { ReturnModelType } from '@typegoose/typegoose'

import { AuthnModel, Scopes } from '~/constants/authn.constant'
// import { FastifyBizRequest } from '~/transformers/get-req.transformer'
// import {
//   BizException,
//   BusinessException,
// } from '~/common/exceptions/biz.exception'
// import { ErrorCodeEnum } from '~/constants/error-code.constant'
import { InjectModel } from '~/transformers/model.transformer'

// import { LevelLowException } from '~/utils/custom-request-exception'

import { ConfigsService } from '../configs/configs.service'
// import { Levels } from '../user/user.model'
// import { getAvatar } from '~/utils/tool.util'

// import { AuthService } from '../auth/auth.service'
import { MetaModel } from './meta.model'

@Injectable()
export class MetaService {
  private Logger = new Logger(MetaService.name)
  constructor(
    @InjectModel(MetaModel)
    private readonly metaModel: ReturnModelType<typeof MetaModel>,
    private readonly configService: ConfigsService,
    // private readonly authService: AuthService,
  ) {}
  public get model() {
    return this.metaModel
  }
  // async login(username: string, password: string) {
  //   const user = await this.userModel.findOne({ username }).select('+password')
  //   if (!user) {
  //     await sleep(3000)
  //     throw new ForbiddenException('用户名不正确')
  //   }
  //   if (!compareSync(password, user.password)) {
  //     await sleep(3000)
  //     throw new ForbiddenException('密码不正确')
  //   }

  //   return user
  // }
  async isScopeAdmin(meta: string | MetaDocument, authn: AuthnModel) {
    const metaReal = typeof meta === 'string' ? await this.getMeta(meta) : meta
    // { level, uid } = ctx
    if (!metaReal) throw new NotFoundException('未找到该弹幕库')
    if (authn.scopes.has(Scopes.metaModify) || metaReal.creator === authn.sid)
      return true
    return false
  }

  // 不要直接在controller中使用
  async getMeta(FCID: string) {
    const meta = await this.metaModel.findOne({
      FCID,
    })
    if (!meta) return null
    // if (!user) {
    //   throw new BizException(ErrorCodeEnum.MasterLost)
    // }
    // const avatar = user.avatar ?? getAvatar(user.mail)
    // return { ...user, avatar }
    return meta
  }
  async hasMeta({
    FCID,
    hashes,
    thirdPlatforms,
  }: {
    FCID?: string
    hashes?: string[]
    thirdPlatforms?: {
      platform: platfrom
      id: string
    }[]
  }) {
    if (thirdPlatforms?.length)
      return !!(await this.metaModel.findOne({ $in: thirdPlatforms }))?.FCID
    else if (FCID || hashes?.length)
      return !!(
        await this.metaModel.findOne({
          $or: [
            { FCID },
            { 'hashes.hash': { $in: hashes }, 'hashes.exact': true },
          ],
        })
      )?.FCID
    else return false
  }
  async getMetaByID(FCID: string) {
    const meta = await this.getMeta(FCID)
    if (!meta) throw new NotFoundException('未找到该弹幕库')
    meta.fmt()
    return meta
  }
  async listMetaByHash(hash: string) {
    const exactMeta = await this.metaModel
      .findOne({
        'hashes.hash': hash,
        'hashes.exact': true,
      })
      .lean({ virtuals: true })
    if (!exactMeta?.FCID) {
      const metas = await this.metaModel
        .find({
          'hashes.hash': hash,
          'hashes.exact': false,
        })
        .sort({ 'hashes.vote': -1 })
        .limit(5)
      // .lean({ virtuals: true })
      return {
        exact: null,
        // similar: metas,
        similar: metas.map((i) => {
          i.fmt()
          return i
        }),
      }
    }
    return { exact: exactMeta, similar: [] }
  }
  async getMetaBy3rdID(platform: platfrom, id: string, authn?: AuthnModel) {
    if (authn?.pass) {
      // 无authn参数传入时无需刷新
      // 此处接bgm.tv刷新插件
    }
    const meta = await this.metaModel
      .findOne({
        'thirdPlatforms.platform': platform,
        'thirdPlatforms.id': id,
      })
      .lean({ virtuals: true })
    if (!meta) throw new NotFoundException('未找到该弹幕库')
    return meta
  }
  // async listMetasByCreator(creator?: string, ctx?: FastifyBizRequest) {
  async listMetasByCreator(creator: 'me' | string, authn: AuthnModel) {
    if (creator === 'me') {
      // if (!ctx?.uid) throw new UnauthorizedException('未登录')
      // const pre = await this.preMeta()
      creator = authn.sid
    }
    return this.metaModel.find({ creator }).lean({ virtuals: true })
  }
  async countMeta() {
    return this.metaModel.countDocuments()
  }

  async preMeta(addons: { [key: string]: boolean } = { metaConf: false }) {
    const baseConf = await this.configService.get('base'), //记得初始化domain
      suffix = `@${baseConf.domain}`,
      metaConf = addons.metaConf
        ? await this.configService.get('meta')
        : this.configService.defaultConfig.meta
    return { baseConf, suffix, metaConf }
  }

  async createMeta(
    authn: AuthnModel,
    data?: Partial<MetaModel>,
    FCID?: string,
    // ctx?: FastifyBizRequest,
    // creatorID: string = 'bot',
  ) {
    // if (!ctx?.level || ctx.level <= metaConf.createMinLv)
    //   throw new LevelLowException(metaConf.createMinLv, ctx?.level)
    const pre = await this.preMeta({ metaConf: true })
    if (!FCID) FCID = nanoid() + pre.suffix
    // if (creatorID.endsWith(pre.suffix))
    //   creatorID = creatorID.slice(0, -pre.suffix.length)
    const creator = authn.sid + pre.suffix
    const hasMeta = await this.hasMeta({
      FCID,
      hashes: data?.hashes?.filter((v) => v.exact).map((v) => v.hash),
      thirdPlatforms: data?.thirdPlatforms,
    })
    if (hasMeta) throw new ConflictException('已经存在该弹幕库了哦')
    const newMeta = await this.metaModel.create({ ...data, FCID, creator })
    return newMeta
  }

  // async delMeta(FCID: string, ctx: FastifyBizRequest) {
  // async delMeta(FCID: string, authn: AuthnModel) {
  //   const meta = await this.getMeta(FCID)
  //   if (!meta) throw new NotFoundException('未找到该弹幕库')
  //   if (!(await this.isScopeAdmin(meta, authn)))
  //     throw new ForbiddenException('无删除权限')
  //   return this.metaModel.deleteOne({ FCID })
  // }

  async patchMeta(
    FCID: string,
    data: Partial<MetaModel>,
    // ctx: FastifyBizRequest,
    authn: AuthnModel,
  ) {
    data.FCID = FCID // 防止篡改FCID
    const meta = await this.getMeta(FCID)
    if (!meta) throw new NotFoundException('未找到该弹幕库')
    if (!authn.pass && !(await this.isScopeAdmin(meta, authn)))
      throw new ForbiddenException('无修改权限')
    const hasMeta = await this.hasMeta({
      hashes: data?.hashes?.filter((v) => v.exact).map((v) => v.hash),
      thirdPlatforms: data?.thirdPlatforms,
    })
    if (hasMeta)
      throw new ConflictException('更新的hash或第三方数据与已有弹幕库发生重复')
    return this.metaModel.updateOne({ FCID }, data)
  }

  async voteHash(meta: MetaDocument, hash: string, authn: AuthnModel) {
    // const meta = await this.getMetaByID(FCID)
    // if (!meta) {
    //   throw new BadRequestException('该弹幕库不存在')
    // }
    const hashObj = meta.hashes?.find((i) => i.hash === hash)
    // console.log(meta.FCID, meta.hashes, !!hashObj, hashObj)
    let newMeta: MetaDocument | null
    if (hashObj) {
      newMeta = await this.metaModel.findByIdAndUpdate(
        meta._id,
        {
          $inc: {
            'hashes.$[h].vote': 1,
          },
        },
        { arrayFilters: [{ 'h.hash': hash }], returnDocument: 'after' },
      )
    } else if (authn.pass)
      newMeta = await this.metaModel.findByIdAndUpdate(
        meta._id,
        {
          $addToSet: {
            hashes: {
              hash,
              vote: 1,
            },
          },
        },
        { returnDocument: 'after' },
      )
    else throw new ForbiddenException('无新建hash权限')
    return newMeta ? newMeta : meta
  }
}
