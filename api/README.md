# AI 歌詞服務

網頁把「情境＋抱怨」送到這裡，交給 Claude 寫成 8 句饒舌歌詞再回傳。部署在 Cloudflare Workers（免費方案），由 feature/music-visual 負責。

- **網站本身還是純前端**，不需要 npm。只有這個資料夾需要，而且只有負責部署的人要用。
- **金鑰**只存在 Cloudflare（`wrangler secret put ANTHROPIC_API_KEY`），不會進 repo，也不會出現在網頁裡。
- **抱怨不記錄、不儲存**，只在這次請求裡轉交給 Claude。
- **防刷**：每個 IP 每分鐘最多 5 首；只接受 localhost 跟 `ALLOWED_ORIGINS` 裡列的網址。
- **連不上時**網頁會自動改用 `js/rap.js` 裡預先寫好的情境歌詞，流程不會斷。

## 改歌詞風格

改 `worker.js` 最上面的 `SYSTEM`（給 AI 的規則），再請負責人重新部署：

```bash
cd api
npm install
npx wrangler deploy
```

正式網站上線後，把網址加進 `wrangler.jsonc` 的 `ALLOWED_ORIGINS`。
