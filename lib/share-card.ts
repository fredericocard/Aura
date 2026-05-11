"use client";

/**
 * Load html2canvas from CDN on demand.
 */
let _html2canvas: any = null;
async function loadHtml2Canvas(): Promise<any> {
  if (_html2canvas) return _html2canvas;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.onload = () => {
      _html2canvas = (window as any).html2canvas;
      resolve(_html2canvas);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Fetch a remote image and convert it to a base64 data URI.
 * Sidesteps CORS — the resulting data: URL is same-origin so html2canvas
 * can embed it without any cross-origin restriction.
 */
async function imageToDataUri(src: string): Promise<string | null> {
  try {
    const res = await fetch(src, { mode: "cors", credentials: "omit" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Replace every external <img src> in the subtree with a base64 data URI,
 * waiting for each new image to actually paint. Returns a restore function.
 */
async function inlineImages(root: HTMLElement): Promise<() => void> {
  const imgs = Array.from(root.querySelectorAll("img")) as HTMLImageElement[];
  const restore: Array<() => void> = [];
  await Promise.all(
    imgs.map(async (img) => {
      const original = img.getAttribute("src") ?? "";
      if (!original || original.startsWith("data:") || original.startsWith("blob:")) return;
      const dataUri = await imageToDataUri(original);
      if (!dataUri) return;
      img.setAttribute("src", dataUri);
      await new Promise<void>((res) => {
        if (img.complete && img.naturalWidth > 0) res();
        else { img.onload = () => res(); img.onerror = () => res(); }
      });
      restore.push(() => img.setAttribute("src", original));
    })
  );
  return () => restore.forEach((fn) => fn());
}

/**
 * Capture an HTML element as a JPEG blob (q=0.95). Pre-inlines all <img> tags
 * as base64 data URIs first so CORS never breaks the capture.
 */
async function captureElement(element: HTMLElement): Promise<Blob | null> {
  let restore: (() => void) | null = null;
  try {
    restore = await inlineImages(element);
    const html2canvas = await loadHtml2Canvas();
    const canvas = await html2canvas(element, {
      backgroundColor: "#0A0604",
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      imageTimeout: 15000,
    });
    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob: Blob | null) => resolve(blob), "image/jpeg", 0.95);
    });
  } catch {
    return null;
  } finally {
    if (restore) restore();
  }
}

/** Download the card as a JPEG image. */
export async function downloadCard(
  element: HTMLElement,
  filename = "aura-game-card"
): Promise<boolean> {
  const blob = await captureElement(element);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.jpg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

/** Share the card via native share sheet, clipboard, or download fallback. */
export async function shareCard(
  element: HTMLElement,
  title = "My Aura Game Card",
  text = "Check out my game card from Aura!"
): Promise<boolean> {
  const blob = await captureElement(element);
  if (!blob) return false;

  if (navigator.share && navigator.canShare) {
    const file = new File([blob], "aura-game-card.jpg", { type: "image/jpeg" });
    const shareData = { title, text, files: [file] };
    if (navigator.canShare(shareData)) {
      try { await navigator.share(shareData); return true; } catch { /* cancelled */ }
    }
  }

  if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/jpeg": blob })]);
      return true;
    } catch { /* fall through */ }
  }

  return downloadCard(element);
}
