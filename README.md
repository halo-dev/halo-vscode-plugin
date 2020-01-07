# Halo 插件（Halo VSCode Plugin）

## 命令

### 检查配置是否合法

halo.config.check

### 重新加载配置文件

halo.config.reload

### 列出文章列表

halo.post.list

### 发布文章

halo.post.publish

## 使用

### 创建配置文件

```json
{
  "blog_url": "http://127.0.0.1:8090",
  "app_id": "xxx",
  "app_secret": "xxxxxx"
}
```

### 键入命令

使用 Ctrl + P 组合键可唤出命令输入框。

### 编辑文章

可直接按 Ctrl + S 保存草稿，不会变更文章的状态。

## 开发

直接按 F5 键即可测试插件的效果。如果修改了插件代码，只需要在另外一个窗口按 Ctrl + R 组合键重新加载插件，不需要重新运行。
