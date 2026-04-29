"use client";

/**
 * Load html2canvas from CDN on demand — no npm install needed.
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
 * Capture an HTML element as a PNG blob.
 */
async function captureElement(element: HTMLElement): Promise<Blob | null> {
  try {
    const html2canvas = await loadHtml2Canvas();
    const canvas = await html2canvas(element, {
      backgroundColor: "#0A0604",
      scale: 2,
      useCORS: true,
      logging: false,
    });
    return new Promise((resolve) => {
      canvas.toBlob((blob: Blob | null) => resolve(blob), "image/png", 1.0);
    });
  } catch {
    return null;
  }
}

/**
 * Download the card as a PNG image.
 */
export async function downloadCard(
  element: HTMLElement,
  filename = "aura-game-card"
): Promise<boolean> {
  const blob = await captureElement(element);
  if (!blob) return false;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Share the card using the native share sheet (mobile) or clipboard/download.
 */
export async function shareCard(
  element: HTMLElement,
  title = "My Aura Game Card",
  text = "Check out my game card from Aura!"
): Promise<boolean> {
  const blob = await captureElement(element);
  if (!blob) return false;

  // Native Web Share API — opens share sheet on mobile (WhatsApp, Instagram, etc.)
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], "aura-game-card.png", { type: "image/png" });
    const shareData = { title, text, files: [file] };

    if (navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return true;
      } catch {
        // User cancelled — fall through
      }
    }
  }

  // Fallback: copy image to clipboard
  if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      return true;
    } catch {
      // Clipboard failed — fall through
    }
  }

  // Final fallback: download the image
  return downloadCard(element);
}
