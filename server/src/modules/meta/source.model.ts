import type { DocumentType } from '@typegoose/typegoose'

import { platform as PF } from '@dan-uni/dan-any'
import { modelOptions, prop, Severity } from '@typegoose/typegoose'

import { META_SOURCE_COLLECTION_NAME } from '~/constants/db.constant'
import { BaseModel } from '~/shared/model/base.model'

import { HashAlgorithm } from './source.constant'

export type MetaSourceDocument = DocumentType<MetaSourceModel>

class MetaSourceHashModel {
  @prop({ required: true, trim: true })
  hash!: string

  @prop({ required: true, trim: true, enum: HashAlgorithm })
  algorithm!: string

  // @prop({ default: 1 })
  // vote: number

  @prop({ default: false })
  exact?: boolean
}

class MetaSourceInfoModel {
  @prop({ required: true, trim: true, unique: true })
  platform: PF.PlatformDanmakuSource

  @prop({ required: true, trim: true, unique: true })
  id: string
}

@modelOptions({
  options: {
    customName: META_SOURCE_COLLECTION_NAME,
    allowMixed: Severity.ALLOW,
  },
})
export class MetaSourceModel extends BaseModel {
  @prop({ required: true, trim: true })
  EPID!: string
  // EPID!: ObjectId

  @prop({ required: true, unique: true, trim: true })
  SOID!: string

  @prop({ trim: true })
  subGroup?: string

  @prop({ type: MetaSourceHashModel })
  hash?: MetaSourceHashModel[]

  @prop({ type: MetaSourceInfoModel, _id: false })
  externalIds?: MetaSourceInfoModel[]
}
