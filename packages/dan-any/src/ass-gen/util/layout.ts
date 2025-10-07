import type { UniPool } from '../..'
import type { CanvasCtx, Danmaku, SubtitleStyle } from '../types'

import { DanmakuType, FontSize } from '../types'
import { DanmakuList2UniPool, UniPool2DanmakuLists } from './danconvert'
import { arrayOfLength } from './lang'

// 计算一个矩形移进屏幕的时间（头进屏幕到尾巴进屏幕）
const computeScrollInTime = (
  rectWidth: number,
  screenWidth: number,
  scrollTime: number,
) => {
  const speed = (screenWidth + rectWidth) / scrollTime
  return rectWidth / speed
}

// 计算一个矩形在屏幕上的时间（头进屏幕到头离开屏幕）
const computeScrollOverTime = (
  rectWidth: number,
  screenWidth: number,
  scrollTime: number,
) => {
  const speed = (screenWidth + rectWidth) / scrollTime
  return screenWidth / speed
}

interface ScrollGrid {
  start: number
  end: number
  width: number
}

type FixGrid = number

interface DanmakuGrids {
  // [DanmakuType.SCROLL]: ScrollGrid[];
  // [DanmakuType.TOP]: FixGrid[];
  // [DanmakuType.BOTTOM]: FixGrid[];
  1: ScrollGrid[] // DanmakuType.SCROLL
  3: FixGrid[] // DanmakuType.TOP
  2: FixGrid[] // DanmakuType.BOTTOM
}

const splitGrids = ({
  fontSize,
  padding,
  playResY,
  bottomSpace,
}: {
  fontSize: number[]
  padding: number[]
  playResY: number
  bottomSpace: number
}): DanmakuGrids => {
  const defaultFontSize = fontSize[FontSize.NORMAL]
  const paddingTop = padding[0]
  const paddingBottom = padding[2]
  const linesCount = Math.floor(
    (playResY - bottomSpace) / (defaultFontSize + paddingTop + paddingBottom),
  )

  // 首先以通用的字号把屏幕的高度分成若干行，字幕只允许落在一个行里
  return {
    // 每一行里的数字是当前在这一行里的最后一条弹幕区域（算入padding）的右边离开屏幕的时间，
    // 这个时间和下一条弹幕的左边离开屏幕的时间相比较，能确定在整个弹幕的飞行过程中是否会相撞（不同长度弹幕飞行速度不同）|,
    // 当每一条弹幕加到一行里时，就会把这个时间算出来，获取新的弹幕时就可以判断哪一行是允许放的就放进去
    1: arrayOfLength(linesCount, {
      start: 0,
      end: 0,
      width: 0,
    }),
    // 对于固定的弹幕，每一行里都存放弹幕的消失时间，只要这行的弹幕没消失就不能放新弹幕进来
    3: arrayOfLength(linesCount, 0),
    2: arrayOfLength(linesCount, 0),
  }
}

export const measureTextWidthConstructor = (canvasContext: CanvasCtx) => {
  const supportTextMeasure = !!canvasContext.measureText('中')

  if (supportTextMeasure) {
    return (
      fontName: string,
      fontSize: number,
      bold: boolean,
      text: string,
    ) => {
      canvasContext.font = `${bold ? 'bold' : 'normal'} ${fontSize}px ${fontName}`
      const textWidth = canvasContext.measureText(text).width
      return Math.round(textWidth)
    }
  }

  console.warn(
    '[Warn] node-canvas is installed without text measure support, layout may not be correct',
  )
  return (_fontName: string, fontSize: number, _bold: boolean, text: string) =>
    text.length * fontSize
}

// 找到能用的行
const resolveAvailableFixGrid = (grids: FixGrid[], time: number) => {
  for (const [i, grid] of grids.entries()) {
    if (grid <= time) {
      return i
    }
  }

  return -1
}

const resolveAvailableScrollGrid = (
  grids: ScrollGrid[],
  rectWidth: number,
  screenWidth: number,
  time: number,
  duration: number,
) => {
  for (const [i, previous] of grids.entries()) {
    // 对于滚动弹幕，要算两个位置：
    //
    // 1. 前一条弹幕的尾巴进屏幕之前，后一条弹幕不能开始出现
    // 2. 前一条弹幕的尾巴离开屏幕之前，后一条弹幕的头不能离开屏幕
    const previousInTime =
      previous.start +
      computeScrollInTime(previous.width, screenWidth, duration)
    const currentOverTime =
      time + computeScrollOverTime(rectWidth, screenWidth, duration)

    if (time >= previousInTime && currentOverTime >= previous.end) {
      return i
    }
  }

  return -1
}

const initializeLayout = (config: SubtitleStyle, canvasCtx: CanvasCtx) => {
  const {
    playResX,
    playResY,
    fontName,
    fontSize,
    bold,
    padding,
    scrollTime,
    fixTime,
    bottomSpace,
  } = config
  const [paddingTop, paddingRight, paddingBottom, paddingLeft] = padding

  const defaultFontSize = fontSize[FontSize.NORMAL]
  const grids = splitGrids(config)
  const gridHeight = defaultFontSize + paddingTop + paddingBottom

  return (danmaku: Danmaku) => {
    const targetGrids = grids[danmaku.type as keyof DanmakuGrids]
    const danmakuFontSize = fontSize[danmaku.fontSizeType]
    const rectWidth =
      measureTextWidthConstructor(canvasCtx)(
        fontName,
        danmakuFontSize,
        bold,
        danmaku.content,
      ) +
      paddingLeft +
      paddingRight
    const verticalOffset =
      paddingTop + Math.round((defaultFontSize - danmakuFontSize) / 2)

    if (danmaku.type === DanmakuType.SCROLL) {
      const scrollGrids = targetGrids as ScrollGrid[]
      const gridNumber = resolveAvailableScrollGrid(
        scrollGrids,
        rectWidth,
        playResX,
        danmaku.time,
        scrollTime,
      )
      if (gridNumber < 0) {
        // console.warn(`[Warn] Collision ${danmaku.time}: ${danmaku.content}`)
        return null
      }
      targetGrids[gridNumber] = {
        width: rectWidth,
        start: danmaku.time,
        end: danmaku.time + scrollTime,
      }

      const top = gridNumber * gridHeight + verticalOffset
      const start = playResX + paddingLeft
      const end = -rectWidth

      return { ...danmaku, top, start, end }
    } else {
      const gridNumber = resolveAvailableFixGrid(
        targetGrids as FixGrid[],
        danmaku.time,
      )
      if (gridNumber < 0) {
        // console.warn(`[Warn] Collision ${danmaku.time}: ${danmaku.content}`)
        return null
      }
      if (danmaku.type === DanmakuType.TOP) {
        targetGrids[gridNumber] = danmaku.time + fixTime

        const top = gridNumber * gridHeight + verticalOffset
        // 固定弹幕横向按中心点计算
        const left = Math.round(playResX / 2)

        return { ...danmaku, top, left }
      }

      targetGrids[gridNumber] = danmaku.time + fixTime

      // 底部字幕的格子是留出`bottomSpace`的位置后从下往上算的
      const top =
        playResY -
        bottomSpace -
        gridHeight * gridNumber -
        gridHeight +
        verticalOffset
      const left = Math.round(playResX / 2)

      return { ...danmaku, top, left }
    }
  }
}

export const layoutDanmaku = (
  inputList: UniPool,
  config: SubtitleStyle,
  canvasCtx: CanvasCtx,
): UniPool => {
  const list = [...UniPool2DanmakuLists(inputList)].toSorted(
    (x, y) => x.time - y.time,
  )
  const layout = initializeLayout(config, canvasCtx)

  return DanmakuList2UniPool(list.map(layout).filter((danmaku) => !!danmaku))
}
