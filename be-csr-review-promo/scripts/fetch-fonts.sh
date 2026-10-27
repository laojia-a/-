#!/usr/bin/env bash
# Downloads the open-licensed (SIL OFL 1.1) fonts used by the film into fonts/ (relative to this project folder).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p fonts
cd fonts
NOTO=https://github.com/notofonts/noto-cjk/raw/main
GF=https://github.com/google/fonts/raw/main/ofl
for w in Black Bold Medium Regular Light; do
  [ -f "NotoSansSC-$w.otf" ] || curl -fsSL -o "NotoSansSC-$w.otf" "$NOTO/Sans/SubsetOTF/SC/NotoSansSC-$w.otf"
done
[ -f NotoSerifSC-Black.otf ] || curl -fsSL -o NotoSerifSC-Black.otf "$NOTO/Serif/SubsetOTF/SC/NotoSerifSC-Black.otf"
[ -f BebasNeue-Regular.ttf ] || curl -fsSL -o BebasNeue-Regular.ttf "$GF/bebasneue/BebasNeue-Regular.ttf"
[ -f JetBrainsMono.ttf ]     || curl -fsSL -o JetBrainsMono.ttf "$GF/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf"
echo "fonts ready: $(ls | tr '\n' ' ')"
