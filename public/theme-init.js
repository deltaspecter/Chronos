// Theme und Schriftgröße vor dem ersten Rendern setzen (verhindert Aufblitzen).
// Als eigene Datei statt Inline-Skript, damit die Content-Security-Policy ohne 'unsafe-inline' auskommt.
try {
  var s = JSON.parse(localStorage.getItem('chronos-settings') || '{}').state || {}
  var t = s.theme || 'dark'
  if (t === 'system') t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  document.documentElement.dataset.theme = t
  if (s.fontScale) document.documentElement.style.setProperty('--font-scale', s.fontScale)
  if (s.lineHeight) document.documentElement.style.setProperty('--reading-leading', s.lineHeight)
} catch (e) {}
