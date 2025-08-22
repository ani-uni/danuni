import type { Config as DeTaoLuConfig } from './pakku.js'

import { UniDM, UniDMTools, UniPool } from '@dan-uni/dan-any'

import pakkujs from './pakku.js'

async function detaolu(that: UniPool, config?: DeTaoLuConfig) {
  const p = await pakkujs(
    {
      objs: that.dans.map((d) => ({
        time_ms: d.progress * 1000,
        mode: d.mode, //TODO
        content: d.content,
        pool: d.pool,
        // danuni_sender: d.senderID,
        danuni_dan: d,
      })),
    },
    config,
  )
  const selected = p.clusters.map((p) => {
    if (p.danuni_dans.length === 1) {
      return p.danuni_dans[0].danuni_dan
    } else {
      const dans = p.danuni_dans
      const pool = new UniPool(dans.map((d) => d.danuni_dan))
      function isAllBottomMode(p: UniPool) {
        return p.dans.every((d) => d.mode === UniDMTools.Modes.Bottom)
      }
      const progess = pool.dans.map((d) => d.progress)
      return UniDM.create({
        SOID: pool.shared.SOID ?? pool.dans[0].SOID,
        progress: dans[0].danuni_dan.progress,
        mode:
          pool.shared.mode ??
          (isAllBottomMode(pool)
            ? UniDMTools.Modes.Bottom
            : UniDMTools.Modes.Top),
        fontsize: dans.length > 0 ? 36 : 25,
        color: pool.shared.color ?? pool.most.color,
        senderID: 'detaolu[bot]@dan-any',
        content: p.chosen_str,
        weight: 10,
        pool: pool.shared.pool ?? pool.most.pool,
        attr: [UniDMTools.DMAttr.Protect],
        platform: pool.shared.platform ?? pool.most.platform,
        extra: {
          danuni: {
            merge: {
              count: p.danuni_count,
              duration: Number.parseFloat(
                (Math.max(...progess) - Math.min(...progess)).toFixed(3),
              ),
              senders: pool.dans
                .filter((d) => d.content === p.chosen_str)
                .map((d) => d.senderID),
              taolu_count: pool.dans.length,
              taolu_senders: pool.dans.map((d) => d.senderID),
            },
          },
        },
      })
    }
  })
  return new UniPool(selected)
}

function detaolu_constructor(config?: DeTaoLuConfig) {
  return (that: UniPool) => detaolu(that, config)
}

export default detaolu_constructor
