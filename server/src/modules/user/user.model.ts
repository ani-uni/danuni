import { hashSync } from 'bcryptjs'
import { omit } from 'lodash'
import { Schema } from 'mongoose'
import type { DocumentType } from '@typegoose/typegoose'

import { modelOptions, prop, Severity } from '@typegoose/typegoose'

import { USER_COLLECTION_NAME } from '~/constants/db.constant'
import { BaseModel } from '~/shared/model/base.model'

export type UserDocument = DocumentType<UserModel>

export class OAuthModel {
  @prop()
  platform: string
  @prop()
  id: string
}

export class TokenModel {
  _id?: string
  @prop()
  created: Date

  @prop()
  token: string

  @prop()
  expired?: Date

  @prop({ unique: true })
  name: string
}

export enum Levels {
  GuestOrBan = 0,
  Min = 1,
  Low = 2,
  Default = 3,
  Mid4 = 4,
  Mid5 = 5,
  High6 = 6,
  High7 = 7,
  High8 = 8,
  Creator = 9,
  Admin = 10,
}

const securityKeys = [
  'oauth2',
  'apiToken',
  'lastLoginTime',
  'lastLoginIp',
  'password',
] as const
@modelOptions({
  options: { customName: USER_COLLECTION_NAME, allowMixed: Severity.ALLOW },
})
export class UserModel extends BaseModel {
  @prop({ required: true, unique: true, trim: true })
  username!: string

  @prop({ required: true, min: 0, max: 10, default: 3 })
  level!: Levels

  // @prop({ trim: true })
  // name!: string

  // @prop()
  // introduce?: string

  // @prop()
  // avatar?: string

  @prop({
    select: false,
    get(val) {
      return val
    },
    set(val) {
      return hashSync(val, 6)
    },
    required: true,
  })
  password!: string

  @prop()
  mail: string

  // @prop()
  // url?: string

  @prop()
  lastLoginTime?: Date

  @prop({ select: false })
  lastLoginIp?: string

  @prop({ type: Schema.Types.Mixed })
  socialIds?: any

  @prop({ type: TokenModel, select: false })
  apiToken?: TokenModel[]

  @prop({ type: OAuthModel, select: false })
  oauth2?: OAuthModel[]

  static securityKeys = securityKeys

  static serialize(doc: UserModel) {
    return omit(doc, this.securityKeys)
  }
}

type ReadonlyArrayToUnion<T extends readonly any[]> = T[number]

export type UserModelSecurityKeys = ReadonlyArrayToUnion<typeof securityKeys>
