# Compat Engine 实现计划 (TDD)

> **项目**: Fumadocs 兼容模式  
> **版本**: v2.1  
> **开始日期**: 2024-12-24  
> **方法论**: Test-Driven Development (TDD)  
> **状态**: 进行中

---

## TDD 工作流

每个模块遵循 **红-绿-重构** 循环：

```
┌─────────────────────────────────────────────────────────────┐
│  1. RED: 编写失败的测试                                      │
│     ↓                                                       │
│  2. GREEN: 编写最小实现使测试通过                            │
│     ↓                                                       │
│  3. REFACTOR: 重构代码，保持测试通过                         │
│     ↓                                                       │
│  重复直到功能完成                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 进度总览

| Phase | 名称 | 状态 | 进度 |
| --- | --- | --- | --- |
| 0 | 测试基础设施 | ⏳ 待开始 | 0/3 |
| 1 | Types & Plugin 接口 | ⏳ 待开始 | 0/4 |
| 2 | Plugin Pipeline (TDD) | ⏳ 待开始 | 0/4 |
| 3 | Scanner 插件 (TDD) | ⏳ 待开始 | 0/4 |
| 4 | Content 插件 (TDD) | ⏳ 待开始 | 0/4 |
| 5 | Metadata 插件 (TDD) | ⏳ 待开始 | 0/4 |
| 6 | Tree 插件 (TDD) | ⏳ 待开始 | 0/4 |
| 7 | 集成与公共 API | ⏳ 待开始 | 0/4 |
| 8 | DocEngineering 集成 | ⏳ 待开始 | 0/4 |

---

## Phase 0: 测试基础设施

在开始任何模块开发之前，先搭建测试环境。

### TODO

- [ ] **P0-1**: 配置 Vitest
  - 确认 `vitest.config.ts` 配置正确
  - 配置测试覆盖率报告
  - 配置 TypeScript 支持

- [ ] **P0-2**: 创建测试 fixtures 目录
  ```
  tests/
  ├── fixtures/
  │   ├── empty-dir/           # 空目录
  │   ├── single-file/         # 单文件
  │   │   └── test.md
  │   ├── nested/              # 多级目录
  │   │   ├── level1/
  │   │   │   └── level2/
  │   │   │       └── deep.md
  │   │   └── root.md
  │   ├── special-dirs/        # 特殊目录
  │   │   ├── .hidden/
  │   │   │   └── secret.md
  │   │   ├── _drafts/
  │   │   │   └── draft.md
  │   │   └── .promptpack/
  │   │       └── actions/
  │   │           └── action.md
  │   ├── syntax/              # 语法测试
  │   │   ├── table-jsx.md     # 表格中有 <
  │   │   ├── code-blocks.md   # 代码块
  │   │   └── math.md          # 数学公式
  │   └── metadata/            # 元数据测试
  │       ├── with-frontmatter.md
  │       ├── with-h1.md
  │       └── no-title.md
  └── compat-engine/
      └── (测试文件)
  ```

- [ ] **P0-3**: 创建测试工具函数
  ```typescript
  // tests/utils.ts
  export function createTempDir(): string;
  export function cleanupTempDir(path: string): void;
  export function writeFixture(path: string, content: string): void;
  ```

### 完成标准

- `pnpm test` 可以运行
- Fixtures 目录就绪
- 测试工具函数可用

---

## Phase 1: Types & Plugin 接口

设计核心类型和插件接口，为扩展性奠定基础。

### TODO

- [ ] **P1-1**: 创建 `src/lib/compat-engine/types.ts` - 核心类型
  ```typescript
  export interface RawPage {
    filePath: string;
    slugs: string[];
    url: string;
    content: string;
    data: PageMetadata;
  }

  export interface PageMetadata {
    title: string;
    description: string;
    frontmatter: Record<string, unknown>;
    [key: string]: unknown;  // 允许插件扩展
  }

  export interface CompatSourceOptions {
    dir: string;
    baseUrl: string;
    extensions?: string[];
    indexFiles?: string[];
    ignore?: string[];
    include?: string[];
    maxFileSize?: number;
    transformLinks?: boolean;
    imageBasePath?: string;
    plugins?: PluginsConfig;
    // 向后兼容
    titleExtractor?: (content: string, filePath: string) => string;
    descriptionExtractor?: (content: string, filePath: string) => string;
    preprocessor?: (content: string, filePath: string) => string;
  }

  export interface CompatSource {
    getPage(slugs: string[] | undefined): RawPage | undefined;
    getPages(): RawPage[];
    generateParams(): { slug: string[] }[];
    pageTree: import('fumadocs-core/page-tree').Root;
    baseUrl: string;
    warnings: string[];
    reload(): Promise<CompatSource>;
  }
  ```

- [ ] **P1-2**: 创建插件接口类型
  ```typescript
  // 插件上下文
  export interface PluginContext {
    filePath: string;
    baseUrl: string;
    sourceDir: string;
    options: CompatSourceOptions;
  }

  // 内容插件
  export interface ContentPlugin {
    name: string;
    priority: number;
    transform: (content: string, ctx: PluginContext) => string | Promise<string>;
  }

  // 元数据插件
  export interface MetadataPlugin {
    name: string;
    priority: number;
    extract: (metadata: PageMetadata, content: string, ctx: PluginContext) => PageMetadata | Promise<PageMetadata>;
  }

  // 扫描插件
  export interface ScannerPlugin {
    name: string;
    priority: number;
    filter: (filePath: string, ctx: PluginContext) => boolean | undefined;
  }

  // 页面树插件
  export interface TreePlugin {
    name: string;
    priority: number;
    transform: (node: TreeNode, ctx: TreeContext) => TreeNode;
  }

  // 插件配置
  export interface PluginsConfig {
    content?: (ContentPlugin | PluginOverride)[];
    metadata?: (MetadataPlugin | PluginOverride)[];
    scanner?: (ScannerPlugin | PluginOverride)[];
    tree?: (TreePlugin | PluginOverride)[];
  }

  export interface PluginOverride {
    name: string;
    enabled?: boolean;
    options?: Record<string, unknown>;
  }
  ```

- [ ] **P1-3**: 创建插件定义辅助函数
  ```typescript
  // src/lib/compat-engine/define.ts
  export function defineContentPlugin(plugin: ContentPlugin): ContentPlugin;
  export function defineMetadataPlugin(plugin: MetadataPlugin): MetadataPlugin;
  export function defineScannerPlugin(plugin: ScannerPlugin): ScannerPlugin;
  export function defineTreePlugin(plugin: TreePlugin): TreePlugin;
  ```

- [ ] **P1-4**: 导出类型和辅助函数
  - 从 `index.ts` 导出所有类型
  - 确保向后兼容

### 完成标准

- 类型定义完整
- 插件接口清晰
- 无 TypeScript 错误

---

## Phase 2: Plugin Pipeline (TDD)

实现插件管道执行器，这是扩展性的核心。

### Step 1: 编写测试 (RED)

- [ ] **P2-1**: 创建 `tests/compat-engine/pipeline.test.ts`
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { createPipeline, runContentPipeline } from '@/lib/compat-engine/core/pipeline';

  describe('createPipeline', () => {
    it('sorts plugins by priority ascending', () => {
      const plugins = [
        { name: 'b', priority: 20, transform: x => x },
        { name: 'a', priority: 10, transform: x => x },
      ];
      const sorted = createPipeline(plugins);
      expect(sorted[0].name).toBe('a');
      expect(sorted[1].name).toBe('b');
    });

    it('handles empty plugin array', () => {
      const sorted = createPipeline([]);
      expect(sorted).toEqual([]);
    });

    it('merges builtin and custom plugins', () => {
      const builtin = [{ name: 'builtin', priority: 10, transform: x => x }];
      const custom = [{ name: 'custom', priority: 5, transform: x => x }];
      const merged = createPipeline([...builtin, ...custom]);
      expect(merged[0].name).toBe('custom');
    });

    it('disables plugins via override', () => {
      const plugins = [
        { name: 'a', priority: 10, transform: x => x },
        { name: 'a', enabled: false },
      ];
      const result = createPipeline(plugins);
      expect(result.find(p => p.name === 'a')).toBeUndefined();
    });
  });

  describe('runContentPipeline', () => {
    it('runs plugins in order', async () => {
      const plugins = [
        { name: 'add-a', priority: 10, transform: (s) => s + 'A' },
        { name: 'add-b', priority: 20, transform: (s) => s + 'B' },
      ];
      const result = await runContentPipeline(plugins, '', {} as any);
      expect(result).toBe('AB');
    });

    it('passes context to plugins', async () => {
      const ctx = { filePath: 'test.md', baseUrl: '/docs' };
      let capturedCtx;
      const plugins = [
        { name: 'capture', priority: 10, transform: (s, c) => { capturedCtx = c; return s; } },
      ];
      await runContentPipeline(plugins, '', ctx as any);
      expect(capturedCtx.filePath).toBe('test.md');
    });

    it('handles async plugins', async () => {
      const plugins = [
        { name: 'async', priority: 10, transform: async (s) => s + 'ASYNC' },
      ];
      const result = await runContentPipeline(plugins, '', {} as any);
      expect(result).toBe('ASYNC');
    });
  });
  ```

### Step 2: 编写实现 (GREEN)

- [ ] **P2-2**: 创建 `src/lib/compat-engine/core/pipeline.ts`
  - 实现 `createPipeline` - 合并、排序、过滤插件
  - 实现 `runContentPipeline` - 执行内容插件管道
  - 实现 `runMetadataPipeline` - 执行元数据插件管道
  - 实现 `runScannerPipeline` - 执行扫描插件管道

### Step 3: 重构

- [ ] **P2-3**: 重构管道代码
  - 提取通用逻辑
  - 添加错误处理

### Step 4: 验证

- [ ] **P2-4**: 所有测试通过

### 完成标准

- 插件管道可正确执行
- 支持优先级排序
- 支持禁用插件

---

## Phase 3: Scanner 插件 (TDD)

将文件扫描逻辑实现为可插拔的扫描插件。

### Step 1: 编写测试 (RED)

- [ ] **P3-1**: 创建 `tests/compat-engine/plugins/scanner.test.ts`
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { 
    extensionFilterPlugin,
    ignorePatternPlugin,
    includePatternPlugin,
    scanDirectory 
  } from '@/lib/compat-engine/scanner';

  describe('extensionFilterPlugin', () => {
    it('accepts .md files', () => {
      const result = extensionFilterPlugin.filter('test.md', {} as any);
      expect(result).toBe(true);
    });

    it('accepts .mdx files', () => {
      const result = extensionFilterPlugin.filter('test.mdx', {} as any);
      expect(result).toBe(true);
    });

    it('rejects .yaml files', () => {
      const result = extensionFilterPlugin.filter('test.yaml', {} as any);
      expect(result).toBe(false);
    });
  });

  describe('ignorePatternPlugin', () => {
    it('ignores files starting with _', () => {
      const ctx = { options: { ignore: ['_*'] } };
      const result = ignorePatternPlugin.filter('_draft.md', ctx as any);
      expect(result).toBe(false);
    });
  });

  describe('includePatternPlugin', () => {
    it('includes .promptpack when specified', () => {
      const ctx = { options: { include: ['.promptpack/**'] } };
      const result = includePatternPlugin.filter('.promptpack/actions/test.md', ctx as any);
      expect(result).toBe(true);
    });
  });

  describe('scanDirectory', () => {
    it('returns empty array for empty directory');
    it('scans nested directories');
    it('applies scanner plugins in priority order');
  });
  ```

### Step 2-4: 实现、重构、验证

- [ ] **P3-2**: 创建内置 Scanner 插件
  - `src/lib/compat-engine/plugins/scanner/extension-filter.ts`
  - `src/lib/compat-engine/plugins/scanner/ignore-pattern.ts`
  - `src/lib/compat-engine/plugins/scanner/include-pattern.ts`
- [ ] **P3-3**: 创建 `src/lib/compat-engine/scanner.ts` - 整合插件
- [ ] **P3-4**: 验证测试通过

---

## Phase 4: Content 插件 (TDD)

将内容预处理逻辑实现为可插拔的内容插件。

### Step 1: 编写测试 (RED)

- [ ] **P4-1**: 创建 `tests/compat-engine/plugins/content.test.ts`
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { 
    jsxEscapePlugin,
    linkTransformPlugin,
    imageTransformPlugin 
  } from '@/lib/compat-engine/plugins/content';

  describe('jsxEscapePlugin', () => {
    it('escapes < in tables', async () => {
      const input = '| Value |\n|---|\n| <16Ω |';
      const result = await jsxEscapePlugin.transform(input, {} as any);
      expect(result).toContain('&lt;16Ω');
    });

    it('preserves < in code blocks');
    it('preserves < in inline code');
    it('escapes { } in text');
    it('preserves valid JSX tags');
    it('preserves math formulas');
  });

  describe('linkTransformPlugin', () => {
    it('transforms ./other.md to /base/other', async () => {
      const ctx = { baseUrl: '/docs', filePath: 'index.md' };
      const input = '[link](./other.md)';
      const result = await linkTransformPlugin.transform(input, ctx as any);
      expect(result).toContain('/docs/other');
    });

    it('preserves external URLs');
    it('preserves anchor links');
  });

  describe('imageTransformPlugin', () => {
    it('transforms relative image paths');
    it('preserves absolute image paths');
  });
  ```

### Step 2-4: 实现、重构、验证

- [ ] **P4-2**: 创建内置 Content 插件
  - `src/lib/compat-engine/plugins/content/jsx-escape.ts`
  - `src/lib/compat-engine/plugins/content/link-transform.ts`
  - `src/lib/compat-engine/plugins/content/image-transform.ts`
- [ ] **P4-3**: 创建预处理器整合模块
- [ ] **P4-4**: 验证测试通过

---

## Phase 5: Metadata 插件 (TDD)

将元数据提取逻辑实现为可插拔的元数据插件。

### Step 1: 编写测试 (RED)

- [ ] **P5-1**: 创建 `tests/compat-engine/plugins/metadata.test.ts`
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { 
    frontmatterPlugin,
    headingPlugin,
    filenamePlugin 
  } from '@/lib/compat-engine/plugins/metadata';

  describe('frontmatterPlugin', () => {
    it('extracts title from frontmatter', async () => {
      const content = '---\ntitle: Hello\n---\n# World';
      const metadata = { title: '', description: '', frontmatter: {} };
      const result = await frontmatterPlugin.extract(metadata, content, {} as any);
      expect(result.title).toBe('Hello');
    });

    it('extracts description from frontmatter');
    it('handles invalid frontmatter gracefully');
  });

  describe('headingPlugin', () => {
    it('extracts title from H1 heading', async () => {
      const content = '# My Title\n\nContent here';
      const metadata = { title: '', description: '', frontmatter: {} };
      const result = await headingPlugin.extract(metadata, content, {} as any);
      expect(result.title).toBe('My Title');
    });

    it('handles complex H1 like [0-DISC] Analysis');
    it('skips if title already set');
  });

  describe('filenamePlugin', () => {
    it('falls back to filename', async () => {
      const ctx = { filePath: 'my-document.md' };
      const metadata = { title: '', description: '', frontmatter: {} };
      const result = await filenamePlugin.extract(metadata, '', ctx as any);
      expect(result.title).toBe('My Document');
    });

    it('converts kebab-case to Title Case');
    it('skips if title already set');
  });
  ```

### Step 2-4: 实现、重构、验证

- [ ] **P5-2**: 创建内置 Metadata 插件
  - `src/lib/compat-engine/plugins/metadata/frontmatter.ts`
  - `src/lib/compat-engine/plugins/metadata/heading.ts`
  - `src/lib/compat-engine/plugins/metadata/filename.ts`
  - `src/lib/compat-engine/plugins/metadata/description.ts`
- [ ] **P5-3**: 创建元数据提取器整合模块
- [ ] **P5-4**: 验证测试通过

---

## Phase 6: Tree 插件 (TDD)

将页面树构建逻辑实现为可插拔的树插件。

### Step 1: 编写测试 (RED)

- [ ] **P6-1**: 创建 `tests/compat-engine/plugins/tree.test.ts`
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { buildPageTree } from '@/lib/compat-engine/tree-builder';

  describe('buildPageTree', () => {
    it('creates root node for single page', () => {
      const pages = [{ slugs: ['index'], url: '/docs', data: { title: 'Home' } }];
      const tree = buildPageTree(pages as any, {});
      expect(tree.children.length).toBe(1);
    });

    it('creates nested folders for deep paths', () => {
      const pages = [{ slugs: ['a', 'b', 'c'], url: '/docs/a/b/c', data: { title: 'Deep' } }];
      const tree = buildPageTree(pages as any, {});
      expect(tree.children[0].type).toBe('folder');
    });

    it('handles README as folder index');
    it('sorts README first, then alphabetically');
    it('removes leading dot from folder names');
    it('applies tree plugins');
  });
  ```

### Step 2-4: 实现、重构、验证

- [ ] **P6-2**: 创建 `src/lib/compat-engine/tree-builder.ts`
- [ ] **P6-3**: 创建树节点转换插件接口
- [ ] **P6-4**: 验证测试通过

---

## Phase 7: 集成与公共 API

### TODO

- [ ] **P7-1**: 创建集成测试
  ```typescript
  // tests/compat-engine/integration.test.ts
  describe('createCompatSource', () => {
    it('processes a directory end-to-end');
    it('returns correct page for given slugs');
    it('generates correct params');
    it('builds valid page tree');
  });
  ```

- [ ] **P7-2**: 更新 `src/lib/compat-engine/index.ts`
  - 组合所有模块
  - 导出公共 API
  - 保持向后兼容

- [ ] **P7-3**: 运行完整测试套件
  - 所有单元测试通过
  - 集成测试通过
  - 覆盖率 > 80%

- [ ] **P7-4**: 删除旧的单体代码
  - 确保所有功能已迁移
  - 清理未使用的代码

---

## Phase 8: DocEngineering 集成

### TODO

- [ ] **P8-1**: 创建 `/compat` 路由
- [ ] **P8-2**: 配置 DocEngineering 源
- [ ] **P8-3**: 端到端验证
- [ ] **P8-4**: 性能测试

---

## 测试覆盖率目标

| 模块 | 目标覆盖率 | 当前覆盖率 |
| --- | --- | --- |
| scanner | 90% | - |
| preprocessor | 90% | - |
| metadata | 90% | - |
| link-transformer | 90% | - |
| tree-builder | 90% | - |
| 总体 | 85% | - |

---

## 变体测试矩阵

```
┌─────────────────────────┬────────┬────────┬────────┬────────┬────────┐
│ 测试场景                 │ 空输入  │ 单值   │ 边界   │ 异常   │ 组合   │
├─────────────────────────┼────────┼────────┼────────┼────────┼────────┤
│ scanner                 │   ✓    │   ✓    │   ✓    │   ✓    │   ✓    │
│ preprocessor            │   ✓    │   ✓    │   ✓    │   ✓    │   ✓    │
│ metadata                │   ✓    │   ✓    │   ✓    │   ✓    │   ✓    │
│ link-transformer        │   ✓    │   ✓    │   ✓    │   ✓    │   ✓    │
│ tree-builder            │   ✓    │   ✓    │   ✓    │   ✓    │   ✓    │
└─────────────────────────┴────────┴────────┴────────┴────────┴────────┘

变体说明：
- 空输入: 空字符串、空数组、空目录
- 单值: 最简单的有效输入
- 边界: 极端情况（超长路径、特殊字符）
- 异常: 无效输入、错误格式
- 组合: 多种情况混合
```

---

## 下一步行动

1. **Phase 0**: 配置 Vitest，创建 fixtures
2. **Phase 1**: 创建 types.ts
3. **Phase 2**: 开始 Scanner 模块 TDD 循环

---

## 变更日志

| 日期 | 版本 | 变更 |
| --- | --- | --- |
| 2024-12-24 | v2.0 | 重构为 TDD 工作流，先测试后实现 |
| 2024-12-24 | v1.0 | 初始版本 |
