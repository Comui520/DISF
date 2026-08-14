<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2>结果浏览</h2>
        <p>
          只读浏览 NAD 仓库已有图片与文本产物。日常探索优先用证据库；这里适合快速翻目录和读报告。
        </p>
      </div>
      <div>
        <el-button @click="$router.push({ name: 'evidence' })">打开证据库</el-button>
        <el-select
          v-model="relDir"
          style="width: 260px; margin: 0 8px"
          filterable
          allow-create
          default-first-option
          @change="load"
        >
          <el-option
            v-for="dir in presetDirs"
            :key="dir"
            :label="dir"
            :value="dir"
          />
        </el-select>
        <el-button type="primary" :loading="loading" @click="load">刷新</el-button>
      </div>
    </div>

    <div class="panel" style="margin-bottom: 16px">
      <el-tabs v-model="tab">
        <el-tab-pane label="图片产物" name="images">
          <div v-if="!images.length" class="empty">当前目录暂无图片</div>
          <div class="img-grid" v-else>
            <div v-for="img in images" :key="img.path" class="img-item">
              <button type="button" class="img-open" @click="openImage(img)">
                <img :src="api.fileUrl(img.path)" :alt="img.name" loading="lazy" />
              </button>
              <div class="cap mono">{{ img.name }}</div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="文本报告" name="text">
          <div class="text-browser">
            <aside class="text-browser__list">
              <p class="text-browser__hint">
                从当前目录自动列出报告 / 日志。点一项即可预览，无需手填路径。
              </p>
              <button
                v-for="file in texts"
                :key="file.path"
                type="button"
                class="text-browser__item"
                :class="{ 'is-active': file.path === textPath }"
                @click="openText(file.path)"
              >
                <strong>{{ file.name }}</strong>
                <span class="mono">{{ file.path }}</span>
              </button>
              <p v-if="!texts.length" class="empty">当前目录没有 txt / md / log / csv / json</p>
            </aside>
            <div class="text-browser__preview">
              <div class="text-browser__preview-head">
                <span class="mono">{{ textPath || '尚未选择文件' }}</span>
                <a
                  v-if="textPath"
                  :href="api.fileUrl(textPath)"
                  target="_blank"
                  rel="noreferrer"
                >新窗口打开</a>
              </div>
              <div class="log-box">{{ textContent || '选择左侧文件查看内容' }}</div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="UNSW 结果" name="unsw">
          <el-table :data="unsw.files || []" stripe>
            <el-table-column prop="name" label="文件" width="220" />
            <el-table-column prop="path" label="路径" min-width="320" />
            <el-table-column prop="size" label="大小" width="100" />
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button
                  v-if="isText(row.path)"
                  link
                  type="primary"
                  @click="openText(row.path)"
                >查看</el-button>
                <a v-else :href="api.fileUrl(row.path)" target="_blank">打开</a>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { api } from '@/api'
import { inferArtifactMeta } from '@/utils/artifacts.js'
import { workspaceLocation } from '@/utils/workspace.js'

const presetDirs = [
  'results',
  'results/similarSubArch',
  'results/causal_intervention',
  'results/fuzzing',
  'results/figures',
  'image',
]

const loading = ref(false)
const tab = ref('images')
const relDir = ref('results/similarSubArch')
const images = ref([])
const texts = ref([])
const unsw = ref({ files: [] })
const textPath = ref('')
const textContent = ref('')
const router = useRouter()

function isText(p) {
  return /\.(txt|md|log|csv|json)$/i.test(p)
}

function openImage(img) {
  if (!img?.path) return
  const meta = inferArtifactMeta(img)
  router.push(
    workspaceLocation('case', {
      model: meta.model,
      stage: meta.stage,
      classA: meta.classA,
      classB: meta.classB,
      artifact: img.path,
      panel: 'image',
    }),
  )
}

async function load() {
  loading.value = true
  try {
    const [imageItems, textItems, unswData] = await Promise.all([
      api.artifactImages(relDir.value, 120, { images_only: true }),
      api.artifactImages(relDir.value, 200, {
        images_only: false,
        texts_only: true,
      }),
      api.unswResults(),
    ])
    images.value = imageItems
    texts.value = [...textItems].sort((left, right) => {
      const rank = (path) => {
        const lower = String(path || '').toLowerCase()
        if (/report|comparison|summary|readme/.test(lower)) return 0
        if (/result\.txt$/.test(lower)) return 2
        return 1
      }
      return rank(left.path) - rank(right.path) || String(left.path).localeCompare(String(right.path))
    })
    unsw.value = unswData
    if (textPath.value && !texts.value.some((item) => item.path === textPath.value)) {
      textContent.value = ''
    }
  } finally {
    loading.value = false
  }
}

async function openText(path) {
  if (!path) return
  textPath.value = path
  tab.value = 'text'
  const data = await api.artifactText(path)
  textContent.value = data.content || ''
  if (data.truncated) ElMessage.info('内容已截断显示')
}

onMounted(load)
</script>

<style scoped>
.empty {
  color: var(--muted);
}
.cap {
  margin-top: 6px;
  font-size: 11px;
  color: var(--muted);
  word-break: break-all;
}
.img-open {
  display: block;
  width: 100%;
  padding: 0;
  background: transparent;
  border: 0;
  cursor: pointer;
}
.text-browser {
  display: grid;
  grid-template-columns: minmax(14rem, 20rem) minmax(0, 1fr);
  gap: 16px;
  min-height: 420px;
}
.text-browser__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 560px;
  overflow: auto;
  padding-right: 4px;
}
.text-browser__hint {
  margin: 0 0 4px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}
.text-browser__item {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  text-align: left;
  color: inherit;
  background: var(--color-surface, #fff);
  border: 1px solid var(--line);
  border-radius: 10px;
  cursor: pointer;
}
.text-browser__item strong {
  font-size: 13px;
}
.text-browser__item span {
  color: var(--muted);
  font-size: 11px;
  word-break: break-all;
}
.text-browser__item.is-active {
  border-color: var(--color-accent-border, #91c7bf);
  background: var(--color-accent-soft, #d9efeb);
}
.text-browser__preview {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 10px;
  min-width: 0;
}
.text-browser__preview-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  color: var(--muted);
  font-size: 12px;
}
.text-browser__preview .log-box {
  min-height: 360px;
}
@media (max-width: 900px) {
  .text-browser {
    grid-template-columns: 1fr;
  }
}
</style>
