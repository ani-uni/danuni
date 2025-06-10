import type { platform as PF } from '@dan-uni/dan-any'
import type { DocumentType } from '@typegoose/typegoose'

import { index, modelOptions, prop, Severity } from '@typegoose/typegoose'

import { META_COLLECTION_NAME } from '~/constants/db.constant'
import { BaseModel } from '~/shared/model/base.model'

export type MetaDocument = DocumentType<MetaModel>
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
}
