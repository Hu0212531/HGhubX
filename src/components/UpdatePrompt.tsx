import { useEffect, useState } from "react";
import { Button, Surface } from "./ios/controls";
import { Modal } from "./ui";
import { copyText } from "../clipboard";
import { useStore } from "../store";
import type { UpdateInfo } from "../api";
import { checkForUpdate, dismissUpdate, openUpdateDownload } from "../updateCheck";

/**
 * 更新弹窗：和设置页原来那份同款 UI（发现新版本 / 版本号 / 更新说明 / 稍后 / 前往下载）。
 * 「前往下载」优先打开安装包直链（iOS 上是 .ipa），Safari 下完在「文件」里分享到 LCSign 签名安装；
 * 没直链就打开 Release 页。
 */
export function UpdateModal({ info, onClose }: { info: UpdateInfo | null; onClose: () => void }) {
  const { toast } = useStore();
  const [opening, setOpening] = useState("");
  const open = !!info?.has_update;
  const doUpdate = async () => {
    if (!info) return;
    setOpening("打开中…");
    const ok = await openUpdateDownload(info);
    if (ok) {
      setOpening("");
      onClose();
      return;
    }
    const target = info.asset?.url || info.url;
    await copyText(target)
      .then(() => toast("下载地址已复制，可在浏览器粘贴打开", "ok"))
      .catch(() => toast("打开失败", "info"));
    setOpening("");
  };
  return (
    <Modal label="发现新版本" open={open} onClose={onClose} width={392}>
      <div className="p-5">
        <div className="text-[16px] font-bold text-on">发现新版本</div>
        <p className="text-[12px] text-mut mt-1.5">
          v{info?.current} → <b className="text-on">v{info?.latest}</b>
          {info?.published_at ? ` · ${info.published_at.slice(0, 10)}` : ""}
        </p>
        {!!info?.notes && (
          <Surface className="mt-3 max-h-[180px] scroll-y rounded-(--r-sm) bg-s2 p-3 text-[12px] text-mut whitespace-pre-wrap leading-relaxed">{info.notes}</Surface>
        )}
        <div className="flex gap-2 mt-4">
          <Button onClick={() => { if (info) dismissUpdate(info.latest); onClose(); }} disabled={!!opening}
            className="flex-1 h-9 rounded-(--r-ctl) bg-s3 text-[14px] text-on/80 pressable disabled:opacity-60">稍后</Button>
          <Button onClick={() => void doUpdate()} disabled={!!opening}
            className="flex-1 h-9 rounded-(--r-ctl) bg-primary text-[14px] font-semibold text-on-primary pressable disabled:opacity-60">
            {opening || "前往下载"}
          </Button>
        </div>
        <details className="text-[12px] text-mut mt-2.5"><summary className="py-3 cursor-pointer">下载地址</summary><p className="break-all select-text">{info?.asset?.url || info?.url}</p></details>
      </div>
    </Modal>
  );
}

/**
 * 启动自动检查更新（仿 Kumone）：打开 App 1.5 秒后查一次 fork 的 Release，
 * 有新版且没被「稍后」过就弹更新窗。查不到或已是最新就静默，不打扰。
 */
export function AutoUpdateCheck() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(() => {
      checkForUpdate()
        .then((r) => { if (alive && r) setInfo(r); })
        .catch(() => {});
    }, 1500);
    return () => { alive = false; window.clearTimeout(t); };
  }, []);
  return <UpdateModal info={info} onClose={() => setInfo(null)} />;
}
