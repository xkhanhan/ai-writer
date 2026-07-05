# 前端视觉规范 - Ant Design 标准化

> **版本**: v2.0  
> **更新时间**: 2026-07-04  
> **状态**: 已实施

---

## 1. 技术栈规范

### 1.1 UI 组件库
- **唯一组件库**: Ant Design v6 (`antd@^6.5.0`)
- **图标库**: `@ant-design/icons`（随 antd 自动安装）
- **SSR 支持**: `@ant-design/nextjs-registry`
- **语言**: `antd/locale/zh_CN`

### 1.2 禁止项
- 禁止引入任何第三方 UI 组件库
- 禁止引入任何第三方图标库（如 Material Icons、Lucide、Heroicons 等）
- 禁止编写独立 CSS 文件直接覆盖 Ant Design 组件原生样式
- 禁止使用 `!important` 覆盖 Ant Design 样式
- 禁止使用 `:global(.ant-xxx)` 选择器覆盖组件样式

### 1.3 允许的样式范围
- **主题色调整**: 通过 `ConfigProvider` 的 `theme.token.colorPrimary` 配置
- **布局样式**: CSS Modules 中的布局类（flex、grid、padding、margin 等）
- **自定义组件样式**: 非 Ant Design 组件的自定义元素（如书籍封面、活动栏等）

---

## 2. 主题配置

### 2.1 当前主题
```tsx
// app/layout.tsx
<ConfigProvider
  locale={zhCN}
  theme={{
    token: {
      colorPrimary: '#2F5D50', // 青黛色
    },
  }}
>
```

### 2.2 主题变更流程
1. 当前迭代仅允许调整 `colorPrimary` 参数
2. 如需新增主题定制（如 borderRadius、fontFamily 等），需提交单独迭代申请
3. 所有主题变更必须通过 `ConfigProvider theme` 实现，不得通过 CSS 覆盖

---

## 3. 组件使用规范

### 3.1 全局组件清单

| 组件 | 用途 | 使用场景 |
|------|------|----------|
| `Button` | 按钮 | 所有交互按钮 |
| `Modal` | 弹窗 | 新建、编辑、确认弹窗 |
| `Form` / `Form.Item` | 表单 | 所有数据录入表单 |
| `Input` / `Input.TextArea` | 输入框 | 文本输入 |
| `Select` | 下拉选择 | 选项选择 |
| `Card` | 卡片 | 内容分组展示 |
| `Tag` | 标签 | 状态标记、分类标签 |
| `Progress` | 进度条 | 完成进度展示 |
| `Empty` | 空状态 | 无数据时的占位 |
| `message` | 消息提示 | 操作反馈 |
| `Typography` | 排版 | 文本展示 |
| `Divider` | 分割线 | 内容分隔 |
| `Grid` | 栅格 | 响应式布局 |
| `Space` | 间距 | 元素间距控制 |
| `Cascader` | 级联选择 | 多级选项选择 |
| `InputNumber` | 数字输入 | 数值输入 |
| `Slider` | 滑块 | 范围选择 |

### 3.2 页面级组件使用

#### 首页 (HomePage)
| 元素 | 实现方式 |
|------|----------|
| 页面标题图标 | `<BookOutlined />` |
| 搜索按钮 | `<Button shape="circle" icon={<SearchOutlined />} />` |
| 列表视图按钮 | `<Button shape="circle" icon={<UnorderedListOutlined />} />` |
| 新建卡片图标 | `<PlusSquareOutlined />` |
| 书籍分类标签 | `<Tag color="green">` |
| 完成进度 | `<Progress percent={...} size="small" />` |
| 编辑按钮 | `<Button type="link" icon={<EditOutlined />}>撰写</Button>` |
| 更多按钮 | `<Button type="text" size="small" icon={<MoreOutlined />} />` |
| 创建弹窗 | `<Modal>` + `<Form>` + `<Input>` + `<Input.TextArea>` + `<Select>` |

#### 书籍工作台 (BookWorkspace)
| 元素 | 实现方式 |
|------|----------|
| 返回按钮 | `<ArrowLeftOutlined />` |
| 活动栏图标 | `<BookOutlined />` `<GlobalOutlined />` `<SettingOutlined />` `<EditOutlined />` `<InboxOutlined />` |

#### 创作区 (CreationZone)
| 元素 | 实现方式 |
|------|----------|
| 空状态 | `<BookOutlined />` |
| 导航树展开 | `<DownOutlined />` / `<RightOutlined />` |
| 文件图标 | `<FileTextOutlined />` |
| 新建按钮 | `<PlusOutlined />` |
| 保存按钮 | `<Button type="primary" icon={<SaveOutlined />}>保存</Button>` |
| 删除按钮 | `<Button danger icon={<DeleteOutlined />}>删除</Button>` |
| 添加节点 | `<Button icon={<PlusOutlined />}>添加</Button>` |
| 移除节点 | `<MinusCircleOutlined />` |
| 存入正文库 | `<Button icon={<InboxOutlined />}>存入正文库</Button>` |
| 编辑按钮 | `<Button type="primary" icon={<EditOutlined />}>编辑卷纲</Button>` |
| 只读标签 | `<Tag color="blue">只读</Tag>` |
| 已写正文标签 | `<Tag color="green">已写正文</Tag>` |
| 空数据 | `<Empty description="暂无正文" />` |

#### 正文库 (ArchiveView)
| 元素 | 实现方式 |
|------|----------|
| 空状态图标 | `<InboxOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />` |
| 预览按钮 | `<Button icon={<EyeOutlined />}>预览</Button>` |
| 删除按钮 | `<Button danger icon={<DeleteOutlined />}>删除</Button>` |
| 预览弹窗 | `<Modal>` + `<Typography.Paragraph>` |
| 删除确认 | `<Modal.confirm>` |
| 章节标签 | `<Tag color="blue">` / `<Tag color="orange">` |

#### 文件夹编辑器 (FolderFileEditor)
| 元素 | 实现方式 |
|------|----------|
| 新建按钮 | `<Button type="link" size="small" icon={<PlusOutlined />}>新建</Button>` |
| 空状态 | `<Empty description="选择文件开始编辑" />` |
| 文件夹树 | `<FolderOutlined />` / `<FileOutlined />` |
| 操作按钮 | `<Button type="text" size="small" icon={<PlusOutlined />} />` / `<CloseOutlined />` |
| 创建弹窗 | `<Modal>` + `<Form>` + `<Input>` + `<Button type="primary">` |
| Markdown 编辑器 | `<Input.TextArea>` |
| 保存状态 | `<Tag color="green">已保存</Tag>` / `<Tag>未保存</Tag>` |

#### AI 配置页 (AiConfigForm)
| 元素 | 实现方式 |
|------|----------|
| 返回按钮 | `<Button type="text" icon={<ArrowLeftOutlined />}>返回书房</Button>` |
| 保存按钮 | `<Button type="primary" icon={<SaveOutlined />}>保存配置</Button>` |
| 区域卡片 | `<Card title="...">` |
| 表单 | `<Form>` + `<Form.Item>` + `<Input>` + `<Select>` + `<InputNumber>` + `<Slider>` |
| 密码切换 | `<Button icon={showKey ? <EyeOutlined /> : <EyeInvisibleOutlined />} />` |
| 拉取模型 | `<Button icon={<ReloadOutlined />}>拉取</Button>` |
| 连通性测试 | `<Button type="primary" icon={<ApiOutlined />}>测试连接</Button>` |
| 测试状态 | `<Tag color="green">连接成功</Tag>` / `<Tag color="red">连接失败</Tag>` / `<LoadingOutlined />` |

---

## 4. 布局规范

### 4.1 全局布局结构
```
shell-root (flex-col, h-screen)
  shell-topbar (56px, shrink-0)
  shell-main (flex-1, overflow-auto)
    wrapper (flex, justify-center, padding)
      content (max-width: 1024px)
  shell-footer (32px, shrink-0)
```

### 4.2 响应式断点
| 断点 | padding-x | 适用场景 |
|------|-----------|----------|
| > 1344px | 160px | 大屏桌面 |
| 1024~768px | 48px | 小屏桌面/平板 |
| < 768px | 16px | 手机 |

### 4.3 CSS Modules 使用规则
- CSS Modules 仅用于**布局样式**（flex、grid、padding、margin、width、height）
- 不得在 CSS Modules 中覆盖 Ant Design 组件样式
- 不得使用 `:global(.ant-xxx)` 选择器
- 不得使用 `!important` 覆盖 Ant Design 样式

---

## 5. 图标规范

### 5.1 图标来源
- **唯一来源**: `@ant-design/icons`
- **禁止**: 内联 `<svg>` 元素
- **禁止**: 第三方图标库

### 5.2 常用图标清单

| 图标名 | 用途 |
|--------|------|
| `SettingOutlined` | 设置 |
| `ArrowLeftOutlined` | 返回 |
| `BookOutlined` | 书籍 |
| `EditOutlined` | 编辑 |
| `PlusOutlined` | 添加 |
| `DeleteOutlined` | 删除 |
| `SaveOutlined` | 保存 |
| `SearchOutlined` | 搜索 |
| `EyeOutlined` | 查看 |
| `CloseOutlined` | 关闭 |
| `InboxOutlined` | 存档/归档 |
| `GlobalOutlined` | 世界/全局 |
| `FileTextOutlined` | 文件 |
| `DownOutlined` / `RightOutlined` | 展开/折叠 |
| `CalendarOutlined` | 日期 |
| `MoreOutlined` | 更多 |
| `PlusSquareOutlined` | 新建方块 |
| `CheckCircleOutlined` | 成功/已完成 |
| `CloseCircleOutlined` | 失败 |
| `LoadingOutlined` | 加载中 |
| `ApiOutlined` | API/连接 |
| `ReloadOutlined` | 刷新/重新加载 |
| `EyeInvisibleOutlined` | 隐藏 |
| `FolderOutlined` | 文件夹 |
| `FolderOpenOutlined` | 打开的文件夹 |
| `FileOutlined` | 文件 |
| `MinusCircleOutlined` | 移除 |
| `UnorderedListOutlined` | 列表视图 |

---

## 6. 设计稿管理

### 6.1 设计稿位置
- `stitch/stitch_musescribe_ai_creative_studio/` - Stitch AI 生成的设计稿
- `docs/前端视觉规范.md` - 本文档，作为开发执行标准

### 6.2 设计稿与代码的关系
- 设计稿作为视觉参考，代码以 Ant Design 组件为实现基础
- 设计稿中的自定义视觉效果（如水墨纹理、书法字体等）通过 Ant Design 主题系统和 CSS 变量实现
- 如设计稿与 Ant Design 默认样式冲突，以 Ant Design 标准为准

---

**文档维护人**: AI 助手  
**最后更新**: 2026-07-04
