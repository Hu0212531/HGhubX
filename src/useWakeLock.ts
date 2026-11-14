import { useCallback, useEffect, useRef, type RefObject } from "react";

/**
 * 播放时保持屏幕常亮（Screen Wake Lock API）。
 * iOS 上内嵌 <video> 播放不会阻止系统息屏，播一会儿屏幕就黑了；
 * 视频开始播就请求 wake lock，暂停/播完/切后台时释放，
 * 切回前台且仍在播时重新请求。
 * 不支持的浏览器上静默失败，不影响播放。
 */
export function useWakeLock(videoRef: RefObject<HTMLVideoElement | null>) {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  const request = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    if (lockRef.current && !lockRef.current.released) return;
    try {
      lockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      /* 被拒绝或不可用时静默失败，不影响播放 */
    }
  }, []);

  const release = useCallback(() => {
    lockRef.current?.release().catch(() => {});
    lockRef.current = null;
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlaying = () => {
      void request();
    };
    const onPaused = () => {
      release();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible" && !v.paused) void request();
    };
    v.addEventListener("playing", onPlaying);
    v.addEventListener("pause", onPaused);
    v.addEventListener("ended", onPaused);
    document.addEventListener("visibilitychange", onVisibility);
    // 挂载时如果已经在播，直接请求一次
    if (!v.paused) void request();
    return () => {
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("pause", onPaused);
      v.removeEventListener("ended", onPaused);
      document.removeEventListener("visibilitychange", onVisibility);
      release();
    };
  }, [videoRef, request, release]);
}
