#!/usr/bin/env bash
# Delivery encode: 2-pass x264 at ~4.2 Mbit/s from the CRF-16 master, audio straight from the WAV.
# Run after `npm run build` (which writes video/jclaw-tv-promo.mp4 as the master; move it to build/master.mp4 first).
set -euo pipefail
cd "$(dirname "$0")/../build"
FF=${FFMPEG:-ffmpeg}
X="-c:v libx264 -preset slow -tune film -b:v 4200k -maxrate 9000k -bufsize 12000k"
$FF -y -loglevel error -i master.mp4 $X -pass 1 -an -f null /dev/null
$FF -y -loglevel error -i master.mp4 -i soundtrack.wav -map 0:v -map 1:a $X -pass 2 -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart -shortest ../video/jclaw-tv-promo.mp4
$FF -y -loglevel error -ss 152.2 -i ../video/jclaw-tv-promo.mp4 -frames:v 1 -q:v 2 ../video/poster.jpg
