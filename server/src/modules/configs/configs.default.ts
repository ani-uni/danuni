import type { IConfig } from './configs.interface'

export const generateDefaultConfig: () => IConfig = () => ({
  base: {
    domain: 'localhost',
    title: 'DanUni',
    description: '弹幕有你',
  },
  oauth2: {
    units: [],
  },
  botAuth: {
    units: [],
  },
  scope: {
    // Lv1 1d
    lv1: 1,
    // Lv2 6mon
    lv2: 30 * 6,
    // Lv3 1y
    lv3: 30 * 12,
    // Lv4 2y
    lv4: 30 * 12 * 2,
    // Lv5 3y
    lv5: 30 * 12 * 3,
    // Lv6 5y
    lv6: 30 * 12 * 5,
  },
  meta: {},
  danmaku: {
    inBufferTime: 60 * 2,
  },
  danmakuEvent: {
    participantNum: 5,
    positiveRatio: 50,
    negativeRatio: 30,
    autoDelRatio: 80,
  },
})
