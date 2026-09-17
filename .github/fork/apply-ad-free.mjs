import { readFileSync, rmSync, writeFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function write(path, content) {
  writeFileSync(path, content);
}

function replaceOnce(path, before, after = "") {
  const source = read(path);
  const first = source.indexOf(before);
  if (first === -1 || source.indexOf(before, first + before.length) !== -1) {
    throw new Error(`${path}: expected exactly one match`);
  }
  write(path, source.slice(0, first) + after + source.slice(first + before.length));
}

function removeBetween(path, start, end) {
  const source = read(path);
  const first = source.indexOf(start);
  const last = source.indexOf(end, first + start.length);
  if (first === -1 || last === -1 || source.indexOf(start, first + start.length) !== -1) {
    throw new Error(`${path}: expected one block from ${JSON.stringify(start)} to ${JSON.stringify(end)}`);
  }
  write(path, source.slice(0, first) + source.slice(last));
}

const appLayout = "apps/desktop/src/shell/AppLayout.tsx";
for (const line of [
  'import { AdMenu } from "./ads/AdMenu";\n',
  'import { FloatingAd } from "./ads/FloatingAd";\n',
  'import { loadCachedAds, saveCachedAds } from "./ads/cache";\n',
  'import { AdActionType, type AdAction, type AdSlot } from "./ads/types";\n',
  'import { useI18n } from "../i18n/store";\n',
]) replaceOnce(appLayout, line);
replaceOnce(appLayout, 'import { useCallback, useEffect, useRef, useState } from "react";', 'import { useCallback, useState } from "react";');
replaceOnce(appLayout, 'const readAdStorageKey = "cursor-byok:read-ad-ids";\n');
replaceOnce(appLayout, 'const dismissedAdStorageKey = "cursor-byok:dismissed-ad-ids";\n');
removeBetween(appLayout, "function loadStoredAdIds", "export function AppLayout");
replaceOnce(appLayout, "  const { locale } = useI18n();\n");
for (const line of [
  "  const [ads, setAds] = useState<AdSlot[]>(() => loadCachedAds());\n",
  "  const [activeAd, setActiveAd] = useState<AdSlot | null>(null);\n",
  "  const [dismissCandidate, setDismissCandidate] = useState<AdSlot | null>(null);\n",
  '  const [dismissReason, setDismissReason] = useState("");\n',
]) replaceOnce(appLayout, line);
removeBetween(appLayout, "  const [readAdIds, setReadAdIds]", "  const menuItems: MenuItem[]");
removeBetween(appLayout, "  useEffect(() => {", "  return <PageLayout");
replaceOnce(appLayout, "        <AdMenu ads={visibleAds} activeAdId={activeAd?.id} dismissingAdId={dismissCandidate?.id} readAdIds={readAdIds} triggerRefs={adTriggers} onOpen={openAd} onDismiss={openDismissAd} />\n");
replaceOnce(appLayout, "    {activeAd && <FloatingAd ad={activeAd} trigger={adTriggers.current.get(activeAd.id) ?? null} onClose={closeAd} onAction={performAdAction} />}\n");
removeBetween(appLayout, '    <ConfirmDialog\n      id="dismiss-ad-dialog"', "    <main");

removeBetween("apps/desktop/src/shell/AppLayout.module.scss", ".dismissReason {", ".content {");

const api = "apps/desktop/src/shared/api.ts";
replaceOnce(api, 'import type { AdRuntime } from "../shell/ads/types";\n');
removeBetween(api, "  ads: (", "  models:");

replaceOnce("apps/desktop/src/demo/api.ts", '    if (path === "/promotions") return json({ slots: [] });\n');

const desktopPackagePath = "apps/desktop/package.json";
const desktopPackage = JSON.parse(read(desktopPackagePath));
if (desktopPackage.dependencies?.["react-css-marquee"] === undefined) {
  throw new Error(`${desktopPackagePath}: react-css-marquee dependency is missing`);
}
delete desktopPackage.dependencies["react-css-marquee"];
write(desktopPackagePath, `${JSON.stringify(desktopPackage, null, 2)}\n`);

const controlMod = "server/src/control/mod.rs";
replaceOnce(controlMod, "mod ads;\n");
removeBetween(controlMod, '        .route("/__byok-api__/api/promotions"', '        .route(\n            "/__byok-api__/api/models"');

const controlService = "server/src/control/service.rs";
replaceOnce(controlService, 'use super::ads::{\n    AdDismissalInput, AdRuntime, ADS_ENDPOINT, APP_VERSION_HEADER, DEVICE_ID_HEADER,\n    DISABLED_AD_IDS_HEADER, LANGUAGE_HEADER, OS_HEADER,\n};\n\n');
replaceOnce(controlService, "    clients: crate::network::NetworkClients,\n    app_version: String,\n", "    clients: crate::network::NetworkClients,\n");
replaceOnce(controlService, "        clients: crate::network::NetworkClients,\n        app_version: String,\n", "        clients: crate::network::NetworkClients,\n");
replaceOnce(controlService, "            clients,\n            app_version,\n", "            clients,\n");
removeBetween(controlService, "    pub(super) async fn ads(", "    pub async fn models");

replaceOnce(
  "server/src/app.rs",
  "            clients.clone(),\n            config.app_version.clone(),\n        )?;\n        let harness = control.cursor_harness().clone();",
  "            clients.clone(),\n        )?;\n        let harness = control.cursor_harness().clone();",
);

const settings = "server/src/store/settings.rs";
replaceOnce(settings, 'const INSTALLATION_ID_KEY: &str = "installation_id";\n');
removeBetween(settings, "    pub(crate) async fn installation_id", "    pub(crate) async fn proxy_settings_secret");

replaceOnce(
  "apps/desktop/src-tauri/tauri.conf.json",
  "https://github.com/leookun/cursor-byok/releases/latest/download/latest.json",
  "https://github.com/jiuer12138/cursor-byok/releases/latest/download/latest.json",
);
replaceOnce(
  "apps/desktop/src-tauri/src/update/mod.rs",
  "https://github.com/leookun/cursor-byok/releases/latest/download/portable-latest.json",
  "https://github.com/jiuer12138/cursor-byok/releases/latest/download/portable-latest.json",
);

for (const path of [
  "apps/desktop/src/shell/ads",
  "server/src/control/ads.rs",
]) rmSync(path, { recursive: true, force: true });

console.log("Applied ad-free fork customization.");
