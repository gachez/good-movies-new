function isShareCancellation(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String(error.name) : "";
  const message = "message" in error ? String(error.message).toLowerCase() : "";

  return (
    name === "AbortError" ||
    message.includes("cancel") ||
    message.includes("abort")
  );
}

export async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the selection-based fallback below.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    const copied = document.execCommand("copy");
    if (!copied) throw new Error("Copy command failed");
  } finally {
    document.body.removeChild(textarea);
  }
}

export async function shareOrCopy({
  title,
  text,
  url,
}: {
  title: string;
  text: string;
  url: string;
}) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return "shared" as const;
    } catch (error) {
      if (!isShareCancellation(error)) {
        console.warn("Native sharing failed. Falling back to copy.", error);
      }
    }
  }

  await copyTextToClipboard(url);
  return "copied" as const;
}
