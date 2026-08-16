<script lang="ts">
import { useElForm } from '@vformjs/element-ui'
import { r } from '@vformjs/vue'
import { computed, defineComponent, ref } from 'vue'

interface Line {
  country: string
  city: string
  sku: string
  qty: number
  price: number
  express: boolean
  trackingNo: string
}

interface Order {
  orderNo: string
  channel: string
  lines: Line[]
}

interface Option { label: string, value: string }

/** Fake endpoints. Each logs so the demo shows how often it is really hit. */
const calls = ref<string[]>([])
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchChannels(): Promise<Option[]> {
  calls.value.push('GET /channels')
  await wait(200)
  return [
    { label: '线上', value: 'online' },
    { label: '线下', value: 'offline' },
  ]
}

async function fetchCountries(): Promise<Option[]> {
  calls.value.push('GET /countries')
  await wait(200)
  return [
    { label: '中国', value: 'cn' },
    { label: '美国', value: 'us' },
  ]
}

const CITIES: Record<string, Option[]> = {
  cn: [
    { label: '杭州', value: 'hangzhou' },
    { label: '上海', value: 'shanghai' },
  ],
  us: [
    { label: 'Austin', value: 'austin' },
    { label: 'Seattle', value: 'seattle' },
  ],
}

async function fetchCities(country: string, signal: AbortSignal): Promise<Option[]> {
  calls.value.push(`GET /cities?country=${country || '-'}`)
  await wait(320)
  if (signal.aborted)
    return []
  return CITIES[country] ?? []
}

const emptyLine = (): Line => ({
  country: '',
  city: '',
  sku: '',
  qty: 1,
  price: 0,
  express: false,
  trackingNo: '',
})

export default defineComponent({
  name: 'DynamicTableDemo',
  setup() {
    const log = ref('')
    const serverFailNext = ref(true)

    const form = useElForm({
      defaults: (): Order => ({
        orderNo: '',
        channel: '',
        lines: [emptyLine()],
      }),

      // Row rules are declared once with `*`; vformjs materializes
      // lines.0.sku, lines.1.sku, ... whenever the array changes.
      rules: {
        orderNo: [r.required('请输入单号')],
        channel: [r.required('请选择渠道')],
        'lines.*.country': [r.required('必选')],
        'lines.*.city': [r.required('必选')],
        'lines.*.sku': [r.required('必填'), r.min(3, 'SKU 至少 3 位')],
        'lines.*.qty': [r.numberMin(1, '至少 1')],
      },

      // Conditional row rules read the current row through `item`.
      whenRules: {
        'lines.*.trackingNo': (_values, { item }) =>
          (item as Line).express ? [r.required('加急必须填运单号')] : null,
      },

      // Remote options, per row. `deps` uses the same `*` pattern, so each row
      // reloads from its own country and gets its own cache entry.
      optionSources: {
        channel: { key: () => 'dict:channel', load: fetchChannels },
        'lines.*.country': { key: () => 'dict:country', load: fetchCountries },
        'lines.*.city': {
          deps: ['lines.*.country'],
          load: ({ get, path, signal }) => {
            const country = get(path.replace(/\.city$/, '.country')) as string
            return country ? fetchCities(country, signal) : []
          },
        },
      },

      onSubmit: async (values) => {
        await wait(300)
        if (serverFailNext.value) {
          serverFailNext.value = false
          // Server-side field errors land on row paths like any other error.
          return {
            ok: false,
            error: '后端校验失败',
            errors: { 'lines.0.sku': ['该 SKU 已下架'] },
          }
        }
        log.value = JSON.stringify(values, null, 2)
      },
    })

    const lines = form.list<Line>('lines', { defaultItem: emptyLine })

    const total = computed(() =>
      form.model.lines.reduce((sum, line) => sum + line.qty * line.price, 0),
    )

    const cityState = (index: number) => form.options(`lines.${index}.city`)
    const countryState = (index: number) => form.options(`lines.${index}.country`)

    function loadExisting() {
      calls.value = []
      form.load('edit', {
        orderNo: 'SO-20260811',
        channel: 'online',
        lines: [
          { country: 'cn', city: 'shanghai', sku: 'SKU-001', qty: 2, price: 19.9, express: true, trackingNo: 'TN-1' },
          { country: 'us', city: 'austin', sku: 'SKU-002', qty: 5, price: 4.5, express: false, trackingNo: '' },
        ],
      })
      log.value = ''
    }

    function startNew() {
      calls.value = []
      form.load('create')
      log.value = ''
    }

    async function submit() {
      const result = await form.submit()
      if (!result.ok && 'submitError' in result)
        log.value = `submitError: ${String(result.submitError)}`
    }

    return {
      form,
      lines,
      total,
      calls,
      log,
      cityState,
      countryState,
      loadExisting,
      startNew,
      submit,
    }
  },
})
</script>

<template>
  <div>
    <div class="toolbar">
      <el-button size="small" @click="startNew">
        新增（create）
      </el-button>
      <el-button size="small" @click="loadExisting">
        载入已有单据（edit）
      </el-button>
      <el-tag size="small" :type="form.dirty ? 'warning' : 'success'">
        {{ form.dirty ? `dirty · ${form.changedPaths.length} 处` : 'clean' }}
      </el-tag>
      <el-tag size="small" type="info">
        mode: {{ form.mode }}
      </el-tag>
    </div>

    <el-form v-bind="form.host" size="small" label-width="90px">
      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="单号" v-bind="form.item('orderNo')">
            <el-input v-model="form.model.orderNo" :disabled="form.readonly" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="渠道" v-bind="form.item('channel')">
            <el-select
              v-model="form.model.channel"
              :loading="form.options('channel').value.loading"
              :disabled="form.readonly"
              clearable
            >
              <el-option
                v-for="opt in form.options('channel').value.items"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <!-- Dynamic rows: el-table rows, but each cell is a real el-form-item so
           element-ui owns the red text and the scroll-to-error target. -->
      <el-table :data="form.model.lines" border size="mini">
        <el-table-column type="index" width="46" />

        <el-table-column label="国家" width="150">
          <template slot-scope="{ $index }">
            <el-form-item
              v-bind="form.item(`lines.${$index}.country`)"
              label-width="0"
              class="cell-item"
            >
              <el-select
                v-model="form.model.lines[$index].country"
                :loading="countryState($index).value.loading"
                :disabled="form.readonly"
                clearable
              >
                <el-option
                  v-for="opt in countryState($index).value.items"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </template>
        </el-table-column>

        <el-table-column label="城市" width="160">
          <template slot-scope="{ $index }">
            <el-form-item
              v-bind="form.item(`lines.${$index}.city`)"
              label-width="0"
              class="cell-item"
            >
              <el-select
                v-model="form.model.lines[$index].city"
                :loading="cityState($index).value.loading"
                :disabled="form.readonly || !form.model.lines[$index].country"
                :placeholder="cityState($index).value.loading ? '加载中' : '请选择'"
                clearable
              >
                <el-option
                  v-for="opt in cityState($index).value.items"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </template>
        </el-table-column>

        <el-table-column label="SKU" width="170">
          <template slot-scope="{ $index }">
            <el-form-item
              v-bind="form.item(`lines.${$index}.sku`)"
              label-width="0"
              class="cell-item"
            >
              <el-input v-model="form.model.lines[$index].sku" :disabled="form.readonly" />
            </el-form-item>
          </template>
        </el-table-column>

        <el-table-column label="数量" width="110">
          <template slot-scope="{ $index }">
            <el-form-item
              v-bind="form.item(`lines.${$index}.qty`)"
              label-width="0"
              class="cell-item"
            >
              <el-input-number
                v-model="form.model.lines[$index].qty"
                :controls="false"
                :min="0"
                :disabled="form.readonly"
              />
            </el-form-item>
          </template>
        </el-table-column>

        <el-table-column label="单价" width="110">
          <template slot-scope="{ $index }">
            <el-form-item label-width="0" class="cell-item">
              <el-input-number
                v-model="form.model.lines[$index].price"
                :controls="false"
                :min="0"
                :precision="2"
                :disabled="form.readonly"
              />
            </el-form-item>
          </template>
        </el-table-column>

        <el-table-column label="加急" width="70">
          <template slot-scope="{ $index }">
            <el-form-item label-width="0" class="cell-item">
              <el-checkbox
                v-model="form.model.lines[$index].express"
                :disabled="form.readonly"
              />
            </el-form-item>
          </template>
        </el-table-column>

        <el-table-column label="运单号" min-width="150">
          <template slot-scope="{ $index }">
            <el-form-item
              v-bind="form.item(`lines.${$index}.trackingNo`)"
              label-width="0"
              class="cell-item"
            >
              <el-input
                v-model="form.model.lines[$index].trackingNo"
                :disabled="form.readonly || !form.model.lines[$index].express"
                :placeholder="form.model.lines[$index].express ? '加急必填' : '非加急可不填'"
              />
            </el-form-item>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="176" align="center">
          <template slot-scope="{ $index }">
            <el-button
              type="text"
              :disabled="form.readonly || $index === 0"
              @click="lines.move($index, $index - 1)"
            >
              上移
            </el-button>
            <el-button
              type="text"
              :disabled="form.readonly"
              @click="lines.insert($index + 1)"
            >
              插入
            </el-button>
            <el-button
              type="text"
              :disabled="form.readonly || form.model.lines.length === 1"
              @click="lines.remove($index)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="rows-footer">
        <el-button size="mini" :disabled="form.readonly" @click="lines.append()">
          新增行
        </el-button>
        <el-button size="mini" :disabled="form.readonly" @click="lines.clear()">
          清空
        </el-button>
        <span class="total">合计 {{ total.toFixed(2) }}</span>
      </div>

      <el-form-item label-width="0" class="submit-row">
        <el-button
          type="primary"
          size="small"
          :loading="form.submitting"
          :disabled="form.readonly"
          @click="submit"
        >
          提交
        </el-button>
        <el-button size="small" @click="form.reset()">
          重置
        </el-button>
        <el-button size="small" @click="form.reloadOptions()">
          重新拉取选项
        </el-button>
      </el-form-item>
    </el-form>

    <div class="panels">
      <div class="panel">
        <h4>行 key（数组稳定性）</h4>
        <pre>{{ lines.fields }}</pre>
      </div>
      <div class="panel">
        <h4>请求（去重后真实发出的）</h4>
        <pre>{{ calls.join('\n') || '—' }}</pre>
      </div>
      <div class="panel">
        <h4>errors</h4>
        <pre>{{ form.errors }}</pre>
      </div>
      <div class="panel">
        <h4>submit</h4>
        <pre>{{ log || '—' }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.rows-footer { display: flex; align-items: center; gap: 8px; margin: 12px 0; }
.total { margin-left: auto; font-weight: 600; }
.submit-row { margin-top: 4px; }
.panels { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 16px; }
.panel { border: 1px solid #ebeef5; border-radius: 8px; padding: 10px 12px; }
.panel h4 { margin: 0 0 6px; font-size: 13px; color: #606266; }
.panel pre { margin: 0; font-size: 12px; max-height: 190px; overflow: auto; }
/* Row cells need the error text to overlay, not to push the table around. */
.cell-item { margin-bottom: 0; }
.cell-item ::v-deep(.el-form-item__error) { position: static; }
</style>
