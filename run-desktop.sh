#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

export DISPLAY="${DISPLAY:-:0}"
export WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-0}"
export LD_LIBRARY_PATH="/home/apt/.local/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH"

echo "=== Menjalankan Aplikasi Desktop SiMarta ==="
echo "Lokasi: $DIR"
echo "Database: ~/.local/share/com.gmist.simarta/simarta.db"

if [ -f "./src-tauri/target/release/simarta" ]; then
    echo "Mode: Production Release (Optimized)"
    exec ./src-tauri/target/release/simarta "$@"
else
    echo "Mode: Debug Development"
    exec ./src-tauri/target/debug/simarta "$@"
fi
