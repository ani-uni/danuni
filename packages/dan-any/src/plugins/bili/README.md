# Bili 插件

为 B 站（哔哩哔哩）弹幕处理提供的实用工具集合。

## 功能模块

### 1. 去重 (`dedupe`)

针对直接从 B 站 API 获取到的弹幕进行去重处理。

#### 导出函数

- **`to_bili_deduped(pool: UniPool): UniPool`** - 返回去重后的新 UniPool 实例
- **`bili_dedupe(pool: UniPool): void`** - 原地修改 UniPool 实例，移除重复弹幕

#### 去重示例

```typescript
import { bili } from '@danuni/dan-any/plugins'

const pool = UniPool.import(biliData)

// 方式1：获取去重后的新实例
const _deduped = pool.pipe(bili.bili_dedupe.to_bili_deduped)

// 方式2：原地去重
pool.pipe(bili.bili_dedupe.bili_dedupe)
```

#### 说明

- 使用 B 站 API 中的 `dmid`（弹幕 ID）作为去重依据
- **仅支持** B 站主站直接获取的弹幕（需要包含 `extra.bili.dmid` 字段）
- 若弹幕缺少 `dmid` 字段会抛出错误

---

### 2. 历史弹幕逆向快进算法 (`history-danmaku-fast-forward`)

针对 B 站历史弹幕采用时间逆序查询时，快速确定完成获取/下一次获取位置的算法。

该方法受 [BiliPlus 全弹幕下载器](https://github.com/HengXin666/BiLiBiLi_DanMu_Crawling/issues/14) 启发。

#### 快进算法函数

- **`bili_history_fast_forward(query_history_date: string): Function`** - 返回处理函数

#### 快进算法示例

```typescript
import { bili } from '@danuni/dan-any/plugins'

const pool = UniPool.import(biliHistoryData)

// 查询 2024-01-10 这一天的历史弹幕
const _result = pool.pipe(bili.bili_history_fast_forward('2024-01-10'))

// 返回值示例：
// {
//   earliest: '2024-01-01',                    // 最早弹幕的日期
//   FastForward: ['2024-01-01', '2024-01-02', '2024-01-04'],  // 有弹幕的日期
//   skip: ['2024-01-03', '2024-01-05', ...],   // 无弹幕的日期
//   SpecicDate: '2024-01-10'              // 查询的日期
// }
```

#### 返回值说明

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `earliest` | `string \| null` | 最早弹幕的日期（`yyyy-MM-dd` 格式），无弹幕时为 `null` |
| `FastForward` | `string[]` | 早于查询日期、且有弹幕的日期列表 |
| `skip` | `string[]` | `earliest` 到查询日期之间、无弹幕的日期列表 |
| `SpecicDate` | `string` | 查询的日期（`yyyy-MM-dd` 格式） |

#### 工作原理

1. 筛选出早于查询日期的所有弹幕
2. 找出最早弹幕的日期作为 `earliest`
3. 收集有弹幕的日期到 `FastForward` 列表
4. 找出没有弹幕的日期到 `skip` 列表

#### 时间处理

- 所有日期基于时区 `Asia/Shanghai`（UTC+8）
- 输入格式：`yyyy-MM-dd`
- 输出格式：`yyyy-MM-dd`
