# Fumadocs 兼容模式 PRD

> **版本**: v1.2
> **最后更新**: 2024-12-23
> **状态**: P0-P3 完成 ✅

## 1. 概述

兼容模式（Compat Mode）是一个让 Fumadocs 能够渲染非标准 markdown 文件的引擎层。它解决了以下问题：

- 原始 markdown 文件没有 fumadocs 需要的 frontmatter（title, description）
- 文件格式不是 MDX，包含 MDX 解析器不兼容的语法
- 需要快速预览/发布现有的 markdown 文档集合

## 2. 核心功能需求

### 2.1 自动元数据提取

| 字段 | 提取规则 | 回退方案 |
| --- | --- | --- |
| title | 第一个 `#` 标题 | 文件名（去除扩展名，转换格式） |
| description | 第一段非标题文本（前 200 字符） | "No description available" |

### 2.2 文件优先级排序

1. **README.md / README.mdx** - 始终作为第一个文档（index 页面）
2. **index.md / index.mdx** - 目录索引文件
3. **其他文件** - 按字母顺序排列

### 2.3 MDX 兼容性预处理

需要处理的边缘情况：

| 情况 | 示例 | 处理方式 | 状态 |
| --- | --- | --- | --- |
| 小于号后跟数字 | `<16Ω` | 转义为 `&lt;16Ω` | ✅ |
| 花括号 | `{variable}` | 转义为 `\{variable\}` | ✅ |
| JSX-like 语法 | `<Component />` | 保持不变（有效 JSX） | ✅ |
| 表格中的特殊字符 | 见上 | 在表格行中激进转义 | ✅ |
| 代码块内容 | 任意内容 | 不做处理（代码块自动保护） | ✅ |
| 内联代码 | `` `code` `` | 保护内联代码内容 | ✅ |

### 2.4 目录结构映射

```
pm-notes/                    →  /raw-notes/
├── README.md               →  /raw-notes (index)
├── getting-started.md      →  /raw-notes/getting-started
├── guides/
│   ├── index.md           →  /raw-notes/guides
│   └── advanced.md        →  /raw-notes/guides/advanced
```

## 3. 边缘情况详细处理

### 3.1 空目录
- **情况**: 目录为空或只有不支持的文件
- **处理**: 显示友好的空状态页面，提示用户添加文件
- **状态**: ✅ 已实现

### 3.2 目录不存在
- **情况**: 配置的目录路径不存在
- **处理**: 返回空页面列表，不抛出错误
- **状态**: ✅ 已实现

### 3.3 文件编码问题
- **情况**: 文件使用非 UTF-8 编码或包含 BOM
- **处理**: 
  - 默认假设 UTF-8
  - BOM 应被正确处理（Node.js fs 默认处理）
  - 非 UTF-8 可能显示乱码但不应崩溃
- **状态**: ⚠️ 部分处理（依赖 Node.js 默认行为）

### 3.4 超大文件
- **情况**: 文件大小超过合理限制
- **处理**: 
  - 默认限制：10MB（可配置 maxFileSize）
  - 超过限制时跳过并记录警告
- **状态**: ✅ 已实现

### 3.5 二进制文件或非文本文件
- **情况**: 目录中有 .md 扩展名但内容是二进制
- **处理**: 
  - 检测文件是否为有效文本
  - 跳过或显示错误提示
- **状态**: ❌ 未实现

### 3.6 循环链接/相对链接
- **情况**: markdown 中有相对路径链接 `[link](./other.md)`
- **处理**: 
  - 转换相对 .md 链接到对应的 URL 路径
  - 例如: `./other.md` → `/raw-notes/other`
- **状态**: ✅ 已实现

### 3.7 图片路径
- **情况**: markdown 中引用本地图片 `![](./images/photo.png)`
- **处理**: 
  - 相对路径: 尝试从文档目录解析
  - 绝对路径: 从 public 目录解析
  - 外部 URL: 保持不变
- **状态**: ✅ 已实现（需要配置 imageBasePath）

### 3.8 特殊文件名

| 文件名类型 | 示例 | 处理方式 | 状态 |
| --- | --- | --- | --- |
| 隐藏文件 | `.hidden.md` | 忽略 | ✅ |
| 草稿文件 | `_draft.md` | 忽略 | ✅ |
| 空格文件名 | `file name.md` | 转换为 `file-name` | ✅ |
| 中文文件名 | `中文文件.md` | 转换为 URL 安全 slug | ⚠️ 部分（移除非ASCII） |
| 特殊字符 | `file@2024.md` | 移除特殊字符 | ✅ |

### 3.9 嵌套目录深度
- **情况**: 深层嵌套目录 `a/b/c/d/e/file.md`
- **处理**: 
  - 支持任意深度
  - URL 路径完全映射目录结构
- **状态**: ✅ 已实现

### 3.10 同名文件冲突
- **情况**: `readme.md` 和 `README.MD` 在同一目录
- **处理**: 
  - 大小写不敏感系统（macOS/Windows）: 只会有一个文件
  - 大小写敏感系统（Linux）: 两个文件都加载，可能冲突
  - 实现: 先处理的优先，冲突记录到 warnings 数组
- **状态**: ✅ 已实现

### 3.11 frontmatter 解析错误
- **情况**: 文件有无效的 YAML frontmatter
- **处理**: 
  - 使用 gray-matter 的容错解析
  - 解析失败时忽略 frontmatter，使用自动提取
- **状态**: ✅ gray-matter 自动处理

### 3.12 没有标题的文件
- **情况**: 文件内容没有任何 `#` 标题
- **处理**: 使用文件名生成标题
- **状态**: ✅ 已实现

### 3.13 HTML 标签
- **情况**: markdown 中有 HTML 标签 `<div>content</div>`
- **处理**: 
  - 标准 HTML 标签保持不变
  - MDX 会正确解析
- **状态**: ✅ 自动处理

### 3.14 数学公式
- **情况**: LaTeX 语法 `$E=mc^2$` 或 `$$\sum_{i=1}^n$$`
- **处理**: 
  - 需要额外的 remark 插件支持
  - 默认不处理
- **状态**: ❌ 需要插件配置

### 3.15 Mermaid 图表
- **情况**: ` ```mermaid ` 代码块
- **处理**: 
  - 需要额外插件支持
  - 默认显示为代码块
- **状态**: ⚠️ 显示为代码

### 3.16 任务列表
- **情况**: `- [ ] task` 或 `- [x] done`
- **处理**: 
  - 通过 remark-gfm 支持
  - fumadocs 默认应该支持
- **状态**: ✅ 应该自动支持

### 3.17 表格对齐
- **情况**: 使用 `:---:` 等对齐语法
- **处理**: MDX/remark-gfm 自动支持
- **状态**: ✅ 自动支持

### 3.18 脚注
- **情况**: `[^1]: footnote content`
- **处理**: 
  - 需要 remark-footnotes 插件
  - 默认可能不支持
- **状态**: ❌ 需要插件

### 3.19 缩写定义
- **情况**: `*[HTML]: Hyper Text Markup Language`
- **处理**: 不支持（非标准 markdown）
- **状态**: ❌ 不计划支持

### 3.20 Admonition/Callout
- **情况**: `> [!NOTE]` 或 `:::warning`
- **处理**: 
  - fumadocs 应该有内置支持
  - 需要验证兼容模式下是否工作
- **状态**: ⚠️ 需要验证

## 4. 配置选项

```typescript
interface CompatSourceOptions {
  // 必需
  dir: string;           // 内容目录路径
  baseUrl: string;       // URL 基础路径

  // 可选
  extensions?: string[]; // 支持的扩展名，默认 ['.md', '.mdx']
  indexFiles?: string[]; // 索引文件名，默认 ['README.md', 'index.md']
  ignore?: string[];     // 忽略的文件模式，默认 ['_*', '.*']
  maxFileSize?: number;  // 最大文件大小（字节），默认 10MB
  
  // 链接处理
  transformLinks?: boolean; // 是否转换相对链接，默认 false
  imageBasePath?: string;   // 图片基础路径
  
  // 自定义提取器
  titleExtractor?: (content: string, filePath: string) => string;
  descriptionExtractor?: (content: string, filePath: string) => string;
  
  // 预处理
  preprocessor?: (content: string, filePath: string) => string;
}
```

## 5. 导航行为

### 5.1 默认首页

- 访问 `/raw-notes` 时：
  1. 优先显示 README.md 内容（作为 index）
  2. 如果没有 README.md，显示第一个可用文档
  3. 如果没有任何文档，显示空状态

### 5.2 侧边栏

- 自动构建页面树
- README.md 在侧边栏中显示其标题
- 支持嵌套文件夹

## 6. 实现状态

| 功能 | 状态 | 优先级 |
| --- | --- | --- |
| 基础兼容层引擎 | ✅ | P0 |
| 自动标题/描述提取 | ✅ | P0 |
| MDX 预处理（基础字符转义） | ✅ | P0 |
| README.md 作为 index | ✅ | P0 |
| 空状态处理 | ✅ | P0 |
| 文件排序（README优先） | ✅ | P0 |
| 隐藏文件忽略 | ✅ | P1 |
| 草稿文件忽略 (_开头) | ✅ | P1 |
| 相对链接转换 | ✅ | P2 |
| 图片路径处理 | ✅ | P2 |
| 文件大小限制 | ✅ | P2 |
| 冲突检测 | ✅ | P3 |
| 插件扩展支持 | ❌ | P3 |

## 7. 测试场景

### 7.1 必须通过的测试
1. 空目录 → 显示空状态
2. README.md 存在 → 作为首页
3. 表格中有 `<16Ω` → 正确转义并渲染
4. 嵌套目录 → 正确的 URL 映射
5. 无 frontmatter → 自动提取标题

### 7.2 应该通过的测试
1. 中文内容 → 正确渲染
2. 代码块 → 语法高亮
3. 表格 → 正确对齐
4. 任务列表 → 复选框显示

### 7.3 可选测试
1. 数学公式（需要插件）
2. Mermaid 图表（需要插件）
3. 脚注（需要插件）

