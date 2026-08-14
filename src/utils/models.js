const DATASET_LABELS = Object.freeze({
  place: 'Places',
  unsw: 'UNSW',
})

export const FALLBACK_REGISTERED_MODELS = Object.freeze([
  Object.freeze({ net: 'vgg16', name: 'VGG16', dataset: 'place' }),
  Object.freeze({ net: 'resnet50', name: 'ResNet50', dataset: 'place' }),
  Object.freeze({ net: 'cnn_bilstm', name: 'CNN-BiLSTM', dataset: 'unsw' }),
])

const asText = (value) => String(value ?? '').trim()

export const modelOptionLabel = (row = {}) => {
  const name = asText(row.name) || asText(row.net)
  const dataset = DATASET_LABELS[row.dataset] || asText(row.dataset)
  return [name, dataset].filter(Boolean).join(' · ')
}

export const mergeModelOptions = (registered = [], discoveredNets = []) => {
  const options = []
  const seen = new Set()

  for (const row of registered) {
    const net = asText(row?.net)
    if (!net) continue
    const key = net.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const option = {
      net,
      name: asText(row.name) || net,
      dataset: asText(row.dataset),
    }
    option.label = modelOptionLabel(option)
    options.push(option)
  }

  const extras = []
  for (const net of discoveredNets) {
    const key = asText(net)
    if (!key || seen.has(key.toLowerCase())) continue
    seen.add(key.toLowerCase())
    const option = { net: key, name: key, dataset: '' }
    option.label = modelOptionLabel(option)
    extras.push(option)
  }
  extras.sort((left, right) => left.net.localeCompare(right.net))
  return [...options, ...extras]
}
