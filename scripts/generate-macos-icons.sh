#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
source_image='src/assets/icons/F94F6187-A6B8-4CE2-B79D-1FC718340661.png'
icon_dir='assets/icons'
iconset="$icon_dir/thyroid-companion.iconset"
mkdir -p "$iconset"
# The supplied file has a .png extension but contains JPEG data. Keep it untouched.
sips -s format png "$source_image" --out "$icon_dir/butterfly-source.png" >/dev/null
for size in 16 32 128 256 512; do
  sips -z "$size" "$size" "$icon_dir/butterfly-source.png" --out "$iconset/icon_${size}x${size}.png" >/dev/null
  retina_size=$((size * 2))
  sips -z "$retina_size" "$retina_size" "$icon_dir/butterfly-source.png" --out "$iconset/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$iconset" -o "$icon_dir/thyroid-companion.icns"
echo "Created $icon_dir/thyroid-companion.icns (16–1024 pixel representations)."
