// import { USER_COLLECTION_NAME } from '~/constants/db.constant'
import { AUTH_JS_USER_COLLECTION } from '~/modules/auth/auth.constant'

import { getDatabaseConnection } from './database.util'

export const checkInit = async () => {
  const connection = await getDatabaseConnection()
  const db = connection.db!
  const isUserExist =
    (await db.collection(AUTH_JS_USER_COLLECTION).countDocuments()) > 0

  return isUserExist
  // return true
}
