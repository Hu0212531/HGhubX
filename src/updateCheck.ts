import { api, type UpdateInfo } from "./shared/api/api";

/**
 * 更新检查（仿 Kumone）：查用户自己 fork 的 Release，有新版就弹窗提示。
 *
 * 后端 `check_update` 查的是 Hu0212531/HGhubX（见 src-tauri/src/updater.rs 的 REPO），
 * 不是上游 zxsos/HGhubX——用户的定制版只发在自己 fork 里，查上游永远看不到新版。
 * iOS 上后端会把 .ipa 直链放在 info.asset.url 里，点「前往下载」就直接下包，
 * 下完在「文件」里分享到 LCSign 签名安装。
 */

/** 「稍后」点过的版本号，存在本地；同一版 24 小时内不再弹。 */
const DISMISSED_KEY = "hghubx.update.dismissed";
const DISMISSED_TTL_MS = 24 * 60 * 60 * 1000;

type Dismissed = { version: string; at: number };

function readDismissed(): Dismissed | null {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Dismissed;
    if (!d || typeof d.version !== "string" || typeof d.at !== "number") return null;
    return d;
  } catch {
    return null;
  }
}

export function dismissUpdate(version: string) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify({ version, at: Date.now() }));
  } catch { /* ignore */ }
}

function isDismissed(version: string): boolean {
  const d = readDismissed();
  if (!d || d.version !== version) return false;
  return Date.now() - d.at < DISMISSED_TTL_MS;
}

/** 查一次更新。有新版且没被「稍后」过就返回 info，否则返回 null。
 *  ignoreDismissed=true 时忽略「稍后」记录（设置页手动检查用）。 */
export async function checkForUpdate(ignoreDismissed = false): Promise<UpdateInfo | null> {
  const info = await api.checkUpdate();
  if (!info.has_update) return null;
  if (!ignoreDismissed && isDismissed(info.latest)) return null;
  return info;
}

/** 打开更新下载：优先用安装包直链（iOS 上是 .ipa，Safari 下完就能转到 LCSign），
 *  没直链就打开 Release 页。返回是否成功打开。 */
export async function openUpdateDownload(info: UpdateInfo): Promise<boolean> {
  const target = info.asset?.url || info.url;
  try {
    await api.openUrl(target);
    return true;
  } catch {
    return false;
  }
}
