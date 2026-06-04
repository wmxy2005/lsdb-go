  # Go 档案资料管理系统后端计划

  ## Summary

  - 在 backend 下新建 Gin + SQLite 后端服务。
  - 使用现有 backend/data/test.db，档案表 items、收藏表 itemfavi、角色表 role。
  - 新增 user 表支持注册/登录，bcrypt 存密码哈希，登录返回 Bearer JWT。
  - 将 itemfavi 表中的用户字段从 uId 改为 userId，对应 user.id。
  - 除注册、登录、/api/resource 外，其余 API 都要求登录。
  - 列表、详情、角色响应结构按 backend/data/items.json、item.json、role.json 兼容输出。

  ## Key Changes

  - 配置：
      - LSDB_DB_PATH：默认 backend/data/test.db。
      - LSDB_FILE_ROOT：资源文件根目录，默认 backend/data/files。
      - LSDB_JWT_SECRET：JWT 密钥。

  - 数据库迁移：
      - 启动时创建 user(id, username, password_hash, created_at, updated_at)。
      - user.username 唯一。
      - 若 itemfavi 仍存在 uId 且不存在 userId，迁移为 userId 并保留原收藏数据。
      - itemfavi.userId 对应 user.id。
      - 收藏唯一约束调整为 itemId + userId。
      - 不改动 items、role 的现有字段含义。

  - Item 派生字段：
      - tagList 从 base/category/subcategory/tag/tag2/tag3 生成。
      - isFavi 根据当前用户收藏状态生成。
      - avatar 使用 base 的前三个大写字符。
      - avatarSrc 按当前 item 的资源位置依次检查 category/logo.png、subcategory/logo.png 是否存在，找到即返回 /api/
        resource?...&filename=logo.png，否则为空。

      - thumbnailPath 使用资源相对路径。
      - 详情页补充 imgList/fileList。

  ## API

  - Auth：
      - POST /api/auth/register
          - body: { "username": "...", "password": "..." }

      - POST /api/auth/login
          - body: { "username": "...", "password": "..." }
          - 返回 token 和用户基础信息。

      - GET /api/auth/current
          - 返回当前 JWT 对应的用户基础信息：{ "id": 1, "username": "..." }。

      - POST /api/auth/logout
          - JWT 无状态登出，服务端直接返回成功。

  - Items：
      - GET /api/items
          - 支持 base/category/subcategory/keyword/tag/dateFrom/dateTo/matchMode/favi/type/sort/current/pageSize。
          - 收藏关联使用：LEFT JOIN itemfavi AS b ON a.id = b.itemId AND b.userId = 当前用户 AND b.expired = 0。
          - 返回结构参考 items.json，保留 params/sql1/sql2/sql3/costTime/roleList/list 等字段。
          - 每条 item 补充 favi/isFavi/avatar/avatarSrc/tagList/thumbnailPath/thumbnailW/thumbnailH。
          - roleList：当查询标签或结果 item 的 tag/tag2/tag3 包含 role.name 的标签值时返回匹配角色。

      - GET /api/items/:id
          - 返回结构参考 item.json。
          - 补充 tagList/isFavi/thumbnailPath/thumbnailW/thumbnailH/imgList/fileList。

      - POST /api/items
          - 创建档案。

      - PUT /api/items/:id
          - 修改档案，未提供字段不更新。

  - Favorites：
      - GET /api/favorites
          - 返回当前 user.id 对应的 itemfavi.userId 收藏列表。

      - POST /api/items/:id/favorite
          - 收藏；若已存在过期记录，则恢复为 expired = 0。

      - DELETE /api/items/:id/favorite
          - 软删除收藏，设置 expired = 1。

  - Role：
      - GET /api/role/:roleId
          - 返回结构参考 role.json。
          - nameList 从 role.name 的分号标签拆分生成。
          - imageList 从 role.images 的 name@image.jpg;... 拆分生成。

  - Resource：
      - GET /api/resource?base=&category=&subcategory=&name=&filename=&force=
          - 公开接口，不要求 JWT。
          - 从 LSDB_FILE_ROOT/base/category/subcategory/name/filename 读取文件，空路径段跳过。
          - 防止路径穿越，支持图片、视频流和 Range 请求。
  - go test ./...
  - 注册、重复注册、登录成功、登录失败。
  - /api/items 分页、tag 查询、收藏筛选、响应字段对齐 items.json。
  - /api/items/:id 详情响应字段对齐 item.json。
  - avatarSrc 在存在 category 或 subcategory 级 logo.png 时返回对应 /api/resource 地址，否则为空。
  - /api/role/:roleId 响应字段对齐 role.json。
  - /api/resource 正常读取、Range 读取、拒绝 ../、force=true 返回默认图。
  - 收藏创建、重复收藏、取消收藏、恢复收藏。

  ## Assumptions

  - 第一阶段只实现后端。
  - 用户表名按你的描述使用 user。
  - itemfavi.userId 是正式字段名；旧 uId 只作为迁移来源。
  - /api/resource 公开访问；force=true 只表示缺省图片兜底。
  - avatarSrc 检查顺序为 category 级 logo.png 优先于 subcategory 级 logo.png。
