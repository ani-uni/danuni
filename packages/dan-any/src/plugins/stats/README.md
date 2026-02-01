# 统计插件

为弹幕池提供统计和查询功能的工具集合。

## 功能模块

### 获取最新弹幕 (`getLatestDan`)

从弹幕池中查找出最新发送的一条弹幕。

#### 导出函数

- **`getLatestDan(pool: UniPool): UniDM | null`** - 获取最新的一条弹幕

#### 使用示例

```typescript
import { stats } from '@danuni/dan-any/plugins'

const pool = UniPool.import(biliData)

// 获取最新弹幕
const latest = pool.pipe(stats.getLatestDan)

if (latest) {
  console.log(`最新弹幕: ${latest.content}`)
  console.log(`发送时间: ${latest.ctime}`)
} else {
  console.log('弹幕池为空')
}
```

#### 返回值

- **`UniDM`** - 最新的弹幕对象（包含内容、时间、发送者等信息）
- **`null`** - 当弹幕池为空时

#### 工作原理

按照弹幕的创建时间（`ctime`）进行比较，通过遍历整个弹幕池找出时间戳最新的一条弹幕。

#### 时间复杂度

- 平均/最坏情况：**O(n)** — n 是弹幕数量
