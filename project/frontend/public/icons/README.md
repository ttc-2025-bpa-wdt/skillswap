# PWA Icons

This directory contains icons for the SkillSwap Progressive Web App.

## Required Icons

Generate the following icon sizes from the source logo (`../images/logos/logo-lg.png`):

| Filename | Size | Purpose |
|----------|------|---------|
| `icon-72x72.png` | 72×72 | Android Chrome |
| `icon-96x96.png` | 96×96 | Android Chrome |
| `icon-128x128.png` | 128×128 | Android Chrome |
| `icon-144x144.png` | 144×144 | Android Chrome |
| `icon-152x152.png` | 152×152 | iOS Safari |
| `icon-192x192.png` | 192×192 | Android Chrome |
| `icon-384x384.png` | 384×384 | Android Chrome |
| `icon-512x512.png` | 512×512 | Android Chrome |
| `maskable-icon-512x512.png` | 512×512 | Android Adaptive Icon |
| `badge-72x72.png` | 72×72 | Notification badge |

## Generation

Use the following tools to generate icons:

### Option 1: Online Generator
- https://realfavicongenerator.net/
- Upload `../images/logos/logo-lg.png`
- Download generated package

### Option 2: PWA Asset Generator
```bash
npx pwa-asset-generator ../images/logos/logo-lg.png . --manifest ../manifest.json
```

### Option 3: Sharp (Node.js)
```bash
node scripts/generate-icons.js
```

## Maskable Icons

For maskable icons (Android adaptive icons), ensure:
- Safe zone: 80% centered circle
- Icon should be contained within safe zone
- Background should extend to edges
- No transparent backgrounds for maskable icons

## Favicon

The favicon.svg is in the parent public directory and will be used for browser tabs.