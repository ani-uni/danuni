import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { ReturnModelType } from '@typegoose/typegoose'

import { InjectModel } from '~/transformers/model.transformer'

import { ConfigsService } from '../configs/configs.service'
import { MetaService } from '../meta/meta.service'
import { DanmakuService } from './danmaku.service'
import { DanmakuEventAction, DanmakuEventLabel } from './event.constant'
import { DanmakuEventDto } from './event.dto'
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
    private readonly eventModel: ReturnModelType<typeof DanmakuEventModel>,
    private readonly metaService: MetaService,
    private readonly danmakuService: DanmakuService,
    private readonly configService: ConfigsService,
  ) {}
  public get model() {
    return this.eventModel
  }

  fmtEvent(
    event:
      | DanmakuEventDocument
      | DanmakuEventModelStatisfied
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

  actionStr2Num(action: DanmakuEventAction) {
    switch (action) {
      case DanmakuEventAction.Like:
        return 1
      case DanmakuEventAction.Permit:
        return 1
      case DanmakuEventAction.Dislike:
        return -1
      case DanmakuEventAction.Report:
        return -1
      default:
        throw new BadRequestException('未知的操作')
    }
  }

  async canAccessEvent(
    event: string | DanmakuEventDocument,
    mode: 'view' | 'new' = 'view',
  ) {
    // event 为 PID 或 事件对象
    const isPID = typeof event === 'string',
      PID = isPID ? event : event.PID
    // dan = await this.danmakuService.getDan(PID)
    if (mode === 'new') {
      const dan = await this.danmakuService.getDan(PID)
      if (
        dan && //存在弹幕
        !dan.attr?.includes('Protect') && //弹幕不受保护
        !dan.attr?.includes('HasEvent') && //弹幕目前未创建事件
        // !dan.attr?.includes('Unchecked') && //弹幕已被检查
        // !dan.attr?.includes('Hide') && //弹幕非临时隐藏
        !this.danmakuService.fmtSingleDan(dan).isFrom3rdPlatform //且不来自3rd平台
      )
        return true //可以操作
      else return false
    }
    // mode === 'view'
    else if (!isPID && event.pub) return true
    else {
      const dan = await this.danmakuService.getDan(PID)
      if (await this.metaService.isMaintainer(dan.EPID)) return true
      else return false
    }
  }
  async preEvent() {
    const baseConf = await this.configService.get('base'),
      suffix = `@${baseConf.domain}`,
      danmakuEventConf = await this.configService.get('danmakuEvent')
    return { baseConf, suffix, danmakuEventConf }
  }

  // async getDanEvent(PID: string | DanmakuEventPIDDto, ctx: FastifyBizRequest) {
  async getDanEvent(PID?: string) {
    const realEvent = !PID
      ? await this.eventModel.findOne({ pub: true })
      : await this.eventModel.findOne({ PID })
    if (!realEvent || !(await this.canAccessEvent(realEvent)))
      throw new NotFoundException('未找到该事件')
    return realEvent
  }

  // async listDanEvent() {
  //   return this.fmtEvent(await this.eventModel.find().lean({ virtuals: true }))
  // }
  // async listDanEventByFCID(FCID: string, ctx: FastifyBizRequest) {
  // async listDanEvent(ID: string) {
  //   const canVisit = await this.metaService.isScopeAdmin(FCID, authn)
  //   if (!canVisit) throw new NotFoundException('未找到事件')
  //   const dans = (await this.danmakuService.listDanByFCID({ FCID })).dans
  //   if (dans.length === 0) throw new NotFoundException('未找到弹幕')
  //   const PIDs = dans.map((dan) => dan.PID)
  //   const events = await this.eventModel
  //     .find({ PID: { $in: PIDs } })
  //     .lean({ virtuals: true })
  //   return this.fmtEvent(events)
  // }

  // async operateDan(action: DanmakuEventDto, ctx: FastifyBizRequest) {
  async operateDan(action: DanmakuEventDto) {
    if (!action.PID) throw new BadRequestException('未找到该弹幕')
    let event = await this.eventModel.findOne({ PID: action.PID })
    if (!event) {
      if (!(await this.canAccessEvent(action.PID, 'new')))
        throw new BadRequestException('事件已存在 或 弹幕来自其它平台或受保护')
      event = await this.eventModel.create({
        ...action,
        label: DanmakuEventLabel.UserCreate,
        pub: true,
      })
      await this.danmakuService.setDanProp(event.PID, ['HasEvent'])
    }
    return this.voteAction(event, action.action)
  }

  async voteAction(
    event: string | DanmakuEventDocument,
    action: DanmakuEventAction,
  ) {
    if (typeof event === 'string') event = await this.getDanEvent(event)
    const authn = this.danmakuService.currentAuthn
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
    const v = {
      uid: authn.uid,
      weight: authn.weight,
      action: this.actionStr2Num(action),
    }
    if (!v) throw new BadRequestException('未知的操作')
    const res = await this.eventModel.updateOne(event._id, {
      $addToSet: {
        votes: v,
      },
    })
    if (res.acknowledged) {
      await this.finishEvent(event)
      return 'OK'
    } else throw new BadRequestException('投票失败')
  }

  async finishEvent(
    event: string | DanmakuEventDocument,
    actionStr?: DanmakuEventAction, // admin下使用该参数指定处理结果
  ) {
    if (typeof event === 'string') event = await this.getDanEvent(event)
    const action = actionStr ? this.actionStr2Num(actionStr) : undefined

    const rmHasEventAttr = async () =>
      await this.danmakuService.setDanProp(event.PID, ['HasEvent'], true)
    async function resConstructor(
      type: -1 | 0 | 1,
      operator: 'admin' | 'vote',
      mes?: string,
      event?: DanmakuEventDocument,
      done = true,
    ) {
      mes = mes ? `(${mes})` : mes
      done = done ? done : type === 0 ? false : true
      if (done && event) {
        await event.deleteOne()
        await rmHasEventAttr()
      }
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
        p: async (operator: 'admin' | 'vote') => {
          await this.danmakuService.setDanProp(
            event.PID,
            operator === 'admin' ? ['Hide', 'Reported'] : ['Reported'],
            true,
          )
        },
      }
      if (action === 1) {
        await acf.p('admin')
        return resConstructor(1, 'admin', '解除"Hide""Reported"属性', event)
      } else {
        const pre = await this.preEvent(),
          ratio = event.toRatio()
        if (event.votes.length < pre.danmakuEventConf.participantNum)
          return resConstructor(0, 'vote', '参与人数过少,无弹幕操作')
        else if (ratio.positive * 100 >= pre.danmakuEventConf.positiveRatio) {
          await acf.p('vote')
          return resConstructor(1, 'vote', '解除"Reported"属性', event)
        }
      }
    } else if (event.action === DanmakuEventAction.Like) {
      if (action === 1) {
        await this.danmakuService.setDanProp(event.PID, ['HighLike'])
        return resConstructor(1, 'admin', '高赞', event)
      } else {
        const pre = await this.preEvent(),
          ratio = event.toRatio()
        if (event.votes.length < pre.danmakuEventConf.participantNum)
          return resConstructor(0, 'vote', '参与人数过少,无弹幕操作')
        else if (ratio.positive * 100 >= pre.danmakuEventConf.positiveRatio) {
          await this.danmakuService.setDanProp(event.PID, ['HighLike'])
          return resConstructor(1, 'vote', '高赞', event)
        } else if (ratio.positive * 100 >= pre.danmakuEventConf.negativeRatio) {
          return resConstructor(-1, 'vote', '无弹幕操作', event)
        }
      }
    } else if (event.action === DanmakuEventAction.Report) {
      if (action === -1) {
        await this.danmakuService.delDan(event.PID)
        return resConstructor(-1, 'admin', '删除/隐藏弹幕', event)
      } else {
        const pre = await this.preEvent(),
          ratio = event.toRatio()
        if (event.votes.length < pre.danmakuEventConf.participantNum)
          return resConstructor(0, 'vote', '参与人数过少,无弹幕操作')
        else if (ratio.negative * 100 >= pre.danmakuEventConf.autoDelRatio) {
          await this.danmakuService.delDan(event.PID)
          return resConstructor(-1, 'vote', '删除弹幕', event)
        } else if (ratio.negative * 100 >= pre.danmakuEventConf.negativeRatio) {
          await this.danmakuService.setDanProp(event.PID, ['Reported'])
          await event.set('label', DanmakuEventLabel.VoteCreate).save()
          return resConstructor(
            -1,
            'vote',
            '举报级别上升(弹幕添加"Reported"属性)',
            event,
            false,
          )
        } else if (ratio.negative * 100 >= pre.danmakuEventConf.positiveRatio) {
          return resConstructor(1, 'vote', '无弹幕操作', event)
        }
      }
    }
    return resConstructor(0, 'vote', '无弹幕操作')
  }
}
