import type { DocumentType } from '@typegoose/typegoose'

import { platform, UniDMTools } from '@dan-uni/dan-any'
import { modelOptions, prop, Severity } from '@typegoose/typegoose'

import { DANMAKU_COLLECTION_NAME } from '~/constants/db.constant'
import { BaseModel } from '~/shared/model/base.model'

export type DanmakuDocument = DocumentType<DanmakuModel>

@modelOptions({
  options: { customName: DANMAKU_COLLECTION_NAME, allowMixed: Severity.ALLOW },
})
export class DanmakuModel extends BaseModel {
  @prop({ alias: 'id' })
  DMID!: string

  @prop({ required: true, trim: true })
  SOID!: string

  @prop({ required: true, min: 0 })
  progress!: number

  @prop({ default: UniDMTools.Modes.Normal, enum: UniDMTools.Modes })
  mode?: number

  @prop({ default: 25, min: 1 })
  fontsize?: number

  @prop({ default: 16777215, min: 0 })
  color?: number

  @prop({ required: true, trim: true })
  senderID!: string

  @prop({ trim: true })
  content?: string

  // 或可直接调用 created 参数
  // @prop({ default: BigInt(Date.now()) })
  @prop({ required: true })
  ctime!: string
  // ctime?: bigint = BigInt(Number(this.created))

  @prop({ default: 5, min: 1, max: 10 })
  weight?: number

  @prop({ default: UniDMTools.Pools.Def, enum: UniDMTools.Pools })
  pool?: number

  @prop({ type: String })
  attr?: UniDMTools.DMAttr[]

  @prop({ trim: true })
  platform?: platform.PlatformDanmakuSource

  @prop({ trim: true })
  extraStr?: string
}
