import fs from 'node:fs'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { it } from 'vitest'

import { generateASS } from '../'
import { UniPool } from '../..'

const __dirname = dirname(fileURLToPath(import.meta.url))

it('generate ass from xml', () => {
  const filename = '898651903.xml'
  const xmlPath = path.join(__dirname, filename)
  const xmlText = fs.readFileSync(xmlPath, 'utf-8')
  const assText = generateASS(UniPool.fromBiliXML(xmlText), {
    // filename,
    // title: '我的忏悔',
  })
  fs.writeFileSync(path.join(__dirname, `${filename}.ass`), assText, 'utf-8')
})
