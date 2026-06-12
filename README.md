# DiscordDragonBOT
DC機器人開發專案

## 環境設定

複製 `.env.example` 為 `.env` 並填入：

```env
TOKEN=          # Discord Developer Portal → Bot → Reset Token
CLIENT_ID=      # OAuth2 Client ID
GUILD_ID=       # 右鍵伺服器圖示 → 複製ID（需開啟開發者模式）
GEMINI_API_KEY= # aistudio.google.com 申請
GEMINI_MODEL=   # 預設 gemini-2.5-flash，可改為 gemini-3.0-flash 等
```

## 本機開發

```bash
# 開發模式（hot-reload）
docker-compose up --build
# 記得把 docker-compose.yml 的 command 改為 npm run dev
```

## GCP 部署

```bash
# 第一次
git clone https://github.com/Bing-Xuan-Lu/DiscordDragonBOT.git
cd DiscordDragonBOT
cp .env.example .env
nano .env
docker-compose up -d --build

# 更新
git pull
docker-compose up -d --build
```

## 常用維運指令

```bash
# 查看即時 log
docker-compose logs -f

# 停止
docker-compose down
```

## Discord 開發者後台

[Discord Developer Portal](https://discord.com/developers/applications)
