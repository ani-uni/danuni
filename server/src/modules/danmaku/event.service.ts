// import { compareSync } from 'bcryptjs'

// import {
//   Extra,
//   ExtraDanUni,
//   Modes,
//   Pools,
//   UniDM,
// } from '@dan-uni/dan-any/src/utils/dm-gen'
// import { createDMID } from '@dan-uni/dan-any/src/utils/id-gen'
import {
  BadRequestException,
  // ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  // UnprocessableEntityException,
} from '@nestjs/common'
import { ReturnModelType } from '@typegoose/typegoose'

import { AuthnModel } from '~/constants/authn.constant'
// import { FastifyBizRequest } from '~/transformers/get-req.transformer'
// import {
//   BizException,
//   BusinessException,
// } from '~/common/exceptions/biz.exception'
// import { ErrorCodeEnum } from '~/constants/error-code.constant'
import { InjectModel } from '~/transformers/model.transformer'

import { ConfigsService } from '../configs/configs.service'
import { MetaService } from '../meta/meta.service'
import { DanmakuEService } from './danmaku.e.service'
import { DanmakuEventAction, DanmakuEventLabel } from './event.constant'
import {
  DanmakuEventDto,
  DanmakuEventPIDDto,
  DanmakuEventVoteAction,
} from './event.dto'
// import { getAvatar } from '~/utils/tool.util'

// import { AuthService } from '../auth/auth.service'
import {
  DanmakuEventDocument,
  DanmakuEventModel,
  DanmakuEventModelStatisfied,
  DanmakuEventTools,
} from './event.model'

@Injectable()
export class DanmakuEventService {
  private Logger = new Logger(DanmakuEventService.name)
  constructor(
    @InjectModel(DanmakuEventModel)
    // @InjectModel(DanmakuModel)
    private readonly eventModel: ReturnModelType<typeof DanmakuEventModel>,
    // private readonly danmakuModel: ReturnModelType<typeof DanmakuModel>,
    private readonly metaService: MetaService,
    private readonly danmakuService: DanmakuEService,
    private readonly configService: ConfigsService,
    // private readonly authService: AuthService,
  ) {}
  public get model() {
    return this.eventModel
  }
  // async canEdit(meta: MetaDocument, ctx: FastifyBizRequest) {
  //   const { level, uid } = ctx
  //   if (level === Levels.Creator || uid === meta.creator) return true
  //   return false
  // }
  // async getVote(DMID: string) {
  //   const dan = await this.danmakuModel.findOne({
  //     DMID,
  //   })
  //   if (!dan) return null
  //   return dan
  // }
  // async hasDan(DMID: string) {
  //   return !!(await this.getDan(DMID))?.DMID
  // }

  fmtEvent(
    event:
      | DanmakuEventDocument
      | DanmakuEventModelStatisfied
      | DanmakuEventModelStatisfied[]
      | DanmakuEventModelStatisfied[],
  ) {
    if (Array.isArray(event)) return event.map((e) => this.fmtEvent(e))
    // console.log(Object.hasOwn(event, 'toJSON'))
    const mainData = 'toJSON' in event ? event.toJSON() : event,
      votes =
        'toStatistics' in event
          ? event.toStatistics()
          : DanmakuEventTools.toStatistics(event)
    return { ...mainData, votes }
  }
  async isScopeAdmin(
    event: string | DanmakuEventDocument,
    // ctx: FastifyBizRequest,
    authn: AuthnModel,
    checkCanOp = false,
  ) {
    // event 为 PID 或 事件对象
    const isPID = typeof event === 'string',
      PID = isPID ? event : event.PID
    if (checkCanOp) {
      const dan = await this.danmakuService.getDanByObjectID(PID)
      if (
        dan && //存在弹幕
        !dan.attr?.includes('Protect') && //弹幕不受保护
        !dan.attr?.includes('Hide') && //弹幕非临时隐藏
        !this.danmakuService.fmtSingleDan(dan).isFrom3rdPlatform //且不来自3rd平台
      )
        return true //可以操作
      else return false
    } else if (!isPID && event.pub) return true
    else {
      const dan = await this.danmakuService.getDanByObjectID(PID)
      if (!dan) return false
      return this.metaService.isScopeAdmin(dan.FCID, authn)
    }
  }
  async preEvent() {
    const baseConf = await this.configService.get('base'),
      suffix = `@${baseConf.domain}`,
      danmakuEventConf = await this.configService.get('danmakuEvent')
    return { baseConf, suffix, danmakuEventConf }
  }

  // async getDanEvent(PID: string | DanmakuEventPIDDto, ctx: FastifyBizRequest) {
  async getDanEvent(PID: string | DanmakuEventPIDDto, authn: AuthnModel) {
    if (typeof PID !== 'string') PID = PID.PID
    const vote = await this.eventModel.findOne({ PID })
    // .lean({ virtuals: true })
    if (!vote || !(await this.isScopeAdmin(vote, authn)))
      throw new NotFoundException('未找到该事件')
    return this.fmtEvent(vote)
  }
  async listDanEvent() {
    return this.fmtEvent(await this.eventModel.find().lean({ virtuals: true }))
  }
  // async listDanEventByFCID(FCID: string, ctx: FastifyBizRequest) {
  async listDanEventByFCID(FCID: string, authn: AuthnModel) {
    const canVisit = await this.metaService.isScopeAdmin(FCID, authn)
    if (!canVisit) throw new NotFoundException('未找到事件')
    const dans = (await this.danmakuService.listDanByFCID({ FCID })).dans
    if (dans.length === 0) throw new NotFoundException('未找到弹幕')
    const PIDs = dans.map((dan) => dan.PID)
    const events = await this.eventModel
      .find({ PID: { $in: PIDs } })
      .lean({ virtuals: true })
    return this.fmtEvent(events)
  }

  // async operateDan(action: DanmakuEventDto, ctx: FastifyBizRequest) {
  async operateDan(action: DanmakuEventDto, authn: AuthnModel) {
    if (!action.PID) throw new BadRequestException('未找到该弹幕')
    // if (!authn.uid) throw new BadRequestException('未登录')
    let voteAction = 0
    if (action.action === DanmakuEventAction.Like) voteAction = 1
    else if (action.action === DanmakuEventAction.Report) voteAction = -1
    else throw new BadRequestException('未知的操作')
    let event = await this.eventModel.findOne({ PID: action.PID })
    if (!event) {
      if (!(await this.isScopeAdmin(action.PID, authn, true)))
        throw new BadRequestException('事件已存在 或 弹幕来自其它平台或受保护')
      // throw new NotFoundException('未找到该事件')
      // const v = { uid: ctx.uid, weight: ctx.level, action: voteAction }
      // let v:
      //   | {
      //       positiveList?: { uid: string; weight: number }
      //       negativeList?: { uid: string; weight: number }
      //     }
      //   | undefined = undefined
      // switch (action.action) {
      //   case DanmakuEventAction.Like:
      //     v = { positiveList: user }
      //     break
      //   case DanmakuEventAction.Report:
      //     v = { negativeList: user }
      //     break
      // }
      event = await this.eventModel.create({
        ...action,
        label: DanmakuEventLabel.UserCreate,
        pub: true,
      })
      // await this.danmakuService.setDanProp(event.PID, 'Reported')
    }
    return this.voteAction(event, authn, voteAction)
  }
  async voteAction(
    // PID: string,
    event: string | DanmakuEventDocument,
    // ctx: FastifyBizRequest,
    authn: AuthnModel,
    action: DanmakuEventVoteAction,
  ) {
    // if (!ctx.uid) throw new BadRequestException('未登录')
    if (typeof event === 'string') {
      const realEvent = await this.eventModel.findOne({ PID: event })
      if (
        !realEvent ||
        !realEvent.PID ||
        !realEvent.action ||
        !(await this.isScopeAdmin(realEvent, authn))
      )
        throw new NotFoundException('未找到该事件')
      event = realEvent
    }
    // danmaku event 中返回的结果不会包含投票者的信息，故可使用uid做特定服务器内的唯一识别
    const find = event.votes.find((i) => i.uid === authn.uid)
    if (find)
      await event
        .updateOne({
          $pull: { votes: { uid: find.uid } },
        })
        .catch(() => {
          throw new BadRequestException('投票失败')
        })
    const v = { uid: authn.uid, weight: authn.weight, action }
    if (!v) throw new BadRequestException('未知的操作')
    return this.eventModel
      .findByIdAndUpdate(
        event._id,
        {
          $addToSet: {
            votes: v,
          },
        },
        { returnDocument: 'after' },
      )
      .then((e) => {
        if (e) return this.fmtEvent(e)
        else throw new BadRequestException('投票失败，你的投票已撤回')
      })
      .catch(() => {
        throw new BadRequestException('投票失败，你的投票已撤回')
      })
  }

  async finishEvent(
    event: string | DanmakuEventDocument,
    // ctx: FastifyBizRequest,
    action?: DanmakuEventVoteAction,
  ) {
    // if (!ctx.uid) throw new BadRequestException('未登录')
    if (typeof event === 'string') {
      const realEvent = await this.eventModel.findOne({ PID: event })
      if (
        !realEvent ||
        !realEvent.PID ||
        !realEvent.action
        // !(await this.canVisit(realEvent, ctx))
      )
        throw new NotFoundException('未找到该事件')
      event = realEvent
    }
    async function resConstructor(
      type: DanmakuEventVoteAction,
      operator: 'admin' | 'vote',
      mes?: string,
      event?: DanmakuEventDocument,
      done = true,
    ) {
      mes = mes ? `(${mes})` : mes
      done = done ? done : type === 0 ? false : true
      if (done && event) await event.deleteOne()
      return {
        type,
        operator,
        close: done,
        result: `事件${done ? '已' : '未'}关闭${mes}`,
      }
    }
    // TODO 处理时对event.PID -> danmaku.sender 进行相应奖惩
    if (event.action === DanmakuEventAction.Permit) {
      const acf = {
        p: async () =>
          await this.danmakuService.setDanProp(event.PID, 'Hide', true),
        n: async () => await this.danmakuService.delDanById(event.PID),
      }
      if (action === 1) {
        await acf.p()
        return resConstructor(1, 'admin', '解除隐藏', event)
      } else if (action === -1) {
        await acf.n()
        return resConstructor(-1, 'admin', '删除', event)
      } else {
        const pre = await this.preEvent(),
          ratio = event.toRatio()
        if (event.votes.length < pre.danmakuEventConf.participantNum)
          return resConstructor(0, 'vote', '参与人数过少,无弹幕操作')
        else if (ratio.positive * 100 >= pre.danmakuEventConf.positiveRatio) {
          await acf.p()
          return resConstructor(1, 'vote', '解除隐藏', event)
        } else if (ratio.negative * 100 >= pre.danmakuEventConf.negativeRatio) {
          await acf.n()
          return resConstructor(-1, 'vote', '删除', event)
        }
      }
    } else if (event.action === DanmakuEventAction.Like) {
      if (action === 1) {
        await this.danmakuService.setDanProp(event.PID, 'HighLike')
        return resConstructor(1, 'admin', '高赞', event)
      } else {
        const pre = await this.preEvent(),
          ratio = event.toRatio()
        if (event.votes.length < pre.danmakuEventConf.participantNum)
          return resConstructor(0, 'vote', '参与人数过少,无弹幕操作')
        else if (ratio.positive * 100 >= pre.danmakuEventConf.positiveRatio) {
          await this.danmakuService.setDanProp(event.PID, 'HighLike')
          return resConstructor(1, 'vote', '高赞', event)
        } else if (ratio.positive * 100 >= pre.danmakuEventConf.negativeRatio) {
          return resConstructor(-1, 'vote', '无弹幕操作', event)
        } else return resConstructor(0, 'vote', '无弹幕操作')
      }
    } else if (event.action === DanmakuEventAction.Report) {
      if (action === -1) {
        await this.danmakuService.delDanById(event.PID)
        return resConstructor(-1, 'admin', '删除弹幕', event)
      } else {
        const pre = await this.preEvent(),
          ratio = event.toRatio()
        if (event.votes.length < pre.danmakuEventConf.participantNum)
          return resConstructor(0, 'vote', '参与人数过少,无弹幕操作')
        else if (ratio.negative * 100 >= pre.danmakuEventConf.autoDelRatio) {
          await this.danmakuService.delDanById(event.PID)
          return resConstructor(-1, 'vote', '删除弹幕', event)
        } else if (ratio.negative * 100 >= pre.danmakuEventConf.negativeRatio) {
          await this.danmakuService.setDanProp(event.PID, 'Reported')
          await event.set('label', DanmakuEventLabel.VoteCreate).save()
          return resConstructor(-1, 'vote', '举报级别上升', event, false)
        } else if (ratio.negative * 100 >= pre.danmakuEventConf.positiveRatio) {
          return resConstructor(1, 'vote', '无弹幕操作', event)
        } else return resConstructor(0, 'vote', '无弹幕操作')
      }
    } else return
  }
}
