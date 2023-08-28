import Router from "@koa/router";
import Koa from "koa";
import * as qs from "qs";
import fetch from "node-fetch";
import fs from "fs/promises";
import { resolve, dirname } from "path";

const __dirname = dirname(new URL(import.meta.url).pathname);

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

/** ---------------https://webclipper-oauth.yfd.im------------------ */

router.get("/yuque_oauth", async (ctx) => {
  console.log("yuque_oauth", config);
  const { code, state } = ctx.query;
  const response = await fetch("https://www.yuque.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: config.yuqueClientId,
      client_secret: config.yuqueClientSecret,
      code,
      grant_type: "authorization_code",
    }),
  }).then((re) => re.json());

  console.log("yuque_oauth response", response);

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
  console.log("onenote_oauth", config);
  const { code, state } = ctx.query;
  console.log("onenote_query", ctx.query);
  const response = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: config.oneNoteClientId,
        grant_type: "authorization_code",
        scope: "Notes.Create User.Read offline_access",
        redirect_uri: config.oneNoteRedirectUrl,
        code,
      }),
    }
  ).then((re) => re.json());

  console.log("onenote_oauth response", response);

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

/** ---------------https://api.clipper.website------------------ */

/**
 * not support login
 */
router.get("/api/user/oauth/google", async (ctx) => {
  ctx.status = 302;
  ctx.set("Location", `https://clipper.website/powerpack`);
});

router.get("/api/user/oauth/github", async (ctx) => {
  ctx.status = 302;
  ctx.set("Location", `https://clipper.website/powerpack`);
});

// return empty string
router.get("/api/refresh", async (ctx) => {
  ctx.status = 200;
  ctx.body = JSON.stringify({
    result: "",
  });
});

router.get("/api/user", async (ctx) => {
  ctx.status = 200;
  ctx.body = JSON.stringify({
    result: {
      name: "Version expired.",
      avatar_url: "",
      email: "Version expired.",
      expire_date: "2020-01-01",
      admin: false,
    },
  });
});

/** ---------------https://resource.clipper.website------------------ */

router.get("/config.json", async (ctx) => {
  ctx.status = 200;
  ctx.body = JSON.stringify({
    iconfont: "https://at.alicdn.com/t/font_1402208_ghcp6tuu13c.js",
    chromeWebStoreVersion: "1.33.0",
    edgeWebStoreVersion: "1.33.0",
    firefoxWebStoreVersion: "1.33.0",
    privacyLocale: ["en-US", "zh-CN"],
    changelogLocale: ["en-US", "zh-CN"],
  });
});

router.get("/privacy/(.*)", async (ctx) => {
  ctx.status = 200;
  ctx.body = await fs.readFile(resolve(__dirname, "privacy.md"), "utf-8");
});

router.get("/changelog/(.*)", async (ctx) => {
  ctx.status = 200;
  ctx.body = await fs.readFile(resolve(__dirname, "changelog.md"), "utf-8");
});

app.use(router.routes()).use(router.allowedMethods());
app.listen(3000);
