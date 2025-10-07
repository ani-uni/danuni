import fs from 'node:fs'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCanvas } from 'canvas'
import { it } from 'vitest'

import { generateASS } from '../'
import { UniPool } from '../..'

const __dirname = dirname(fileURLToPath(import.meta.url))

it('generate ass from xml', () => {
  const filename = '898651903.xml'
  const xmlPath = path.join(__dirname, filename)
  const xmlText = fs.readFileSync(xmlPath, 'utf8')
  const canvas = createCanvas(50, 50)
  const assText = generateASS(
    UniPool.fromBiliXML(xmlText),
    {
      // filename,
      // title: '我的忏悔',
    },
    canvas.getContext('2d') as unknown as CanvasRenderingContext2D,
  )
  fs.writeFileSync(path.join(__dirname, `${filename}.ass`), assText, 'utf8')
})
