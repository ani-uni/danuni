export enum DanmakuEventAction {
  Like = 'like', // 点赞
  Dislike = 'dislike', // 点踩
  Report = 'report', // 举报
  Permit = 'permit', // 准许显示(去除 'Hide' 'Reported' 属性)
}

export enum DanmakuEventLabel {
  SystemCreate = 'auto',
  UserCreate = 'manual',
  VoteCreate = 'vote',
}
