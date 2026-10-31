// 一次性探测：家庭签到接口是否还对当前账号有效
require("dotenv").config();
const { CloudClient, FileTokenStore } = require("cloud189-sdk");
const accounts = require("./accounts");

const maskName = (s) => s.replace(/^(.{3}).*(.{4})$/, "$1****$2");
const brief = (e) =>
  (e && (e.response ? `${e.response.statusCode} ${e.response.body}` : e.message)) || "unknown";

(async () => {
  if (!accounts.length) {
    console.log("NO_ACCOUNTS: TY_ACCOUNTS not set");
    return;
  }
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
        JSON.stringify(fams.map((f) => ({ id: f.familyId, name: f.remarkName, members: f.memberCount })))
      );
    } catch (e) {
      console.log("familyList ERR:", brief(e));
    }

    for (const f of fams) {
      try {
        const r = await client.familyUserSign(f.familyId);
        console.log(`familyUserSign[${f.familyId}] OK:`, JSON.stringify(r));
      } catch (e) {
        console.log(`familyUserSign[${f.familyId}] ERR:`, brief(e));
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
