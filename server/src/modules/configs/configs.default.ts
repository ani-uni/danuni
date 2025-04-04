import type { IConfig } from './configs.interface'

// import { Levels } from '../user/user.model'

export const generateDefaultConfig: () => IConfig = () => ({
  // seo: {
  //   title: '我的小世界呀',
  //   description: '哈喽~欢迎光临',
  //   keywords: [],
  // },
  // url: {
  //   wsUrl: 'http://localhost:2333', // todo
  //   adminUrl: 'http://localhost:2333/proxy/qaqdmin',
  //   serverUrl: 'http://localhost:2333',
  //   webUrl: 'http://localhost:2323',
  // },
  // mailOptions: {
  //   enable: false,

  //   user: '',
  //   pass: '',
  //   options: {
  //     host: '',
  //     port: 465,
  //     secure: true,
  //   },
  // },
  // commentOptions: {
  //   antiSpam: false,
  //   disableComment: false,
  //   blockIps: [],
  //   disableNoChinese: false,
  //   recordIpLocation: true,
  //   spamKeywords: [],
  //   commentShouldAudit: false,
  // },
  // barkOptions: {
  //   enable: false,
  //   key: '',
  //   serverUrl: 'https://api.day.app',
  //   enableComment: true,
  //   enableThrottleGuard: false,
  // },
  // friendLinkOptions: { allowApply: true, allowSubPath: false },
  // backupOptions: {
  //   enable: DEMO_MODE ? false : true,
  //   endpoint: null!,
  //   region: null!,
  //   bucket: null!,
  //   secretId: null!,
  //   secretKey: null!,
  // },
  // baiduSearchOptions: { enable: false, token: null! },
  // algoliaSearchOptions: { enable: false, apiKey: '', appId: '', indexName: '' },
  // adminExtra: {
  //   enableAdminProxy: true,

  //   background: '',
  //   gaodemapKey: null!,
  // },
  // textOptions: {
  //   macros: true,
  // },
  // featureList: {
  //   emailSubscribe: false,
  // },
  // thirdPartyServiceIntegration: {
  //   xLogSiteId: '',
  //   githubToken: '',
  // },

  // authSecurity: {
  //   disablePasswordLogin: false,
  // },
  // ai: {
  //   enableAutoGenerateSummary: false,
  //   enableSummary: false,
  //   openAiEndpoint: '',
  //   openAiPreferredModel: 'gpt-3.5-turbo',
  //   openAiKey: '',
  //   aiSummaryTargetLanguage: 'auto',
  // },
  // oauth: {
  //   providers: [],
  //   secrets: {},
  //   public: {},
  // },
  oauth2: {
    units: [],
  },
  base: {
    domain: 'localhost',
  },
  scope: {
    // Lv1 1d
    danmakuSend: 1,
    danmakuEventIssue: 1,
    // Lv2 6mon
    metaHashVote: 30 * 6,
    // Lv3 1y
    metaHashNew: 30 * 12,
    danmakuEventVote: 30 * 12,
    // Lv4 2y
    danmakuSendChapter: 30 * 12 * 2,
    // Lv5 3y
    metaCreate: 30 * 12 * 3,
    danmakuSendAdv: 30 * 12 * 3,
    danmakuSendSub: 30 * 12 * 3,
    // Lv6 5y
    danmakuSendChapterPassCheck: 30 * 12 * 5,
    // No Auto Distribute
    danmakuSendAdvPassCheck: 0,
    danmakuSendSubPassCheck: 0,
  },
  meta: {
    // createMinLv: Levels.Creator,
  },
  danmaku: {
    inBufferTime: 60 * 2,
    // minLv: Levels.Default,
    // markChapterFullMinLv: Levels.Mid5,
    // extFullMinLv: Levels.High7,
  },
  danmakuEvent: {
    participantNum: 5,
    positiveRatio: 50,
    negativeRatio: 30,
    autoDelRatio: 80,
  },
})
