import JSZip from 'jszip';
import { EXTENSION_FILES } from '../data/extensionCode';
import { ICON_BASE64 } from '../data/iconBase64';

export async function createExtensionZipBlob(): Promise<Blob> {
  const zip = new JSZip();

  // Add all core extension files (manifest.json, popup.html, popup.css, popup.js, content.js, wallpaper.css, background.js, README.txt)
  for (const [filename, file] of Object.entries(EXTENSION_FILES)) {
    zip.file(filename, file.content);
  }

  // Add icons folder with ALL PNG and SVG icons
  const iconFolder = zip.folder('icons');
  if (iconFolder) {
    // Add real binary PNG icons from base64
    for (const [size, b64] of Object.entries(ICON_BASE64)) {
      iconFolder.file(`${size}.png`, b64, { base64: true });
    }
    // Also include telegram.png and discord.png
    if (ICON_BASE64['32']) {
      iconFolder.file('telegram.png', ICON_BASE64['32'], { base64: true });
      iconFolder.file('discord.png', ICON_BASE64['32'], { base64: true });
    }

    // Add SVG vector icons
    iconFolder.file(
      'discord.svg',
      `<svg viewBox="0 0 24 24" fill="#5865f2" xmlns="http://www.w3.org/2000/svg"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`
    );
    iconFolder.file(
      'telegram.svg',
      `<svg viewBox="0 0 24 24" fill="#229ed9" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>`
    );
    iconFolder.file(
      'logo.svg',
      `<svg viewBox="0 0 128 128" width="128" height="128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sq-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#181b24"/>
      <stop offset="60%" stop-color="#101218"/>
      <stop offset="100%" stop-color="#0a0c10"/>
    </linearGradient>
    <linearGradient id="metal-steel" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stop-color="#b8c2d4"/>
      <stop offset="30%" stop-color="#939dae"/>
      <stop offset="65%" stop-color="#5c6475"/>
      <stop offset="100%" stop-color="#3c424e"/>
    </linearGradient>
    <linearGradient id="metal-light-edge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="35%" stop-color="#c5d0e2" stop-opacity="0.6"/>
      <stop offset="70%" stop-color="#49505f" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#1e222a" stop-opacity="0.8"/>
    </linearGradient>
    <linearGradient id="rim-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.04"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#sq-bg)"/>
  <rect x="2" y="2" width="124" height="124" rx="26" stroke="url(#rim-grad)" stroke-width="2" fill="none"/>
  <path d="M26 28 L50 28 L64 49 L78 28 L102 28 L78 64 L102 100 L78 100 L64 79 L50 100 L26 100 L50 64 Z" fill="#05070a" opacity="0.8" transform="translate(0, 3.5)"/>
  <path d="M26 28 L50 28 L64 49 L78 28 L102 28 L78 64 L102 100 L78 100 L64 79 L50 100 L26 100 L50 64 Z" fill="url(#metal-steel)"/>
  <path d="M26 28 L50 28 L64 49 L78 28 L102 28 L78 64 L102 100 L78 100 L64 79 L50 100 L26 100 L50 64 Z" stroke="url(#metal-light-edge)" stroke-width="2.5" stroke-linejoin="round" fill="none"/>
</svg>`
    );
  }

  return await zip.generateAsync({ type: 'blob' });
}

export async function downloadExtensionZip() {
  const blob = await createExtensionZipBlob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'faceit-xlr-extension-v2.2.0.zip';
  link.click();
}
