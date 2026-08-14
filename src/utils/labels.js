const asId = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return Number(value)
  }
  return null
}

export const buildLabelMap = (rows = []) => {
  const map = new Map()
  for (const row of rows) {
    const id = asId(row?.id ?? row?.class_id ?? row?.classId)
    const name = String(row?.name ?? row?.label ?? '').trim()
    if (id === null || !name) continue
    map.set(id, name)
  }
  return map
}

export const formatClassId = (id, labelMap) => {
  const classId = asId(id)
  if (classId === null) return ''
  const name =
    labelMap instanceof Map ? labelMap.get(classId) : labelMap?.[classId]
  return name ? `${classId} ${name}` : String(classId)
}

export const formatClassPair = (classA, classB, labelMap) => {
  const a = asId(classA)
  const b = asId(classB)
  if (a !== null && b !== null) {
    return `${formatClassId(a, labelMap)} ↔ ${formatClassId(b, labelMap)}`
  }
  if (a !== null) return formatClassId(a, labelMap)
  if (b !== null) return formatClassId(b, labelMap)
  return ''
}
