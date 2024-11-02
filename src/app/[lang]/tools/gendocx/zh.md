## 在线 Word 文档批量生成工具

本工具可以**根据 Excel 数据和 Word 模板批量生成大量个性化的 Word 文档**。适用于需要批量生成格式统一但内容不同的文档场景。

数据和模板可以参考这里的两个文件示例： [模板文件](/files/template.docx) 和 [数据文件](/files/batchdata.xlsx)。

本工具**只在浏览器本地进行批量生成，不会上传任何数据到服务器**，甚至可以在页面加载之后离线使用。

比如：
- 批量生成证书、奖状
- 批量生成合同、协议
- 批量生成通知、邀请函
- 批量生成个性化报告
- 其他需要批量生成文档的场景

## 使用方法

1. **上传 Excel 文件**
   - 点击"上传 Excel 文件"区域或将文件拖拽到该区域
   - 支持 .xlsx/.xls 格式
   - 文件大小限制：50MB

2. **上传 Word 模板**
   - 点击"上传 Word 模板"区域或将文件拖拽到该区域
   - 仅支持 .docx 格式
   - 文件大小限制：50MB

3. **生成文档**
   - 点击"生成文档"按钮开始批量生成
   - 生成过程中可以在表格中查看每条数据的处理状态
   - 生成完成后可以单独下载或点击"下载全部"获取 ZIP 压缩包

## 模板制作详细说明

Excel 文件**格式要求**

- 第一行必须是标题行，用于定义变量名
- 从第二行开始是实际数据
- 日期类型会自动转换为 YYYY/MM/DD 格式

示例：
| 姓名 | 日期 | 编号 | 金额 |
|------|------|------|------|
| 张三 | 2024/1/1 | A001 | 1000 |
| 李四 | 2024/1/2 | A002 | 2000 |

Word 模板的要求如下。首先是**变量格式**

```
{{变量名}}
```

比如：

```
尊敬的 {{姓名}}：

您于 {{日期}} 完成了编号为 {{编号}} 的订单，金额为 {{金额}} 元。
```

## 注意事项

- 请确保 Excel 文件的第一行为标题行
- Word 模板中的变量需要使用双大括号包裹，如：`{{name}}`
- 变量名称必须与 Excel 表格的列标题完全匹配（区分大小写）
- 生成的文档会自动以"模板名_序号.docx"格式命名
- 页面刷新或关闭后数据会丢失，请及时下载生成的文档
- 不支持复杂的公式或条件判断
- 建议**先用少量数据测试模板是否正确**

## 常见问题

1. **生成失败**
   - 检查 Excel 文件格式是否正确
   - 检查 Word 模板中的变量名是否与 Excel 列标题完全匹配
   - 检查是否有特殊字符或格式

2. **文件大小限制**
   - Excel 和 Word 文件均限制在 50MB 以内
   - 生成的文档没有大小限制

3. **浏览器兼容性**
   - 推荐使用 Chrome、Firefox、Edge 等现代浏览器
   - 不支持 IE 浏览器