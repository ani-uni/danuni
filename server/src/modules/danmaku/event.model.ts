// import { omit } from 'lodash'
// import { Schema } from 'mongoose'
import type { DocumentType } from '@typegoose/typegoose'

import { BadRequestException } from '@nestjs/common'
import { modelOptions, post, pre, prop, Severity } from '@typegoose/typegoose'

import { DANMAKU_EVENT_COLLECTION_NAME } from '~/constants/db.constant'
import { BaseModel } from '~/shared/model/base.model'

import { DanmakuEventAction, DanmakuEventLabel } from './event.constant'

export type DanmakuEventDocument = DocumentType<DanmakuEventModel>

export class DanmakuEventVoteModel {
  @prop({ required: true })
  uid: string

  @prop({ required: true, min: 0, max: 10 })
  weight: number

  @prop({ required: true })
  action: number
}

// export class DanmakuEventVoteModel {
//   // @prop({ min: 0, default: 0 })
//   @prop({ type: DanmakuEventVoteUserModel })
//   positiveList: DanmakuEventVoteUserModel[]

//   // @prop({ min: 0, default: 0 })
//   @prop({ type: DanmakuEventVoteUserModel })
//   neutralList: DanmakuEventVoteUserModel[]

//   // @prop({ min: 0, default: 0 })
//   @prop({ type: DanmakuEventVoteUserModel })
//   negativeList: DanmakuEventVoteUserModel[]

// }

@modelOptions({
  options: {
    customName: DANMAKU_EVENT_COLLECTION_NAME,
    allowMixed: Severity.ALLOW,
  },
})
@pre<DanmakuEventModel>(/\*/, function () {
  if (this.PID.startsWith('dm_')) this.PID = this.PID.slice(3)
  else if (this.PID.startsWith('ep_') || this.PID.startsWith('so_'))
    throw new BadRequestException('PID must start with "dm_" or "".')
})
@post<DanmakuEventModel>(/\*/, function () {
  if (this.PID) this.PID = `dm_${this.PID}`
})
export class DanmakuEventModel extends BaseModel {
  @prop({ required: true, unique: true })
  PID: string

  @prop({ required: true, enum: DanmakuEventAction })
  action: string

  @prop({ required: true, enum: DanmakuEventLabel })
  label: string

  @prop({ required: true, default: true })
  pub: boolean

  @prop({ type: DanmakuEventVoteModel })
  votes: DanmakuEventVoteModel[]

  @prop()
  reason?: string

  toStatistics() {
    return DanmakuEventTools.toStatistics(this)
  }
  toRatio() {
    return DanmakuEventTools.toRatio(this)
  }
}

export interface DanmakuEventModelStatisfied {
  votes: DanmakuEventVoteModel[]
}
export const DanmakuEventTools = {
  toStatistics(e: DanmakuEventModelStatisfied) {
    const votes = {
      positive: 0,
      neutral: 0,
      negative: 0,
    }
    e.votes?.forEach((i) => {
      if (i.action === 1) {
        votes.positive += i.weight
      } else if (i.action === 0) {
        votes.neutral += i.weight
      } else if (i.action === -1) {
        votes.negative += i.weight
      }
    })
    return votes
  },
  toRatio(e: DanmakuEventModelStatisfied) {
    const votes = this.toStatistics(e),
      total = votes.positive + votes.neutral + votes.negative
    return {
      positive: votes.positive / total,
      neutral: votes.neutral / total,
      negative: votes.negative / total,
    }
  },
}
