export enum PlatformInfoSource {
  Bangumi = 'bgm',
  TMDB = 'tmdb',
}
export const PlatformInfoSources = Object.values(PlatformInfoSource)

export enum PlatformVideoSource {
  Acfun = 'acfun',
  Baha = 'baha',
  Bilibili = 'bili',
  BilibiliGlobal = 'bglobal',
  Iqiyi = 'iqiyi',
  Tencent = 'tencent',
  Youku = 'youku',
}
export const PlatformVideoSources = Object.values(PlatformVideoSource)

export enum PlatformDanmakuOnlySource {
  DanDanPlay = 'ddplay',
  TuCao = 'tucao',
}
export const PlatformDanmakuOnlySources = Object.values(
  PlatformDanmakuOnlySource,
)

export type PlatformDanmakuSource =
  | PlatformVideoSource
  | PlatformDanmakuOnlySource
export const PlatformDanmakuSources = [
  ...PlatformVideoSources,
  ...PlatformDanmakuOnlySources,
]

export type PlatformSource = PlatformInfoSource | PlatformDanmakuSource
export const PlatformSources = [
  ...PlatformInfoSources,
  ...PlatformDanmakuSources,
]
