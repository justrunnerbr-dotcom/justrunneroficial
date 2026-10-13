#!/bin/bash
# Copia o tema (prototipo-tema/) pra public/tema/, que é o que o site serve. Rodar depois de mexer no tema:
#   bash scripts/_publica-tema.sh
# Fica de fora o que é só de protótipo: avaliações de exemplo (inventadas) e as fotos geradas pra elas.
set -e
cd "$(dirname "$0")/.."
rm -rf public/tema
rsync -a --exclude 'assets/reviews-demo.js' --exclude 'fotos/demo-avaliacoes/' --exclude 'README.md' --exclude 'TEMA-INSTALACAO.md' --exclude '.DS_Store' prototipo-tema/ public/tema/
# As páginas usam links relativos (produto.html…); servidas em /, /tema e /produto/… precisam da base /tema/.
for f in public/tema/*.html; do sed -i '' 's#<meta charset="utf-8">#<meta charset="utf-8">\n  <base href="/tema/">#' "$f"; done
echo "public/tema: $(find public/tema -type f | wc -l | tr -d ' ') arquivos, $(du -sh public/tema | cut -f1)"
