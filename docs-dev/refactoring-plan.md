# Compat Engine 重构计划

## 背景

当前 Compat Engine 实现虽然功能完整，但存在以下架构问题：

1. **God Object**：`index.ts` 包含约 790 行代码，承担过多职责
2. **插件系统未集成**：已设计了插件接口，但 `createCompatSource` 仍使用内联函数
3. **耦合度高**：扫描、预处理、元数据提取、树构建逻辑交织在一起

## 目标

将 `compat-engine/index.ts` 拆分为模块化架构，真正实现插件管道设计。

## 目标架构

```
src/lib/compat-engine/
├── index.ts              # 主入口，导出 createCompatSource
├── types.ts              # ✅ 已有 - 核心类型定义
├── define.ts             # ✅ 已有 - 插件定义辅助函数
├── create-source.ts      # 新建 - createCompatSource 核心逻辑
├── core/
│   ├── pipeline.ts       # ✅ 已有 - 插件管道执行器
│   ├── scanner.ts        # 新建 - 文件扫描器
│   └── page-builder.ts   # 新建 - 页面构建器
├── plugins/
│   ├── scanner/
│   │   └── index.ts      # ✅ 已有 - 扫描器插件
│   ├── preprocessor/     # 新建
│   │   ├── index.ts      # 导出所有预处理插件
│   │   ├── html-comments.ts    # HTML 注释转换
│   │   ├── jsx-escape.ts       # JSX 字符转义
│   │   ├── code-protection.ts  # 代码块保护
│   │   └── link-transform.ts   # 链接转换
│   ├── metadata/         # 新建
│   │   ├── index.ts      # 导出所有元数据插件
│   │   ├── title-extractor.ts      # 标题提取
│   │   └── description-extractor.ts # 描述提取
│   └── tree/             # 新建
│       ├── index.ts      # 导出所有树插件
│       └── flatten-empty.ts  # 空文件夹展平
└── utils/
    ├── patterns.ts       # 模式匹配工具
    └── slug.ts           # Slug 生成工具
```

## 重构阶段

### Phase 1: 提取工具函数 (1-2 小时)

**目标**：将通用工具函数提取到 `utils/` 目录

**步骤**：
1. 创建 `utils/patterns.ts`
   - `matchesPattern(path, pattern)` - 路径匹配
   - `shouldIncludeFile(path, ignore, include)` - 文件包含判断
2. 创建 `utils/slug.ts`
   - `filePathToSlugs(filePath)` - 路径转 slug
   - `slugToDisplayName(slug)` - slug 转显示名
   - `isIndexFile(fileName)` - 索引文件判断

**测试**：
- 现有测试应继续通过
- 添加工具函数的单元测试

### Phase 2: 提取预处理器插件 (2-3 小时)

**目标**：将预处理逻辑拆分为独立插件

**步骤**：
1. 定义 `ContentPreprocessorPlugin` 接口
   ```typescript
   interface ContentPreprocessorPlugin {
     name: string;
     priority?: number;
     transform(content: string, context: PreprocessContext): string;
   }
   
   interface PreprocessContext {
     filePath: string;
     baseUrl: string;
     options: CompatSourceOptions;
   }
   ```

2. 创建预处理器插件：
   - `htmlCommentsPlugin` - `<!-- -->` → `{/* */}`
   - `jsxEscapePlugin` - `<3`, `{` 转义
   - `codeProtectionPlugin` - 保护代码块
   - `linkTransformPlugin` - 相对链接转换
   - `imageTransformPlugin` - 图片路径转换

3. 创建 `core/preprocessor-pipeline.ts`
   ```typescript
   function runPreprocessorPipeline(
     plugins: ContentPreprocessorPlugin[],
     content: string,
     context: PreprocessContext
   ): string
   ```

**测试**：
- 为每个预处理器插件添加单元测试
- 测试插件组合和优先级

### Phase 3: 提取元数据插件 (1-2 小时)

**目标**：将元数据提取逻辑拆分为独立插件

**步骤**：
1. 定义 `MetadataExtractorPlugin` 接口
   ```typescript
   interface MetadataExtractorPlugin {
     name: string;
     priority?: number;
     extract(content: string, context: MetadataContext): Partial<PageMetadata>;
   }
   
   interface PageMetadata {
     title?: string;
     description?: string;
     [key: string]: unknown;
   }
   ```

2. 创建元数据插件：
   - `frontmatterPlugin` - 解析 frontmatter
   - `titleFromH1Plugin` - 从 H1 提取标题
   - `descriptionFromParagraphPlugin` - 从首段提取描述

3. 创建 `core/metadata-pipeline.ts`

**测试**：
- 测试各种元数据组合场景
- 测试优先级覆盖（frontmatter > H1 > 文件名）

### Phase 4: 提取页面树构建 (1-2 小时)

**目标**：将页面树构建逻辑拆分

**步骤**：
1. 创建 `core/page-builder.ts`
   - `buildPageTree(pages, options)` - 构建页面树
   - `flattenEmptyFolders(tree)` - 展平空文件夹

2. 定义 `TreeTransformPlugin` 接口（可选）
   ```typescript
   interface TreeTransformPlugin {
     name: string;
     transform(tree: Root): Root;
   }
   ```

**测试**：
- 测试各种目录结构
- 测试空文件夹展平

### Phase 5: 重写 createCompatSource (2-3 小时)

**目标**：使用插件管道重写主函数

**步骤**：
1. 创建 `create-source.ts`
   ```typescript
   interface CompatSourceConfig {
     options: CompatSourceOptions;
     scannerPlugins?: ScannerPlugin[];
     preprocessorPlugins?: ContentPreprocessorPlugin[];
     metadataPlugins?: MetadataExtractorPlugin[];
     treePlugins?: TreeTransformPlugin[];
   }
   
   export async function createCompatSource(config: CompatSourceConfig): Promise<CompatSource> {
     // 1. 扫描文件
     const files = await runScannerPipeline(scannerPlugins, options);
     
     // 2. 解析每个文件
     for (const file of files) {
       // 2.1 预处理内容
       const processedContent = runPreprocessorPipeline(preprocessorPlugins, content, context);
       
       // 2.2 提取元数据
       const metadata = runMetadataPipeline(metadataPlugins, content, context);
       
       // 2.3 创建页面
       pages.set(slugKey, page);
     }
     
     // 3. 构建页面树
     let tree = buildPageTree(pages, options);
     tree = runTreePipeline(treePlugins, tree);
     
     return { getPages, getPage, pageTree, ... };
   }
   ```

2. 更新 `index.ts` 导出
   ```typescript
   export { createCompatSource } from './create-source';
   export * from './types';
   export * from './define';
   export * from './plugins/scanner';
   export * from './plugins/preprocessor';
   export * from './plugins/metadata';
   ```

3. 提供默认插件配置
   ```typescript
   export const defaultScannerPlugins = [
     extensionFilterPlugin,
     ignorePatternPlugin,
     includePatternPlugin,
   ];
   
   export const defaultPreprocessorPlugins = [
     codeProtectionPlugin,
     htmlCommentsPlugin,
     jsxEscapePlugin,
     linkTransformPlugin,
   ];
   ```

**测试**：
- 所有现有测试应继续通过
- 测试自定义插件配置
- 测试插件覆盖

### Phase 6: 文档和清理 (1 小时)

**目标**：更新文档，清理旧代码

**步骤**：
1. 更新 PRD 文档
2. 添加插件开发指南
3. 添加 API 文档注释
4. 删除旧的内联实现

## 时间估算

| 阶段 | 时间 | 累计 |
|------|------|------|
| Phase 1: 工具函数 | 1-2h | 1-2h |
| Phase 2: 预处理器 | 2-3h | 3-5h |
| Phase 3: 元数据 | 1-2h | 4-7h |
| Phase 4: 页面树 | 1-2h | 5-9h |
| Phase 5: 重写主函数 | 2-3h | 7-12h |
| Phase 6: 文档清理 | 1h | 8-13h |

**总计**：约 8-13 小时

## 风险与缓解

### 风险 1: 回归问题
- **缓解**：每个阶段后运行完整测试套件
- **缓解**：保持旧实现直到新实现完全验证

### 风险 2: 接口变更
- **缓解**：保持 `createCompatSource` 的公开 API 不变
- **缓解**：使用默认插件配置保持向后兼容

### 风险 3: 性能回归
- **缓解**：添加性能基准测试
- **缓解**：插件管道使用同步调用减少开销

## 成功标准

1. ✅ 所有现有测试通过
2. ✅ `index.ts` 行数 < 100
3. ✅ 每个模块职责单一
4. ✅ 支持自定义插件
5. ✅ 无破坏性 API 变更

## TDD 开发流程

每个阶段遵循：

1. **RED**：先写测试
   - 定义期望的接口
   - 编写失败的测试用例

2. **GREEN**：实现功能
   - 最小实现让测试通过
   - 从 `index.ts` 提取代码

3. **REFACTOR**：优化代码
   - 清理重复代码
   - 优化类型定义

## 下一步

准备就绪后，从 Phase 1 开始，创建 `utils/patterns.ts` 和 `utils/slug.ts`。

---

*计划日期: 2024-12-24*
*预计完成: 2-3 天*

