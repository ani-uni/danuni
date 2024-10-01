import { factory } from '@innei/prettier'

export default {
  ...factory({
    importSort: true,
  }),
  importOrderParserPlugins: ['typescript', 'decorators-legacy'],
}
