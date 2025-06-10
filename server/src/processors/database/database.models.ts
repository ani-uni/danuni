import { OptionModel } from '~/modules/configs/configs.model'
import { DanmakuModel } from '~/modules/danmaku/danmaku.model'
import { DanmakuEventModel } from '~/modules/danmaku/event.model'
import { MetaModel } from '~/modules/meta/meta.model'
import { MetaSourceModel } from '~/modules/meta/source.model'
import { getProviderByTypegooseClass } from '~/transformers/model.transformer'

export const databaseModels = [
  OptionModel,
  MetaModel,
  MetaSourceModel,
  DanmakuModel,
  DanmakuEventModel,
].map((model) => getProviderByTypegooseClass(model))
