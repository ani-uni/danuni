import { BadRequestException } from '@nestjs/common'

type ctime = string | Date

interface O {
  // _id: null | undefined
  // id: null | undefined
  ctime: ctime
  EPID: string
  SOID: string
  DMID: string
  PID: string
  [key: string]: any
}

type IdType = 'ep' | 'so' | 'dm' | 'no'

export function checkID(
  id: string,
  acceptPrefix?: IdType[],
): { type: IdType; id: string } {
  const start = id.slice(0, 3)
  let ret: { type: IdType; id: string }
  switch (start) {
    case 'ep_':
      ret = { type: 'ep', id: id.slice(3) }
      break
    case 'so_':
      ret = { type: 'so', id: id.slice(3) }
      break
    case 'dm_':
      ret = { type: 'dm', id: id.slice(3) }
      break
    default:
      ret = { type: 'no', id }
      break
  }
  if (!acceptPrefix?.includes(ret.type as IdType))
    throw new BadRequestException(`ID格式错误(标识前缀不可为"${ret.type}_")`)
  return ret
  // if (id.startsWith('dm_')) return { type: 'dm', id: id.slice(3) }
  // else if (id.startsWith('ep_')) return { type: 'ep', id: id.slice(3) }
  // else if (id.startsWith('so_')) return { type: 'so', id: id.slice(3) }
  // else if (forcePrefix)
  //   throw new BadRequestException('ID格式错误(无"ep_"或"so_"或"dm_"标识前缀)')
  // else return { type: 'no', id }
}

export const IdPrefixPreHandlers = {
  ctime: (ctime: ctime) => (ctime ? new Date(ctime) : new Date()),
  ep: (id: string) => checkID(id, ['ep', 'no']).id,
  so: (id: string) => checkID(id, ['so', 'no']).id,
  dm: (id: string) => checkID(id, ['dm', 'no']).id,
  // ep: (id: string) => {
  //   const Id = checkID(id)
  //   if (Id.type === 'ep' || Id.type === 'no') return Id.id
  //   else throw new BadRequestException('EPID must start with "ep_" or "".')
  // },
  // so: (id: string) => {
  //   const Id = checkID(id)
  //   if (Id.type === 'so' || Id.type === 'no') return Id.id
  //   else throw new BadRequestException('SOID must start with "so_" or "".')
  // },
  // dm: (id: string) => {
  //   const Id = checkID(id)
  //   if (Id.type === 'dm' || Id.type === 'no') return Id.id
  //   else throw new BadRequestException('DMID must start with "dm_" or "".')
  // },
}

export const IdPrefixPreHandler = (obj: Partial<O>) => {
  // ;['ctime', 'EPID', 'SOID', 'DMID'].forEach((key) => {
  //   if (obj[key]) obj[key] = IdPrefixPreHandlers[key](obj[key])
  // })
  if (obj.ctime) obj.ctime = IdPrefixPreHandlers.ctime(obj.ctime)
  if (obj.EPID) obj.EPID = IdPrefixPreHandlers.ep(obj.EPID)
  if (obj.SOID) obj.SOID = IdPrefixPreHandlers.so(obj.SOID)
  if (obj.DMID) obj.DMID = IdPrefixPreHandlers.dm(obj.DMID)
  return obj as Partial<O> & { ctime?: Date }
}

export const IdPrefixPostHandler = (obj: Partial<O>) => {
  if (obj.EPID) obj.EPID = IdPrefixPostHandlers.ep(obj.EPID)
  if (obj.SOID) obj.SOID = IdPrefixPostHandlers.so(obj.SOID)
  if (obj.DMID) obj.DMID = IdPrefixPostHandlers.dm(obj.DMID)
  if (obj.PID) obj.PID = IdPrefixPostHandlers.dm(obj.PID)
  return obj
}

export const IdPrefixPostHandlers = {
  ep: (id: string) =>
    checkID(id, ['ep', 'no']).type === 'no' ? `ep_${id}` : id,
  so: (id: string) =>
    checkID(id, ['so', 'no']).type === 'no' ? `so_${id}` : id,
  dm: (id: string) =>
    checkID(id, ['dm', 'no']).type === 'no' ? `dm_${id}` : id,
}
