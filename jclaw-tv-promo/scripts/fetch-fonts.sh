#!/usr/bin/env bash
# Downloads the open-licensed (SIL OFL 1.1) fonts used by the film into fonts/ (gitignored).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p fonts
cd fonts
NOTO=https://github.com/notofonts/noto-cjk/raw/main
GF=https://github.com/google/fonts/raw/main/ofl
get() { [ -s "$1" ] || curl -fsSL -o "$1" "$2"; }
for w in Black Bold Medium Regular Light; do
  get "NotoSansSC-$w.otf" "$NOTO/Sans/SubsetOTF/SC/NotoSansSC-$w.otf"
done
for w in Black Bold SemiBold; do
  get "NotoSerifSC-$w.otf" "$NOTO/Serif/SubsetOTF/SC/NotoSerifSC-$w.otf"
done
get Anton-Regular.ttf          "$GF/anton/Anton-Regular.ttf"
get Inter.ttf                  "$GF/inter/Inter%5Bopsz,wght%5D.ttf"
get CormorantGaramond.ttf      "$GF/cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf"
get JetBrainsMono.ttf          "$GF/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf"
echo "fonts ready: $(ls | tr '\n' ' ')"
