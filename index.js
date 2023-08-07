import Router from "@koa/router";
import Koa from "koa";
import * as qs from "qs";
import fetch from "node-fetch";

const config = {
  port: process.env.PORT || 3000,
  yuqueClientId: process.env.YUQUE_CLIENT_ID,
  yuqueClientSecret: process.env.YUQUE_CLIENT_SECRET,
  oneNoteClientId: process.env.ONENOTE_CLIENT_ID,
  oneNoteRedirectUrl: process.env.ONENOTE_REDIRECT_URL,
};

console.log("port : ", !!config.port);
console.log("yuqueClientId : ", !!config.yuqueClientId);
console.log("yuqueClientSecret : ", !!config.yuqueClientSecret);
console.log("oneNoteClientId : ", !!config.oneNoteClientId);
console.log("oneNoteRedirectUrl : ", !!config.oneNoteRedirectUrl);

const app = new Koa();
const router = new Router();

function redirect(ctx, state, query) {
  const isFirefox = ctx.headers["user-agent"]?.includes("Firefox");
  if (isFirefox) {
    ctx.set("Location", `moz-extension://${state}/tool.html#/auth?${query}`);
  } else {
    ctx.set("Location", `chrome-extension://${state}/tool.html#/auth?${query}`);
  }
  ctx.status = 302;
}

router.get("/yuque_oauth", async (ctx) => {
  console.log("yuque_oauth");
  const { code, state } = ctx.query;
  const response = fetch("https://www.yuque.com/oauth2/token", {
    method: "POST",
    body: JSON.stringify({
      client_id: config.yuqueClientId,
      client_secret: config.yuqueClientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });
  redirect(
    ctx,
    state,
    `${qs.stringify({
      access_token: response.access_token,
      type: "yuque_oauth",
    })}`
  );
});

router.get("/onenote_oauth", async (ctx) => {
  console.log("onenote_oauth");
  const { code, state } = ctx.query;
  const response = fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      body: JSON.stringify({
        client_id: config.oneNoteClientId,
        grant_type: "authorization_code",
        scope: "Notes.Create User.Read offline_access",
        redirect_uri: config.oneNoteRedirectUrl,
        code,
      }),
    }
  );
  redirect(
    ctx,
    state,
    `${qs.stringify({
      access_token: response.access_token,
      type: "onenote_oauth",
      refresh_token: response.refresh_token,
    })}`
  );
});

router.get("/ping", async (ctx) => {
  ctx.status = 200;
  ctx.body = `pong ${Date.now()}`;
});

app.use(router.routes()).use(router.allowedMethods());
app.listen(3000);
