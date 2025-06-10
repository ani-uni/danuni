// import { omit } from 'lodash'
// import { Schema } from 'mongoose'

// import { platfrom } from '@dan-uni/dan-any/src/utils/id-gen'
import type { platform as PF } from '@dan-uni/dan-any'
import type { DocumentType } from '@typegoose/typegoose'

import { index, modelOptions, prop, Severity } from '@typegoose/typegoose'

import {
  META_COLLECTION_NAME,
  // META_HASH_COLLECTION_NAME,
} from '~/constants/db.constant'
import { BaseModel } from '~/shared/model/base.model'

// class UniNodeModel {
//   @prop()
//   domain: string

//   @prop()
//   pub: string
// }
export type MetaDocument = DocumentType<MetaModel>
// export type HashDocument = DocumentType<MetaHashModel>

// @modelOptions({
//   options: { customName: META_COLLECTION_NAME, allowMixed: Severity.ALLOW },
// })
// export class MetaHashModel extends BaseModel {
// class MetaHashModel {
//   // @prop({ required: true, unique: true, trim: true })
//   // FCID: string

//   @prop({ required: true, trim: true })
//   hash: string

//   @prop({ default: 1 })
//   vote: number

//   @prop({ default: false })
//   exact: boolean
// }

// class thirdPlatformModel {
//   @prop({ required: true, unique: true, trim: true })
//   platform: platfrom

//   @prop({ required: true, trim: true })
//   id: string
// }

@index(
  { platform: 1 },
  { unique: true, partialFilterExpression: { platform: { $type: 'string' } } },
)
class MetaInfoModel {
  @prop({ required: true, trim: true })
  platform: PF.PlatformInfoSource

  /**
   * - bgm?: number // bgm.tv的epid
   * - tmdb?: string // TMDB的path 如: tv/{series_id}/season/{season_number}/episode/{episode_number}
   */
  @prop({ required: true, trim: true })
  id: string
}

@modelOptions({
  options: { customName: META_COLLECTION_NAME, allowMixed: Severity.ALLOW },
})
export class MetaModel extends BaseModel {
  @prop({ required: true, unique: true, trim: true })
  EPID!: string

  @prop()
  duration?: number

  @prop({ trim: true })
  maintainer?: string

  @prop({ type: MetaInfoModel })
  externalIds?: MetaInfoModel[]

  @prop()
  pgc: boolean

  // fmt() {
  //   this.hashes = this.hashes?.sort((a, b) => b.vote - a.vote)
  // }
}
