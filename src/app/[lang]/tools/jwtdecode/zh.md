# 在线 JWT 解析工具：解码 Header、Payload 和过期时间

这个 JWT 解析工具用于在浏览器本地查看 JSON Web Token 的内容。粘贴一个 JWT 后，工具会解码 Header 和 Payload，把 JSON 格式化展示，并自动识别 `iat`、`exp`、`nbf` 等常见时间字段，转换成人类可读时间。它适合做 JWT Decode、接口调试、登录态排查、过期时间检查和 Header / Payload 内容核对。页面提供随机示例 Token，方便测试解析效果。

## 这个工具能做什么

- 解析 JWT Header，查看 `alg`、`typ`、`kid` 等字段
- 解析 JWT Payload，查看用户 ID、角色、权限、签发方、受众等声明
- 把 `exp` 过期时间、`iat` 签发时间、`nbf` 生效时间转换为本地可读时间
- 显示签名段长度，并提示当前工具没有验证签名
- 复制 Header / Payload JSON
- 下载解析后的 JSON 文件
- 随机生成一个示例 JWT，方便开发和测试

## 如何使用 JWT Decode 工具

1. 从请求头、Cookie、日志或调试工具里复制 JWT。
2. 粘贴到输入框。
3. 查看 Token 下方的时间字段，确认 `exp` 是否过期、`nbf` 是否尚未生效。
4. 查看下方格式化后的 Header 和 Payload。
5. 需要测试时，可以点击“随机示例”，生成一个可解析的演示 Token。

## 签名验证说明

这个工具只做本地解码，不做签名验证。JWT 的 Header 和 Payload 本质上只是 base64url 编码，任何人都可以解码查看，也可以伪造内容。真正判断 Token 是否可信，需要服务端使用密钥或公钥验证签名，并检查过期时间、签发方、受众、权限范围等规则。

因此，本工具适合调试和查看内容，不适合作为安全校验依据。

## 常见 JWT 时间字段

- `iat`：Issued At，Token 签发时间。
- `exp`：Expiration Time，Token 过期时间。当前时间晚于 `exp` 时，Token 通常应被视为过期。
- `nbf`：Not Before，Token 生效时间。当前时间早于 `nbf` 时，Token 通常还不能使用。

这些字段通常是 Unix 秒级时间戳，而不是毫秒时间戳。

## 隐私说明

所有解析都在当前浏览器完成，Token 不会上传到服务器。即便如此，JWT 可能包含用户 ID、邮箱、权限或内部系统信息，建议不要把生产环境敏感 Token 分享给他人。日常开发中，如果只是想快速查看 JWT 过期时间、解码 Payload、确认 Header 算法或排查 Cookie 里的 token 内容，这个在线 JWT 解析工具可以直接完成这些检查。
