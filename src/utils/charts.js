const asNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export const matrixHeatmapSeries = (matrix = {}) => {
  const points = Array.isArray(matrix.points) ? matrix.points : []
  const classIds = Array.isArray(matrix.class_ids)
    ? matrix.class_ids.map((id) => Number(id)).filter(Number.isFinite)
    : [
        ...new Set(
          points.flatMap((point) => [asNumber(point.x), asNumber(point.y)]),
        ),
      ].filter((id) => id !== null)

  const indexOf = new Map(classIds.map((id, index) => [id, index]))
  const data = points
    .map((point) => {
      const x = asNumber(point.x)
      const y = asNumber(point.y)
      const value = asNumber(point.value)
      if (x === null || y === null || value === null) return null
      if (!indexOf.has(x) || !indexOf.has(y)) return null
      return [indexOf.get(x), indexOf.get(y), value]
    })
    .filter(Boolean)

  return {
    classIds,
    data,
    min: data.length ? Math.min(...data.map((item) => item[2])) : 0,
    max: data.length ? Math.max(...data.map((item) => item[2])) : 1,
  }
}

export const similarityPairBars = (matrix = {}, { limit = 12 } = {}) => {
  const seen = new Set()
  const points = (Array.isArray(matrix.points) ? matrix.points : [])
    .map((point) => ({
      classA: asNumber(point.x),
      classB: asNumber(point.y),
      value: asNumber(point.value),
    }))
    .filter(
      (point) =>
        point.classA !== null &&
        point.classB !== null &&
        point.value !== null &&
        point.classA !== point.classB,
    )
    .map((point) => {
      const [classA, classB] =
        point.classA <= point.classB
          ? [point.classA, point.classB]
          : [point.classB, point.classA]
      return { ...point, classA, classB }
    })
    .filter((point) => {
      const key = `${point.classA}:${point.classB}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((left, right) => right.value - left.value)
    .slice(0, Math.max(0, limit))

  return {
    labels: points.map((point) => `${point.classA} ↔ ${point.classB}`),
    values: points.map((point) => point.value),
    pairs: points,
  }
}

export const causalChannelSeries = (pair = {}) => {
  const channels = Array.isArray(pair.top_channels) ? pair.top_channels : []
  const rows = channels
    .map((channel) => ({
      channel: asNumber(channel.channel),
      effectA: asNumber(channel.effect_a) ?? 0,
      effectB: asNumber(channel.effect_b) ?? 0,
      score: asNumber(channel.causal_score),
    }))
    .filter((row) => row.channel !== null)
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))

  return {
    labels: rows.map((row) => `ch ${row.channel}`),
    effectA: rows.map((row) => row.effectA),
    effectB: rows.map((row) => row.effectB),
    rows,
  }
}

export const buildHeatmapOption = (matrix = {}) => {
  const series = matrixHeatmapSeries(matrix)
  return {
    animation: false,
    tooltip: {
      formatter: (params) => {
        const [xIndex, yIndex, value] = params.data || []
        const x = series.classIds[xIndex]
        const y = series.classIds[yIndex]
        return `类别 ${x} ↔ ${y}<br/>相似度 ${Number(value).toFixed(3)}`
      },
    },
    grid: { left: 48, right: 24, top: 24, bottom: 48 },
    xAxis: {
      type: 'category',
      data: series.classIds.map(String),
      splitArea: { show: true },
    },
    yAxis: {
      type: 'category',
      data: series.classIds.map(String),
      splitArea: { show: true },
    },
    visualMap: {
      min: series.min,
      max: series.max,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: {
        color: ['#edf1ed', '#7fb9b1', '#0b7f75', '#0a222c'],
      },
    },
    series: [
      {
        type: 'heatmap',
        data: series.data,
        emphasis: {
          itemStyle: {
            shadowBlur: 8,
            shadowColor: 'rgba(10, 34, 44, 0.35)',
          },
        },
      },
    ],
  }
}

export const buildPairBarsOption = (matrix = {}, options = {}) => {
  const series = similarityPairBars(matrix, options)
  return {
    animation: false,
    tooltip: { trigger: 'axis' },
    grid: { left: 48, right: 16, top: 24, bottom: 64 },
    xAxis: {
      type: 'category',
      data: series.labels,
      axisLabel: { rotate: 35 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 1,
      name: '相似度',
    },
    series: [
      {
        type: 'bar',
        data: series.values,
        itemStyle: { color: '#0b7f75' },
      },
    ],
  }
}

export const buildCausalChannelsOption = (pair = {}, labels = {}) => {
  const series = causalChannelSeries(pair)
  const labelA = labels.classA ?? 'A'
  const labelB = labels.classB ?? 'B'
  return {
    animation: false,
    tooltip: { trigger: 'axis' },
    legend: { data: [`效应 ${labelA}`, `效应 ${labelB}`] },
    grid: { left: 48, right: 16, top: 40, bottom: 48 },
    xAxis: {
      type: 'category',
      data: series.labels,
    },
    yAxis: {
      type: 'value',
      name: '效应',
    },
    series: [
      {
        name: `效应 ${labelA}`,
        type: 'bar',
        data: series.effectA,
        itemStyle: { color: '#0b7f75' },
      },
      {
        name: `效应 ${labelB}`,
        type: 'bar',
        data: series.effectB,
        itemStyle: { color: '#c58930' },
      },
    ],
  }
}
