// クリップボードへのコピー
//
// html を渡すと、プレーンテキストと HTML の両方をコピーする（Word などに貼るとイタリックが残る）。
// Clipboard API が使えない環境（古いブラウザ、http の非セキュアな接続など）では execCommand で代用する。

function legacyCopy(text, html) {
  const onCopy = (event) => {
    event.clipboardData.setData('text/plain', text);
    if (html) event.clipboardData.setData('text/html', html);
    event.preventDefault();
  };
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  document.addEventListener('copy', onCopy);
  try {
    textarea.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.removeEventListener('copy', onCopy);
    textarea.remove();
  }
}

/** コピーできたら true */
export async function copyToClipboard({ text, html = null }) {
  if (navigator.clipboard && window.isSecureContext) {
    if (html && typeof ClipboardItem !== 'undefined') {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([text], { type: 'text/plain' }),
            'text/html': new Blob([html], { type: 'text/html' }),
          }),
        ]);
        return true;
      } catch {
        // 次の方法を試す
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 次の方法を試す
    }
  }
  return legacyCopy(text, html);
}
