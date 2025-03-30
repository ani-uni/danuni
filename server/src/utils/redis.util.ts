import type { RedisKeys } from '~/constants/cache.constant'

import { DEMO_MODE } from '~/app.config'

type Prefix = 'danuni' | 'danuni-demo'
const prefix = DEMO_MODE ? 'danuni-demo' : 'danuni'

export const getRedisKey = <T extends string = RedisKeys | '*'>(
  key: T,
  ...concatKeys: string[]
): `${Prefix}:${T}${string | ''}` => {
  return `${prefix}:${key}${
    concatKeys && concatKeys.length > 0 ? `:${concatKeys.join('_')}` : ''
  }`
}
