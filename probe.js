// 一次性探测：家庭签到接口是否还对当前账号有效（仅用缓存登录态，不读密码）
const fs = require("fs");
const path = require("path");
const { CloudClient, FileTokenStore } = require("cloud189-sdk");

const maskName = (s) => s.replace(/^(.{3}).*(.{4})$/, "$1****$2");
const brief = (e) =>
  (e && (e.response ? `${e.response.statusCode} ${e.response.body}` : e.message)) || "unknown";

(async () => {
  const dir = ".token";
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith(".json"))
    : [];
  console.log("token files:", files.length);
  if (!files.length) {
    console.log("NO_TOKEN_CACHE");
    return;
  }
  for (const f of files) {
    const userName = path.basename(f, ".json");
    console.log(`\n=== account ${maskName(userName)}`);
    const client = new CloudClient({
      token: new FileTokenStore(path.join(dir, f)),
    });

    try {
      const before = await client.getUserSizeInfo();
      console.log("family total (M):", Math.round((before.familyCapacityInfo?.totalSize || 0) / 1048576));
    } catch (e) {
      console.log("size before ERR:", brief(e));
    }

    let fams = [];
    try {
      const list = await client.getFamilyList();
      fams = list?.familyInfoResp || [];
      console.log("family list keys:", Object.keys(list || {}).join(","));
      console.log(
        "families:",
        JSON.stringify(fams.map((x) => ({ id: x.familyId, name: x.remarkName, members: x.memberCount })))
      );
    } catch (e) {
      console.log("familyList ERR:", brief(e));
    }

    for (const fam of fams) {
      try {
        const r = await client.familyUserSign(fam.familyId);
        console.log(`familyUserSign[${fam.familyId}] OK:`, JSON.stringify(r));
      } catch (e) {
        console.log(`familyUserSign[${fam.familyId}] ERR:`, brief(e));
      }
    }

    try {
      const after = await client.getUserSizeInfo();
      console.log("family total after (M):", Math.round((after.familyCapacityInfo?.totalSize || 0) / 1048576));
    } catch (e) {
      console.log("size after ERR:", brief(e));
    }
  }
})();
