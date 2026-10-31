// 一次性探测 v2：用账号密码登录后调用家庭接口（需要 TY_ACCOUNTS）
require("dotenv").config();
const { CloudClient, FileTokenStore } = require("cloud189-sdk");

function loadAccounts() {
  let raw = (process.env.TY_ACCOUNTS || "").trim();
  if (
    (raw.startsWith("'") && raw.endsWith("'")) ||
    (raw.startsWith('"') && raw.endsWith('"'))
  ) {
    raw = raw.slice(1, -1);
  }
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.log("TY_ACCOUNTS parse failed:", e.message);
    return [];
  }
}
const accounts = loadAccounts();

const maskName = (s) => s.replace(/^(.{3}).*(.{4})$/, "$1****$2");
const brief = (e) =>
  (e && (e.response ? `${e.response.statusCode} ${e.response.body}` : e.message)) || "unknown";

(async () => {
  console.log("accounts:", accounts.length);
  for (const { userName, password } of accounts) {
    console.log(`\n=== account ${maskName(userName)}`);
    const client = new CloudClient({
      username: userName,
      password,
      token: new FileTokenStore(`.token/${userName}.json`),
    });
    try {
      const before = await client.getUserSizeInfo();
      console.log("family total (M):", Math.round((before.familyCapacityInfo?.totalSize || 0) / 1048576));
      const list = await client.getFamilyList();
      const fams = list?.familyInfoResp || [];
      console.log("families:", JSON.stringify(fams.map((x) => ({ id: x.familyId, name: x.remarkName }))));
      for (const fam of fams) {
        try {
          const r = await client.familyUserSign(fam.familyId);
          console.log(`familyUserSign[${fam.familyId}] OK:`, JSON.stringify(r));
        } catch (e) {
          console.log(`familyUserSign[${fam.familyId}] ERR:`, brief(e));
        }
      }
      const after = await client.getUserSizeInfo();
      console.log("family total after (M):", Math.round((after.familyCapacityInfo?.totalSize || 0) / 1048576));
    } catch (e) {
      console.log("FATAL:", brief(e));
    }
  }
})();
