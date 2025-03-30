// import { omit } from 'lodash'
// import { Schema } from 'mongoose'
import type { DocumentType } from '@typegoose/typegoose'

// import { DMAttr, Modes, Pools } from '@dan-uni/dan-any/src/utils/dm-gen'
// import { createDMID, platfrom } from '@dan-uni/dan-any/src/utils/id-gen'
import { platfrom, UniDMTools, UniIDTools } from '@dan-uni/dan-any'
import { ConflictException } from '@nestjs/common'
import {
  getModelForClass,
  modelOptions,
  pre,
  prop,
  Severity,
} from '@typegoose/typegoose'

import { DANMAKU_COLLECTION_NAME } from '~/constants/db.constant'
import { BaseModel } from '~/shared/model/base.model'

const { createDMID } = UniIDTools

export type DanmakuDocument = DocumentType<DanmakuModel>

@modelOptions({
  options: { customName: DANMAKU_COLLECTION_NAME, allowMixed: Severity.ALLOW },
  // schemaOptions: {
  //   timestamps: false,
  // },
})
@pre<DanmakuModel>('validate', async function () {
  if (!this.ctime) this.ctime = new Date().toISOString()
  else this.ctime = new Date(this.ctime).toISOString()
  if (!this.DMID)
    this.DMID = createDMID(this.content, this.senderID, this.ctime)
  const danmakuModel = getModelForClass(DanmakuModel)
  const hasDMID = await danmakuModel
    .findOne({ FCID: this.FCID, DMID: this.DMID })
    .lean({ virtuals: true })
  if (hasDMID?.FCID && hasDMID.DMID)
    throw new ConflictException('DMID already exists')
})
// @pre<DanmakuModel>('replaceOne', function () {
//   this.DMID = createDMID(this.content, this.senderID, this.ctime)
// })
// @pre<DanmakuModel>('updateMany', function () {
//   this.DMID = createDMID(this.content, this.senderID, this.ctime)
// })
// @pre<DanmakuModel>('updateOne', function () {
//   this.DMID = createDMID(this.content, this.senderID, this.ctime)
// })
// @pre<DanmakuModel>('findOneAndReplace', function () {
//   this.DMID = createDMID(this.content, this.senderID, this.ctime)
// })
// @pre<DanmakuModel>('findOneAndUpdate', function () {
//   this.DMID = createDMID(this.content, this.senderID, this.ctime)
// })
// @pre<DanmakuModel>(['updateOne'], function () {
//   this.DMID = createDMID(this.content, this.senderID, this.ctime)
// })
export class DanmakuModel extends BaseModel {
  @prop({ required: true, trim: true })
  DMID!: string

  @prop({ required: true, trim: true })
  FCID!: string

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
  platfrom?: platfrom

  @prop({ trim: true })
  SPMO?: string

  @prop({ trim: true })
  extraStr?: string
}
