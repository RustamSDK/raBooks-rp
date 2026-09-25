/**
 * Law 5: Physical Spooler Hardware Sovereignty
 * Invokes the host operating system's native hardware print spooler dialog
 * without forcing an unwanted PDF file download.
 * Handles sandboxed iframe execution via detached Blob-URL window fallback.
 */
export function executeHardwarePrint(elementId: string, documentTitle: string): void {
  const targetElement = document.getElementById(elementId);
  if (!targetElement) {
    console.error(`ERR_PRINT_TARGET_MISSING: Element #${elementId} not found in DOM.`);
    return;
  }

  // Detect sandboxed iframe environments
  const isSandboxedIframe = typeof window !== 'undefined' && window.self !== window.top;

  if (isSandboxedIframe) {
    try {
      const rawContent = targetElement.outerHTML;
      const printWindowMarkup = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <title>${documentTitle}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @page { size: auto; margin: 10mm 12mm; }
              body { background: #ffffff !important; color: #0f172a !important; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
              .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important; font-variant-numeric: tabular-nums; }
              .print-exact { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            </style>
          </head>
          <body>
            <div class="print-exact">${rawContent}</div>
            <script>
              window.onload = function() {
                window.focus();
                try {
                  window.print();
                } catch (e) {
                  console.error('Print trigger failed in sandbox:', e);
                }
              };
            </script>
          </body>
        </html>
      `;

      const blob = new Blob([printWindowMarkup], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const printWindow = window.open(blobUrl, '_blank');
      
      if (!printWindow) {
        // Fallback to direct print if popup blocked
        window.print();
      }

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch {
      window.print();
    }
  } else {
    window.print();
  }
}
