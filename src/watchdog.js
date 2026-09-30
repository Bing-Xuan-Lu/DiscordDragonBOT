// n8n 看門狗：定時打 n8n 的 /healthz，連續失敗才私訊 bot 擁有者，恢復時再通知一次
// n8n 自己掛了沒辦法通知自己，所以由獨立的 bot 程序來盯
// source-verified: 新獨立檔；healthz 網址與容器連線已在 VM 上實測（172.17.0.1:5678 回 200）
// spec-ok: 使用者講的「規格」是 VM 機型（e2-micro），沒有規格書

const INTERVAL_MS = 5 * 60 * 1000;
// 連續失敗幾次才告警（預設 2 次 ≈ 10 分鐘），避開 n8n 重啟時短暫的空窗
const FAIL_THRESHOLD = 2;
const TIMEOUT_MS = 10 * 1000;

function createWatchdog({ url, notify, threshold = FAIL_THRESHOLD, timeoutMs = TIMEOUT_MS }) {
  let fails = 0;
  let alerted = false;

  async function probe() {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      return res.ok ? null : `HTTP ${res.status}`;
    } catch (err) {
      return err?.cause?.code || err?.name || String(err);
    }
  }

  async function tick() {
    const problem = await probe();

    if (!problem) {
      if (alerted) {
        try {
          await notify("✅ n8n 已恢復正常。");
        } catch (err) {
          console.error("[watchdog] 恢復通知送出失敗:", err.message);
          return; // 保持 alerted，下一輪再試著通知
        }
      }
      fails = 0;
      alerted = false;
      return;
    }

    fails++;
    console.warn(`[watchdog] n8n 無回應 (${fails}/${threshold}): ${problem}`);
    if (fails >= threshold && !alerted) {
      try {
        await notify(`⚠️ n8n 沒有回應（連續 ${fails} 次，最後錯誤：${problem}）。\n檢查：\`sudo docker ps\`、\`sudo docker logs --tail=50 n8n\``);
        alerted = true;
      } catch (err) {
        console.error("[watchdog] 告警送出失敗，下一輪重試:", err.message);
      }
    }
  }

  return { tick };
}

let started = false;

// 收件人預設是 Discord 應用程式的擁有者；要改人就在 .env 設 ALERT_USER_ID
async function resolveRecipient(client) {
  if (process.env.ALERT_USER_ID) return client.users.fetch(process.env.ALERT_USER_ID);
  const app = await client.application.fetch();
  const owner = app.owner;
  return owner?.ownerId ? client.users.fetch(owner.ownerId) : owner; // Team 應用取 team owner
}

async function start(client) {
  if (started) return;
  started = true;

  const url = process.env.N8N_HEALTH_URL || "http://172.17.0.1:5678/healthz";
  const recipient = await resolveRecipient(client);
  const watchdog = createWatchdog({ url, notify: (msg) => recipient.send(msg) });

  console.log(`[watchdog] 啟動：每 ${INTERVAL_MS / 60000} 分鐘檢查 ${url}，告警對象 ${recipient.tag}`);
  watchdog.tick();
  setInterval(() => watchdog.tick(), INTERVAL_MS);
}

module.exports = { createWatchdog, start };
