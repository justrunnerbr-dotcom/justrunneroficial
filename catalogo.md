# Just Runner — Catálogo

Preencha o bloco CSV abaixo com categoria, produto e slug. Os scripts `catalog:*` e `images:*` leem **exclusivamente** este bloco.

Formato: `categoria,produto,slug` — slug só com `[a-z0-9-]`, sem duplicatas, sem campos vazios.

### CSV

```csv
categoria,produto,slug
Casual,Dartboard,dartboard
Encoder,Encoder,encoder
Eye Jacket,Eye Jacket Brain Dead,eye-jacket-brain-dead
Eye Jacket,Eye Jacket Cinza,eye-jacket-cinza
Eye Jacket,Eye Jacket Flame,eye-jacket-flame
Eye Jacket,Eye Jacket Flame Roxa,eye-jacket-flame-roxa
Eye Jacket,Eye Jacket Laranja,eye-jacket-laranja
Eye Jacket,Eye Jacket Preta,eye-jacket-preta
Eye Jacket,Eye Jacket Redux,eye-jacket-redux
Eye Jacket,Eye Jacket Redux Bege,eye-jacket-redux-bege
Eye Jacket,Eye Jacket Redux Cinza,eye-jacket-redux-cinza
Eye Jacket,Eye Jacket Redux Preta,eye-jacket-redux-preta
Eye Jacket,Eye Jacket Redux Verde,eye-jacket-redux-verde
Flak,Flak Branca,flak-branca
Flak,Flak Preta,flak-preta
Half Jacket,Half Jacket,half-jacket
HSTN,HSTN Cinza,hstn-cinza
HSTN,HSTN Cooper,hstn-cooper
HSTN,HSTN Preta,hstn-preta
Minute,Minute Azul,minute-azul
Minute,Minute Branca,minute-branca
Minute,Minute Cinza,minute-cinza
Minute,Minute Cooper,minute-cooper
Minute,Minute Cristal,minute-cristal
Minute,Minute Preta,minute-preta
Plantaris,Plantaris Azul Escuro,plantaris-azul-escuro
Plantaris,Plantaris Cinza,plantaris-cinza
Plantaris,Plantaris Matte Bone,plantaris-matte-bone
Plantaris,Plantaris Podpah,plantaris-podpah
Plantaris,Plantaris Preta,plantaris-preta
Plantaris,Plantaris Preta Haste Transparente,plantaris-preta-haste-transparente
Plantaris,Plantaris Stonewash,plantaris-stonewash
Plantaris,Plantaris Verde,plantaris-verde
Radar,Radar EV Bronze,radar-ev-bronze
Radar,Radar EV Cooper,radar-ev-cooper
Radar,Radar EV Kit de Lentes,radar-ev-kit-de-lentes
Radar,Radar EV Laranja,radar-ev-laranja
Radar,Radar EV Piet,radar-ev-piet
Radar,Radar EV Preta,radar-ev-preta
Radar,Radar Verde,radar-verde
Straight Jacket,Straight Jacket Cinza,straight-jacket-cinza
Straight Jacket,Straight Jacket Cooper,straight-jacket-cooper
```

> Nota: esta lista é derivada automaticamente de `products/` pelo script `photos:import` — este CSV é só para referência/documentação, não é lido pelo `photos:import` (que já detecta tudo direto da pasta).

Ver `CATALOG_IMPORT.md` para o passo a passo completo de import (catálogo + imagens + storage).
