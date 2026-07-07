import type { Product, Collection } from './types'

export const mockCollections: Collection[] = [
  {
    "id": "col-sport",
    "slug": "sport",
    "name": "Sport & Performance",
    "description": "Óculos de alta performance para esportes e atividades ao ar livre.",
    "image_url": "/products/EYE%20JACKET/eye%20jacket%20brain%20d%20(1).png",
    "position": 1
  },
  {
    "id": "col-classicos",
    "slug": "classicos",
    "name": "Clássicos",
    "description": "Os modelos atemporais que definiram a história da Oakley.",
    "image_url": "/products/DOUBLE%20X/doublex24k-Photoroom_upscayl_3x_upscayl-lite-4x.png",
    "position": 2
  },
  {
    "id": "col-titanio",
    "slug": "titanio",
    "name": "Titânio & Metal",
    "description": "Armações em X Metal e titânio. O máximo em durabilidade e leveza.",
    "image_url": "/products/CHAMINADE/chaminade_black.png",
    "position": 3
  },
  {
    "id": "col-lifestyle",
    "slug": "lifestyle",
    "name": "Lifestyle",
    "description": "Estilo e performance para o dia a dia.",
    "image_url": "/products/GASCAN/gascanblack.png",
    "position": 4
  },
  {
    "id": "col-combos",
    "slug": "combos",
    "name": "Combos",
    "description": "Kits especiais com dois ou três óculos.",
    "image_url": "/products/2x1%20COMBO/COMBO%201.jpg",
    "position": 5
  }
]

export const mockProducts: Product[] = [
  {
    "id": "prod-1",
    "slug": "2x1-combo",
    "name": "2x1 Combo",
    "description": "<p>O 2x1 COMBO é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-combos",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-combos",
      "slug": "combos",
      "name": "Combos",
      "description": "Kits especiais com dois ou três óculos.",
      "image_url": "/products/2x1%20COMBO/COMBO%201.jpg",
      "position": 5
    },
    "variants": [
      {
        "id": "var-1",
        "product_id": "prod-1",
        "name": "Padrão",
        "price": 599.9,
        "compare_price": null,
        "sku": "OAK-2X1COMBO-001",
        "stock": 11,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-1",
        "product_id": "prod-1",
        "variant_id": null,
        "url": "/products/2x1%20COMBO/COMBO%201.jpg",
        "position": 1,
        "alt": "Oakley 2x1 COMBO"
      },
      {
        "id": "img-2",
        "product_id": "prod-1",
        "variant_id": null,
        "url": "/products/2x1%20COMBO/COMBO%202.jpg",
        "position": 2,
        "alt": "Oakley 2x1 COMBO"
      },
      {
        "id": "img-3",
        "product_id": "prod-1",
        "variant_id": null,
        "url": "/products/2x1%20COMBO/COMBO%203.jpg",
        "position": 3,
        "alt": "Oakley 2x1 COMBO"
      },
      {
        "id": "img-4",
        "product_id": "prod-1",
        "variant_id": null,
        "url": "/products/2x1%20COMBO/COMBO%204.jpg",
        "position": 4,
        "alt": "Oakley 2x1 COMBO"
      },
      {
        "id": "img-5",
        "product_id": "prod-1",
        "variant_id": null,
        "url": "/products/2x1%20COMBO/COMBO%205.jpg",
        "position": 5,
        "alt": "Oakley 2x1 COMBO"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-2",
    "slug": "3x1-combo",
    "name": "3x1 Combo",
    "description": "<p>O 3x1 COMBO é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-combos",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-combos",
      "slug": "combos",
      "name": "Combos",
      "description": "Kits especiais com dois ou três óculos.",
      "image_url": "/products/2x1%20COMBO/COMBO%201.jpg",
      "position": 5
    },
    "variants": [
      {
        "id": "var-2",
        "product_id": "prod-2",
        "name": "Padrão",
        "price": 799.9,
        "compare_price": null,
        "sku": "OAK-3X1COMBO-001",
        "stock": 13,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-6",
        "product_id": "prod-2",
        "variant_id": null,
        "url": "/products/3x1%20COMBO/COMBO%201.jpg",
        "position": 1,
        "alt": "Oakley 3x1 COMBO"
      },
      {
        "id": "img-7",
        "product_id": "prod-2",
        "variant_id": null,
        "url": "/products/3x1%20COMBO/COMBO%2010.jpg",
        "position": 2,
        "alt": "Oakley 3x1 COMBO"
      },
      {
        "id": "img-8",
        "product_id": "prod-2",
        "variant_id": null,
        "url": "/products/3x1%20COMBO/COMBO%202.jpg",
        "position": 3,
        "alt": "Oakley 3x1 COMBO"
      },
      {
        "id": "img-9",
        "product_id": "prod-2",
        "variant_id": null,
        "url": "/products/3x1%20COMBO/COMBO%203.jpg",
        "position": 4,
        "alt": "Oakley 3x1 COMBO"
      },
      {
        "id": "img-10",
        "product_id": "prod-2",
        "variant_id": null,
        "url": "/products/3x1%20COMBO/COMBO%204.jpg",
        "position": 5,
        "alt": "Oakley 3x1 COMBO"
      },
      {
        "id": "img-11",
        "product_id": "prod-2",
        "variant_id": null,
        "url": "/products/3x1%20COMBO/COMBO%205.jpg",
        "position": 6,
        "alt": "Oakley 3x1 COMBO"
      },
      {
        "id": "img-12",
        "product_id": "prod-2",
        "variant_id": null,
        "url": "/products/3x1%20COMBO/COMBO%206.jpg",
        "position": 7,
        "alt": "Oakley 3x1 COMBO"
      },
      {
        "id": "img-13",
        "product_id": "prod-2",
        "variant_id": null,
        "url": "/products/3x1%20COMBO/COMBO%207.jpg",
        "position": 8,
        "alt": "Oakley 3x1 COMBO"
      },
      {
        "id": "img-14",
        "product_id": "prod-2",
        "variant_id": null,
        "url": "/products/3x1%20COMBO/COMBO%208.jpg",
        "position": 9,
        "alt": "Oakley 3x1 COMBO"
      },
      {
        "id": "img-15",
        "product_id": "prod-2",
        "variant_id": null,
        "url": "/products/3x1%20COMBO/COMBO%209.jpg",
        "position": 10,
        "alt": "Oakley 3x1 COMBO"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-3",
    "slug": "chaminade",
    "name": "Chaminade",
    "description": "<p>O CHAMINADE é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-titanio",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-titanio",
      "slug": "titanio",
      "name": "Titânio & Metal",
      "description": "Armações em X Metal e titânio. O máximo em durabilidade e leveza.",
      "image_url": "/products/CHAMINADE/chaminade_black.png",
      "position": 3
    },
    "variants": [
      {
        "id": "var-3",
        "product_id": "prod-3",
        "name": "Padrão",
        "price": 399.9,
        "compare_price": 520,
        "sku": "OAK-CHAMINAD-001",
        "stock": 7,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-16",
        "product_id": "prod-3",
        "variant_id": null,
        "url": "/products/CHAMINADE/chaminade_black.png",
        "position": 1,
        "alt": "Oakley CHAMINADE"
      },
      {
        "id": "img-17",
        "product_id": "prod-3",
        "variant_id": null,
        "url": "/products/CHAMINADE/chaminade_darkruby.png",
        "position": 2,
        "alt": "Oakley CHAMINADE"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-4",
    "slug": "compulsive",
    "name": "Compulsive",
    "description": "<p>O COMPULSIVE é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-titanio",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-titanio",
      "slug": "titanio",
      "name": "Titânio & Metal",
      "description": "Armações em X Metal e titânio. O máximo em durabilidade e leveza.",
      "image_url": "/products/CHAMINADE/chaminade_black.png",
      "position": 3
    },
    "variants": [
      {
        "id": "var-4",
        "product_id": "prod-4",
        "name": "Padrão",
        "price": 449.9,
        "compare_price": null,
        "sku": "OAK-COMPULSI-001",
        "stock": 10,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-18",
        "product_id": "prod-4",
        "variant_id": null,
        "url": "/products/COMPULSIVE/compusivefullblack-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 1,
        "alt": "Oakley COMPULSIVE"
      },
      {
        "id": "img-19",
        "product_id": "prod-4",
        "variant_id": null,
        "url": "/products/COMPULSIVE/compusivevr28-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 2,
        "alt": "Oakley COMPULSIVE"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-5",
    "slug": "dartboard",
    "name": "Dartboard",
    "description": "<p>O DARTBOARD é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-titanio",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-titanio",
      "slug": "titanio",
      "name": "Titânio & Metal",
      "description": "Armações em X Metal e titânio. O máximo em durabilidade e leveza.",
      "image_url": "/products/CHAMINADE/chaminade_black.png",
      "position": 3
    },
    "variants": [
      {
        "id": "var-5",
        "product_id": "prod-5",
        "name": "Padrão",
        "price": 499.9,
        "compare_price": null,
        "sku": "OAK-DARTBOAR-001",
        "stock": 17,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-20",
        "product_id": "prod-5",
        "variant_id": null,
        "url": "/products/DARTBOARD/dart%20cromo%20(1).png",
        "position": 1,
        "alt": "Oakley DARTBOARD"
      },
      {
        "id": "img-21",
        "product_id": "prod-5",
        "variant_id": null,
        "url": "/products/DARTBOARD/dart%20cromo%20(2).png",
        "position": 2,
        "alt": "Oakley DARTBOARD"
      },
      {
        "id": "img-22",
        "product_id": "prod-5",
        "variant_id": null,
        "url": "/products/DARTBOARD/dart%20cromo%20(3).png",
        "position": 3,
        "alt": "Oakley DARTBOARD"
      },
      {
        "id": "img-23",
        "product_id": "prod-5",
        "variant_id": null,
        "url": "/products/DARTBOARD/dart%20cromo%20(4).png",
        "position": 4,
        "alt": "Oakley DARTBOARD"
      },
      {
        "id": "img-24",
        "product_id": "prod-5",
        "variant_id": null,
        "url": "/products/DARTBOARD/dartblack-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 5,
        "alt": "Oakley DARTBOARD"
      },
      {
        "id": "img-25",
        "product_id": "prod-5",
        "variant_id": null,
        "url": "/products/DARTBOARD/dartboard%20liquid.png",
        "position": 6,
        "alt": "Oakley DARTBOARD"
      },
      {
        "id": "img-26",
        "product_id": "prod-5",
        "variant_id": null,
        "url": "/products/DARTBOARD/dartdegrade-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 7,
        "alt": "Oakley DARTBOARD"
      },
      {
        "id": "img-27",
        "product_id": "prod-5",
        "variant_id": null,
        "url": "/products/DARTBOARD/dartrosa-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 8,
        "alt": "Oakley DARTBOARD"
      },
      {
        "id": "img-28",
        "product_id": "prod-5",
        "variant_id": null,
        "url": "/products/DARTBOARD/vr28-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 9,
        "alt": "Oakley DARTBOARD"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-6",
    "slug": "double-x",
    "name": "Double X",
    "description": "<p>O DOUBLE X é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-classicos",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-classicos",
      "slug": "classicos",
      "name": "Clássicos",
      "description": "Os modelos atemporais que definiram a história da Oakley.",
      "image_url": "/products/DOUBLE%20X/doublex24k-Photoroom_upscayl_3x_upscayl-lite-4x.png",
      "position": 2
    },
    "variants": [
      {
        "id": "var-6",
        "product_id": "prod-6",
        "name": "Padrão",
        "price": 649.9,
        "compare_price": null,
        "sku": "OAK-DOUBLEX-001",
        "stock": 11,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-29",
        "product_id": "prod-6",
        "variant_id": null,
        "url": "/products/DOUBLE%20X/doublex24k-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 1,
        "alt": "Oakley DOUBLE X"
      },
      {
        "id": "img-30",
        "product_id": "prod-6",
        "variant_id": null,
        "url": "/products/DOUBLE%20X/doublexplasmaice-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 2,
        "alt": "Oakley DOUBLE X"
      },
      {
        "id": "img-31",
        "product_id": "prod-6",
        "variant_id": null,
        "url": "/products/DOUBLE%20X/doublexplasmatanzanite-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 3,
        "alt": "Oakley DOUBLE X"
      },
      {
        "id": "img-32",
        "product_id": "prod-6",
        "variant_id": null,
        "url": "/products/DOUBLE%20X/doublexxmetalice-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 4,
        "alt": "Oakley DOUBLE X"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-7",
    "slug": "encoder",
    "name": "Encoder",
    "description": "<p>O ENCODER é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-titanio",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-titanio",
      "slug": "titanio",
      "name": "Titânio & Metal",
      "description": "Armações em X Metal e titânio. O máximo em durabilidade e leveza.",
      "image_url": "/products/CHAMINADE/chaminade_black.png",
      "position": 3
    },
    "variants": [
      {
        "id": "var-7",
        "product_id": "prod-7",
        "name": "Padrão",
        "price": 349.9,
        "compare_price": null,
        "sku": "OAK-ENCODER-001",
        "stock": 7,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-33",
        "product_id": "prod-7",
        "variant_id": null,
        "url": "/products/ENCODER/encodermarromfundobranco-Photoroom_upscayl_3x_upscayl-lite-4x.jpg",
        "position": 1,
        "alt": "Oakley ENCODER"
      },
      {
        "id": "img-34",
        "product_id": "prod-7",
        "variant_id": null,
        "url": "/products/ENCODER/encoderpretafundobranco-Photoroom_upscayl_3x_upscayl-lite-4x.jpg",
        "position": 2,
        "alt": "Oakley ENCODER"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-8",
    "slug": "eye-jacket",
    "name": "Eye Jacket",
    "description": "<p>O EYE JACKET é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-sport",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-sport",
      "slug": "sport",
      "name": "Sport & Performance",
      "description": "Óculos de alta performance para esportes e atividades ao ar livre.",
      "image_url": "/products/EYE%20JACKET/eye%20jacket%20brain%20d%20(1).png",
      "position": 1
    },
    "variants": [
      {
        "id": "var-8",
        "product_id": "prod-8",
        "name": "Padrão",
        "price": 369.9,
        "compare_price": null,
        "sku": "OAK-EYEJACKE-001",
        "stock": 15,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-35",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eye%20jacket%20brain%20d%20(1).png",
        "position": 1,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-36",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eye%20jacket%20brain%20d%20(2).png",
        "position": 2,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-37",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eye%20jacket%20brain%20d%20(3).png",
        "position": 3,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-38",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eye%20jacket%20brain%20d%20(4).png",
        "position": 4,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-39",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacket_kitch_black.png",
        "position": 5,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-40",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacket_kitch_darkruby.png",
        "position": 6,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-41",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacket_kitch_gold.png",
        "position": 7,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-42",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacket_kitch_ice.png",
        "position": 8,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-43",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacket_kitch_liquidmetal.png",
        "position": 9,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-44",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacket_kitch_photocromic.png",
        "position": 10,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-45",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacket_kitch_prizm.png",
        "position": 11,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-46",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacket_kitch_ruby.png",
        "position": 12,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-47",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacket_kitch_violet.png",
        "position": 13,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-48",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacket_kitch_vr28.png",
        "position": 14,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-49",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacketflamepretalentepreta-Photoroom.png",
        "position": 15,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-50",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacketlaranjametalicfundobranco-Photoroom.webp",
        "position": 16,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-51",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacketlaranjapreta-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 17,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-52",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacketlaranjarubyfundobranco-Photoroom.webp",
        "position": 18,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-53",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacketlaranjatorchfundobranco-Photoroom.png",
        "position": 19,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-54",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacketlaranjavr28fundobranco-Photoroom.png",
        "position": 20,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-55",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacketpretaflamefundobranco-Photoroom.png",
        "position": 21,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-56",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacketpretalentepretafundobranco-Photoroom.webp",
        "position": 22,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-57",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacketpretametalicfundobranco-Photoroom.png",
        "position": 23,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-58",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacketpretaroxofundobranco-Photoroom.png",
        "position": 24,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-59",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacketpretatanzanitefundobranco-Photoroom.webp",
        "position": 25,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-60",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacketroxalenpretafundobranco-Photoroom.png",
        "position": 26,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-61",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacketroxalentemetalicfundobranco-Photoroom%20(1).png",
        "position": 27,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-62",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacketroxalenteroxafundobranco-Photoroom.png",
        "position": 28,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-63",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacketroxalenterubyfundobranco-Photoroom.png",
        "position": 29,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-64",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/eyejacketroxalentetorchfundobranco-Photoroom.png",
        "position": 30,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-65",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/flamecafe-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 31,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-66",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/flameroxa-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 32,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-67",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/flameruby-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 33,
        "alt": "Oakley EYE JACKET"
      },
      {
        "id": "img-68",
        "product_id": "prod-8",
        "variant_id": null,
        "url": "/products/EYE%20JACKET/flametorch-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 34,
        "alt": "Oakley EYE JACKET"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-9",
    "slug": "eyes-jacket-redux",
    "name": "Eyes Jacket Redux",
    "description": "<p>O EYES JACKET REDUX é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-sport",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-sport",
      "slug": "sport",
      "name": "Sport & Performance",
      "description": "Óculos de alta performance para esportes e atividades ao ar livre.",
      "image_url": "/products/EYE%20JACKET/eye%20jacket%20brain%20d%20(1).png",
      "position": 1
    },
    "variants": [
      {
        "id": "var-9",
        "product_id": "prod-9",
        "name": "Padrão",
        "price": 389.9,
        "compare_price": null,
        "sku": "OAK-EYESJACK-001",
        "stock": 15,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-69",
        "product_id": "prod-9",
        "variant_id": null,
        "url": "/products/EYES%20JACKET%20REDUX/eyecv-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 1,
        "alt": "Oakley EYES JACKET REDUX"
      },
      {
        "id": "img-70",
        "product_id": "prod-9",
        "variant_id": null,
        "url": "/products/EYES%20JACKET%20REDUX/eyesjacketredux_black.png",
        "position": 2,
        "alt": "Oakley EYES JACKET REDUX"
      },
      {
        "id": "img-71",
        "product_id": "prod-9",
        "variant_id": null,
        "url": "/products/EYES%20JACKET%20REDUX/eyesjacketredux_black2.png",
        "position": 3,
        "alt": "Oakley EYES JACKET REDUX"
      },
      {
        "id": "img-72",
        "product_id": "prod-9",
        "variant_id": null,
        "url": "/products/EYES%20JACKET%20REDUX/eyesjacketredux_black3.png",
        "position": 4,
        "alt": "Oakley EYES JACKET REDUX"
      },
      {
        "id": "img-73",
        "product_id": "prod-9",
        "variant_id": null,
        "url": "/products/EYES%20JACKET%20REDUX/eyesjacketredux_black4.png",
        "position": 5,
        "alt": "Oakley EYES JACKET REDUX"
      },
      {
        "id": "img-74",
        "product_id": "prod-9",
        "variant_id": null,
        "url": "/products/EYES%20JACKET%20REDUX/eyesjacketredux_black5.png",
        "position": 6,
        "alt": "Oakley EYES JACKET REDUX"
      },
      {
        "id": "img-75",
        "product_id": "prod-9",
        "variant_id": null,
        "url": "/products/EYES%20JACKET%20REDUX/eyesjacketredux_black6.png",
        "position": 7,
        "alt": "Oakley EYES JACKET REDUX"
      },
      {
        "id": "img-76",
        "product_id": "prod-9",
        "variant_id": null,
        "url": "/products/EYES%20JACKET%20REDUX/eyesjacketredux_black7.png",
        "position": 8,
        "alt": "Oakley EYES JACKET REDUX"
      },
      {
        "id": "img-77",
        "product_id": "prod-9",
        "variant_id": null,
        "url": "/products/EYES%20JACKET%20REDUX/eyesjacketredux_black8.png",
        "position": 9,
        "alt": "Oakley EYES JACKET REDUX"
      },
      {
        "id": "img-78",
        "product_id": "prod-9",
        "variant_id": null,
        "url": "/products/EYES%20JACKET%20REDUX/eyesjacketredux_black9.png",
        "position": 10,
        "alt": "Oakley EYES JACKET REDUX"
      },
      {
        "id": "img-79",
        "product_id": "prod-9",
        "variant_id": null,
        "url": "/products/EYES%20JACKET%20REDUX/eyesjacketredux_silver.png",
        "position": 11,
        "alt": "Oakley EYES JACKET REDUX"
      },
      {
        "id": "img-80",
        "product_id": "prod-9",
        "variant_id": null,
        "url": "/products/EYES%20JACKET%20REDUX/eyesjacketredux_silver2.png",
        "position": 12,
        "alt": "Oakley EYES JACKET REDUX"
      },
      {
        "id": "img-81",
        "product_id": "prod-9",
        "variant_id": null,
        "url": "/products/EYES%20JACKET%20REDUX/eyesjacketredux_silver3.png",
        "position": 13,
        "alt": "Oakley EYES JACKET REDUX"
      },
      {
        "id": "img-82",
        "product_id": "prod-9",
        "variant_id": null,
        "url": "/products/EYES%20JACKET%20REDUX/eyesjacketredux_silver4.png",
        "position": 14,
        "alt": "Oakley EYES JACKET REDUX"
      },
      {
        "id": "img-83",
        "product_id": "prod-9",
        "variant_id": null,
        "url": "/products/EYES%20JACKET%20REDUX/eyesjacketredux_silver5.png",
        "position": 15,
        "alt": "Oakley EYES JACKET REDUX"
      },
      {
        "id": "img-84",
        "product_id": "prod-9",
        "variant_id": null,
        "url": "/products/EYES%20JACKET%20REDUX/eyesjacketredux_silver6.png",
        "position": 16,
        "alt": "Oakley EYES JACKET REDUX"
      },
      {
        "id": "img-85",
        "product_id": "prod-9",
        "variant_id": null,
        "url": "/products/EYES%20JACKET%20REDUX/eyesjacketredux_silver7.png",
        "position": 17,
        "alt": "Oakley EYES JACKET REDUX"
      },
      {
        "id": "img-86",
        "product_id": "prod-9",
        "variant_id": null,
        "url": "/products/EYES%20JACKET%20REDUX/eyesjacketredux_silver8.png",
        "position": 18,
        "alt": "Oakley EYES JACKET REDUX"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-10",
    "slug": "flak-20",
    "name": "Flak 2.0",
    "description": "<p>O FLAK 2.0 é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-sport",
    "status": "active",
    "featured": true,
    "collection": {
      "id": "col-sport",
      "slug": "sport",
      "name": "Sport & Performance",
      "description": "Óculos de alta performance para esportes e atividades ao ar livre.",
      "image_url": "/products/EYE%20JACKET/eye%20jacket%20brain%20d%20(1).png",
      "position": 1
    },
    "variants": [
      {
        "id": "var-10",
        "product_id": "prod-10",
        "name": "Padrão",
        "price": 349.9,
        "compare_price": null,
        "sku": "OAK-FLAK20-001",
        "stock": 15,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-87",
        "product_id": "prod-10",
        "variant_id": null,
        "url": "/products/FLAK%202.0/flak2.0.png",
        "position": 1,
        "alt": "Oakley FLAK 2.0"
      },
      {
        "id": "img-88",
        "product_id": "prod-10",
        "variant_id": null,
        "url": "/products/FLAK%202.0/flak2.0_2.png",
        "position": 2,
        "alt": "Oakley FLAK 2.0"
      },
      {
        "id": "img-89",
        "product_id": "prod-10",
        "variant_id": null,
        "url": "/products/FLAK%202.0/flak2.0_3.png",
        "position": 3,
        "alt": "Oakley FLAK 2.0"
      },
      {
        "id": "img-90",
        "product_id": "prod-10",
        "variant_id": null,
        "url": "/products/FLAK%202.0/flak2.0_4.png",
        "position": 4,
        "alt": "Oakley FLAK 2.0"
      },
      {
        "id": "img-91",
        "product_id": "prod-10",
        "variant_id": null,
        "url": "/products/FLAK%202.0/flak2.0_5.png",
        "position": 5,
        "alt": "Oakley FLAK 2.0"
      },
      {
        "id": "img-92",
        "product_id": "prod-10",
        "variant_id": null,
        "url": "/products/FLAK%202.0/flakbranca-Photoroom%20(2).png",
        "position": 6,
        "alt": "Oakley FLAK 2.0"
      },
      {
        "id": "img-93",
        "product_id": "prod-10",
        "variant_id": null,
        "url": "/products/FLAK%202.0/flakbrancametalic-Photoroom%20(6).png",
        "position": 7,
        "alt": "Oakley FLAK 2.0"
      },
      {
        "id": "img-94",
        "product_id": "prod-10",
        "variant_id": null,
        "url": "/products/FLAK%202.0/flakbrancametalic-Photoroom.png",
        "position": 8,
        "alt": "Oakley FLAK 2.0"
      },
      {
        "id": "img-95",
        "product_id": "prod-10",
        "variant_id": null,
        "url": "/products/FLAK%202.0/flakmetalicfundobranco-Photoroom_upscayl_5x_upscayl-lite-4x.png",
        "position": 9,
        "alt": "Oakley FLAK 2.0"
      },
      {
        "id": "img-96",
        "product_id": "prod-10",
        "variant_id": null,
        "url": "/products/FLAK%202.0/flakpretafundobranco-Photoroom_upscayl_5x_upscayl-lite-4x.png",
        "position": 10,
        "alt": "Oakley FLAK 2.0"
      },
      {
        "id": "img-97",
        "product_id": "prod-10",
        "variant_id": null,
        "url": "/products/FLAK%202.0/flakpretatanzanitefundobbranco-Photoroom_upscayl_5x_upscayl-lite-4x.png",
        "position": 11,
        "alt": "Oakley FLAK 2.0"
      },
      {
        "id": "img-98",
        "product_id": "prod-10",
        "variant_id": null,
        "url": "/products/FLAK%202.0/flakpretatanzanitefundocinza-Photoroom%20(7).png",
        "position": 12,
        "alt": "Oakley FLAK 2.0"
      },
      {
        "id": "img-99",
        "product_id": "prod-10",
        "variant_id": null,
        "url": "/products/FLAK%202.0/flakrubyfundoranco-Photoroom_upscayl_5x_upscayl-lite-4x.png",
        "position": 13,
        "alt": "Oakley FLAK 2.0"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-11",
    "slug": "gascan",
    "name": "Gascan",
    "description": "<p>O GASCAN é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-lifestyle",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-lifestyle",
      "slug": "lifestyle",
      "name": "Lifestyle",
      "description": "Estilo e performance para o dia a dia.",
      "image_url": "/products/GASCAN/gascanblack.png",
      "position": 4
    },
    "variants": [
      {
        "id": "var-11",
        "product_id": "prod-11",
        "name": "Padrão",
        "price": 299.9,
        "compare_price": 390,
        "sku": "OAK-GASCAN-001",
        "stock": 6,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-100",
        "product_id": "prod-11",
        "variant_id": null,
        "url": "/products/GASCAN/gascanblack.png",
        "position": 1,
        "alt": "Oakley GASCAN"
      },
      {
        "id": "img-101",
        "product_id": "prod-11",
        "variant_id": null,
        "url": "/products/GASCAN/gascanblack2.png",
        "position": 2,
        "alt": "Oakley GASCAN"
      },
      {
        "id": "img-102",
        "product_id": "prod-11",
        "variant_id": null,
        "url": "/products/GASCAN/gascanblack3.png",
        "position": 3,
        "alt": "Oakley GASCAN"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-12",
    "slug": "half-jacket",
    "name": "Half Jacket",
    "description": "<p>O HALF JACKET é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-sport",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-sport",
      "slug": "sport",
      "name": "Sport & Performance",
      "description": "Óculos de alta performance para esportes e atividades ao ar livre.",
      "image_url": "/products/EYE%20JACKET/eye%20jacket%20brain%20d%20(1).png",
      "position": 1
    },
    "variants": [
      {
        "id": "var-12",
        "product_id": "prod-12",
        "name": "Padrão",
        "price": 329.9,
        "compare_price": null,
        "sku": "OAK-HALFJACK-001",
        "stock": 8,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-103",
        "product_id": "prod-12",
        "variant_id": null,
        "url": "/products/HALF%20JACKET/halfjacketsilver.png",
        "position": 1,
        "alt": "Oakley HALF JACKET"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-13",
    "slug": "holbrook",
    "name": "Holbrook",
    "description": "<p>O HOLBROOK é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-lifestyle",
    "status": "active",
    "featured": true,
    "collection": {
      "id": "col-lifestyle",
      "slug": "lifestyle",
      "name": "Lifestyle",
      "description": "Estilo e performance para o dia a dia.",
      "image_url": "/products/GASCAN/gascanblack.png",
      "position": 4
    },
    "variants": [
      {
        "id": "var-13",
        "product_id": "prod-13",
        "name": "Padrão",
        "price": 329.9,
        "compare_price": 429,
        "sku": "OAK-HOLBROOK-001",
        "stock": 14,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-104",
        "product_id": "prod-13",
        "variant_id": null,
        "url": "/products/HOLBROOK/holbrook_justinlike.png",
        "position": 1,
        "alt": "Oakley HOLBROOK"
      },
      {
        "id": "img-105",
        "product_id": "prod-13",
        "variant_id": null,
        "url": "/products/HOLBROOK/holbrook_justinlike2.png",
        "position": 2,
        "alt": "Oakley HOLBROOK"
      },
      {
        "id": "img-106",
        "product_id": "prod-13",
        "variant_id": null,
        "url": "/products/HOLBROOK/holbrookblack.png",
        "position": 3,
        "alt": "Oakley HOLBROOK"
      },
      {
        "id": "img-107",
        "product_id": "prod-13",
        "variant_id": null,
        "url": "/products/HOLBROOK/holbrookblack2.png",
        "position": 4,
        "alt": "Oakley HOLBROOK"
      },
      {
        "id": "img-108",
        "product_id": "prod-13",
        "variant_id": null,
        "url": "/products/HOLBROOK/holbrookblack3.png",
        "position": 5,
        "alt": "Oakley HOLBROOK"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-14",
    "slug": "hstn",
    "name": "Hstn",
    "description": "<p>O HSTN é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-lifestyle",
    "status": "active",
    "featured": true,
    "collection": {
      "id": "col-lifestyle",
      "slug": "lifestyle",
      "name": "Lifestyle",
      "description": "Estilo e performance para o dia a dia.",
      "image_url": "/products/GASCAN/gascanblack.png",
      "position": 4
    },
    "variants": [
      {
        "id": "var-14",
        "product_id": "prod-14",
        "name": "Padrão",
        "price": 399.9,
        "compare_price": 520,
        "sku": "OAK-HSTN-001",
        "stock": 12,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-109",
        "product_id": "prod-14",
        "variant_id": null,
        "url": "/products/HSTN/hstnazulclaro-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 1,
        "alt": "Oakley HSTN"
      },
      {
        "id": "img-110",
        "product_id": "prod-14",
        "variant_id": null,
        "url": "/products/HSTN/hstnblack-Photoroom%20(1)_upscayl_3x_upscayl-lite-4x.png",
        "position": 2,
        "alt": "Oakley HSTN"
      },
      {
        "id": "img-111",
        "product_id": "prod-14",
        "variant_id": null,
        "url": "/products/HSTN/hstnblack-Photoroom%20(2)_upscayl_3x_upscayl-lite-4x.png",
        "position": 3,
        "alt": "Oakley HSTN"
      },
      {
        "id": "img-112",
        "product_id": "prod-14",
        "variant_id": null,
        "url": "/products/HSTN/hstnblack-Photoroom%20(3)_upscayl_3x_upscayl-lite-4x.png",
        "position": 4,
        "alt": "Oakley HSTN"
      },
      {
        "id": "img-113",
        "product_id": "prod-14",
        "variant_id": null,
        "url": "/products/HSTN/hstnblack-Photoroom%20(4)_upscayl_3x_upscayl-lite-4x.png",
        "position": 5,
        "alt": "Oakley HSTN"
      },
      {
        "id": "img-114",
        "product_id": "prod-14",
        "variant_id": null,
        "url": "/products/HSTN/hstnblack-Photoroom%20(5)_upscayl_3x_upscayl-lite-4x.png",
        "position": 6,
        "alt": "Oakley HSTN"
      },
      {
        "id": "img-115",
        "product_id": "prod-14",
        "variant_id": null,
        "url": "/products/HSTN/hstnblack-Photoroom%20(6)_upscayl_3x_upscayl-lite-4x.png",
        "position": 7,
        "alt": "Oakley HSTN"
      },
      {
        "id": "img-116",
        "product_id": "prod-14",
        "variant_id": null,
        "url": "/products/HSTN/hstnblack-tanzanite-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 8,
        "alt": "Oakley HSTN"
      },
      {
        "id": "img-117",
        "product_id": "prod-14",
        "variant_id": null,
        "url": "/products/HSTN/hstncarbon.png",
        "position": 9,
        "alt": "Oakley HSTN"
      },
      {
        "id": "img-118",
        "product_id": "prod-14",
        "variant_id": null,
        "url": "/products/HSTN/hstncarbon2.png",
        "position": 10,
        "alt": "Oakley HSTN"
      },
      {
        "id": "img-119",
        "product_id": "prod-14",
        "variant_id": null,
        "url": "/products/HSTN/hstncarbon3.png",
        "position": 11,
        "alt": "Oakley HSTN"
      },
      {
        "id": "img-120",
        "product_id": "prod-14",
        "variant_id": null,
        "url": "/products/HSTN/hstncarbon4.png",
        "position": 12,
        "alt": "Oakley HSTN"
      },
      {
        "id": "img-121",
        "product_id": "prod-14",
        "variant_id": null,
        "url": "/products/HSTN/hstncarbon5.png",
        "position": 13,
        "alt": "Oakley HSTN"
      },
      {
        "id": "img-122",
        "product_id": "prod-14",
        "variant_id": null,
        "url": "/products/HSTN/hstncarbon6.png",
        "position": 14,
        "alt": "Oakley HSTN"
      },
      {
        "id": "img-123",
        "product_id": "prod-14",
        "variant_id": null,
        "url": "/products/HSTN/hstncarbon7.png",
        "position": 15,
        "alt": "Oakley HSTN"
      },
      {
        "id": "img-124",
        "product_id": "prod-14",
        "variant_id": null,
        "url": "/products/HSTN/hstngold-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 16,
        "alt": "Oakley HSTN"
      },
      {
        "id": "img-125",
        "product_id": "prod-14",
        "variant_id": null,
        "url": "/products/HSTN/hstnmetalic-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 17,
        "alt": "Oakley HSTN"
      },
      {
        "id": "img-126",
        "product_id": "prod-14",
        "variant_id": null,
        "url": "/products/HSTN/hstnpretaazulescuro-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 18,
        "alt": "Oakley HSTN"
      },
      {
        "id": "img-127",
        "product_id": "prod-14",
        "variant_id": null,
        "url": "/products/HSTN/hstnpretaroxa-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 19,
        "alt": "Oakley HSTN"
      },
      {
        "id": "img-128",
        "product_id": "prod-14",
        "variant_id": null,
        "url": "/products/HSTN/hstnroxo-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 20,
        "alt": "Oakley HSTN"
      },
      {
        "id": "img-129",
        "product_id": "prod-14",
        "variant_id": null,
        "url": "/products/HSTN/hstnseila-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 21,
        "alt": "Oakley HSTN"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-15",
    "slug": "juliet",
    "name": "Juliet",
    "description": "<p>O JULIET é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-classicos",
    "status": "active",
    "featured": true,
    "collection": {
      "id": "col-classicos",
      "slug": "classicos",
      "name": "Clássicos",
      "description": "Os modelos atemporais que definiram a história da Oakley.",
      "image_url": "/products/DOUBLE%20X/doublex24k-Photoroom_upscayl_3x_upscayl-lite-4x.png",
      "position": 2
    },
    "variants": [
      {
        "id": "var-15",
        "product_id": "prod-15",
        "name": "Padrão",
        "price": 899.9,
        "compare_price": 1170,
        "sku": "OAK-JULIET-001",
        "stock": 16,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-130",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_01.jpg",
        "position": 1,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-131",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_02.jpg",
        "position": 2,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-132",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_03.jpg",
        "position": 3,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-133",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_04.jpg",
        "position": 4,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-134",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_05.jpg",
        "position": 5,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-135",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_06.jpg",
        "position": 6,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-136",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_07.jpg",
        "position": 7,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-137",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_08.jpg",
        "position": 8,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-138",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_09.jpg",
        "position": 9,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-139",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_10.jpg",
        "position": 10,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-140",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_11.jpg",
        "position": 11,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-141",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_12.jpg",
        "position": 12,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-142",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_13.jpg",
        "position": 13,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-143",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_14.jpg",
        "position": 14,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-144",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_15.jpg",
        "position": 15,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-145",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_16.jpg",
        "position": 16,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-146",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_17.jpg",
        "position": 17,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-147",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_18.jpg",
        "position": 18,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-148",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_19.jpg",
        "position": 19,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-149",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_20.jpg",
        "position": 20,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-150",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_21.jpg",
        "position": 21,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-151",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_22.jpg",
        "position": 22,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-152",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_23.jpg",
        "position": 23,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-153",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_24.jpg",
        "position": 24,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-154",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_25.jpg",
        "position": 25,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-155",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_26.jpg",
        "position": 26,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-156",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_27.jpg",
        "position": 27,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-157",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_28.jpg",
        "position": 28,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-158",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_29.jpg",
        "position": 29,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-159",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_30.jpg",
        "position": 30,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-160",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_31.jpg",
        "position": 31,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-161",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_32.jpg",
        "position": 32,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-162",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_33.jpg",
        "position": 33,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-163",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_34.jpg",
        "position": 34,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-164",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_35.jpg",
        "position": 35,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-165",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_36.jpg",
        "position": 36,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-166",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_37.jpg",
        "position": 37,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-167",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_38.jpg",
        "position": 38,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-168",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_39.jpg",
        "position": 39,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-169",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_40.jpg",
        "position": 40,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-170",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_41.jpg",
        "position": 41,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-171",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_42.jpg",
        "position": 42,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-172",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_43.jpg",
        "position": 43,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-173",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_44.jpg",
        "position": 44,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-174",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_45.jpg",
        "position": 45,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-175",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_46.jpg",
        "position": 46,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-176",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_47.jpg",
        "position": 47,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-177",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_48.jpg",
        "position": 48,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-178",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_49.jpg",
        "position": 49,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-179",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_50.jpg",
        "position": 50,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-180",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_51.jpg",
        "position": 51,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-181",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_52.jpg",
        "position": 52,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-182",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_53.jpg",
        "position": 53,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-183",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_54.jpg",
        "position": 54,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-184",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_55.jpg",
        "position": 55,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-185",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_56.jpg",
        "position": 56,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-186",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_57.jpg",
        "position": 57,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-187",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_58.jpg",
        "position": 58,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-188",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_59.jpg",
        "position": 59,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-189",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_60.jpg",
        "position": 60,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-190",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_61.jpg",
        "position": 61,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-191",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_62.jpg",
        "position": 62,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-192",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_63.jpg",
        "position": 63,
        "alt": "Oakley JULIET"
      },
      {
        "id": "img-193",
        "product_id": "prod-15",
        "variant_id": null,
        "url": "/products/JULIET/juliet_64.jpg",
        "position": 64,
        "alt": "Oakley JULIET"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-16",
    "slug": "lupa-do-vilao",
    "name": "Lupa do Vilão",
    "description": "<p>O LUPA DO VILÃO é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-titanio",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-titanio",
      "slug": "titanio",
      "name": "Titânio & Metal",
      "description": "Armações em X Metal e titânio. O máximo em durabilidade e leveza.",
      "image_url": "/products/CHAMINADE/chaminade_black.png",
      "position": 3
    },
    "variants": [
      {
        "id": "var-16",
        "product_id": "prod-16",
        "name": "Padrão",
        "price": 499.9,
        "compare_price": null,
        "sku": "OAK-LUPADOVI-001",
        "stock": 11,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-194",
        "product_id": "prod-16",
        "variant_id": null,
        "url": "/products/LUPA%20DO%20VIL%C3%83O/lupa%20do%20vil%C3%A3o%20(1).png",
        "position": 1,
        "alt": "Oakley LUPA DO VILÃO"
      },
      {
        "id": "img-195",
        "product_id": "prod-16",
        "variant_id": null,
        "url": "/products/LUPA%20DO%20VIL%C3%83O/lupa%20do%20vil%C3%A3o%20(2).png",
        "position": 2,
        "alt": "Oakley LUPA DO VILÃO"
      },
      {
        "id": "img-196",
        "product_id": "prod-16",
        "variant_id": null,
        "url": "/products/LUPA%20DO%20VIL%C3%83O/lupa%20do%20vil%C3%A3o%20(3).png",
        "position": 3,
        "alt": "Oakley LUPA DO VILÃO"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-17",
    "slug": "m-frame",
    "name": "M Frame",
    "description": "<p>O M FRAME é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-sport",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-sport",
      "slug": "sport",
      "name": "Sport & Performance",
      "description": "Óculos de alta performance para esportes e atividades ao ar livre.",
      "image_url": "/products/EYE%20JACKET/eye%20jacket%20brain%20d%20(1).png",
      "position": 1
    },
    "variants": [
      {
        "id": "var-17",
        "product_id": "prod-17",
        "name": "Padrão",
        "price": 449.9,
        "compare_price": null,
        "sku": "OAK-MFRAME-001",
        "stock": 13,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-197",
        "product_id": "prod-17",
        "variant_id": null,
        "url": "/products/M%20FRAME/IMG_3677-Photoroom_upscayl_5x_upscayl-lite-4x.png",
        "position": 1,
        "alt": "Oakley M FRAME"
      },
      {
        "id": "img-198",
        "product_id": "prod-17",
        "variant_id": null,
        "url": "/products/M%20FRAME/framebranca-Photoroom.png",
        "position": 2,
        "alt": "Oakley M FRAME"
      },
      {
        "id": "img-199",
        "product_id": "prod-17",
        "variant_id": null,
        "url": "/products/M%20FRAME/framepreta1-Photoroom%20(12).png",
        "position": 3,
        "alt": "Oakley M FRAME"
      },
      {
        "id": "img-200",
        "product_id": "prod-17",
        "variant_id": null,
        "url": "/products/M%20FRAME/framepreta1-Photoroom%20(13).png",
        "position": 4,
        "alt": "Oakley M FRAME"
      },
      {
        "id": "img-201",
        "product_id": "prod-17",
        "variant_id": null,
        "url": "/products/M%20FRAME/framepreta1-Photoroom%20(4).png",
        "position": 5,
        "alt": "Oakley M FRAME"
      },
      {
        "id": "img-202",
        "product_id": "prod-17",
        "variant_id": null,
        "url": "/products/M%20FRAME/framepreta1-Photoroom%20(5).png",
        "position": 6,
        "alt": "Oakley M FRAME"
      },
      {
        "id": "img-203",
        "product_id": "prod-17",
        "variant_id": null,
        "url": "/products/M%20FRAME/framepretabranca-Photoroom.png",
        "position": 7,
        "alt": "Oakley M FRAME"
      },
      {
        "id": "img-204",
        "product_id": "prod-17",
        "variant_id": null,
        "url": "/products/M%20FRAME/mframexmetalblackfbranco-Photoroom.png",
        "position": 8,
        "alt": "Oakley M FRAME"
      },
      {
        "id": "img-205",
        "product_id": "prod-17",
        "variant_id": null,
        "url": "/products/M%20FRAME/mframexmetalblackfbranco2-Photoroom.png",
        "position": 9,
        "alt": "Oakley M FRAME"
      },
      {
        "id": "img-206",
        "product_id": "prod-17",
        "variant_id": null,
        "url": "/products/M%20FRAME/mframexmetalgoldbranco2-Photoroom.png",
        "position": 10,
        "alt": "Oakley M FRAME"
      },
      {
        "id": "img-207",
        "product_id": "prod-17",
        "variant_id": null,
        "url": "/products/M%20FRAME/mframexmetalgoldfbranco-Photoroom.png",
        "position": 11,
        "alt": "Oakley M FRAME"
      },
      {
        "id": "img-208",
        "product_id": "prod-17",
        "variant_id": null,
        "url": "/products/M%20FRAME/mframexmetalliquidfbranco-Photoroom.png",
        "position": 12,
        "alt": "Oakley M FRAME"
      },
      {
        "id": "img-209",
        "product_id": "prod-17",
        "variant_id": null,
        "url": "/products/M%20FRAME/mframexmetalliquidfbranco2-Photoroom.png",
        "position": 13,
        "alt": "Oakley M FRAME"
      },
      {
        "id": "img-210",
        "product_id": "prod-17",
        "variant_id": null,
        "url": "/products/M%20FRAME/mframexmetaltorchfbranco-Photoroom.png",
        "position": 14,
        "alt": "Oakley M FRAME"
      },
      {
        "id": "img-211",
        "product_id": "prod-17",
        "variant_id": null,
        "url": "/products/M%20FRAME/mframexmetaltorchfbranco2-Photoroom.png",
        "position": 15,
        "alt": "Oakley M FRAME"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-18",
    "slug": "mag-four-s",
    "name": "Mag Four S",
    "description": "<p>O MAG FOUR S é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-titanio",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-titanio",
      "slug": "titanio",
      "name": "Titânio & Metal",
      "description": "Armações em X Metal e titânio. O máximo em durabilidade e leveza.",
      "image_url": "/products/CHAMINADE/chaminade_black.png",
      "position": 3
    },
    "variants": [
      {
        "id": "var-18",
        "product_id": "prod-18",
        "name": "Padrão",
        "price": 699.9,
        "compare_price": 910,
        "sku": "OAK-MAGFOURS-001",
        "stock": 9,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-212",
        "product_id": "prod-18",
        "variant_id": null,
        "url": "/products/MAG%20FOUR%20S/MAGFOURCB1.png",
        "position": 1,
        "alt": "Oakley MAG FOUR S"
      },
      {
        "id": "img-213",
        "product_id": "prod-18",
        "variant_id": null,
        "url": "/products/MAG%20FOUR%20S/MAGFOURCGF.png",
        "position": 2,
        "alt": "Oakley MAG FOUR S"
      },
      {
        "id": "img-214",
        "product_id": "prod-18",
        "variant_id": null,
        "url": "/products/MAG%20FOUR%20S/MAGFOURCGF1.png",
        "position": 3,
        "alt": "Oakley MAG FOUR S"
      },
      {
        "id": "img-215",
        "product_id": "prod-18",
        "variant_id": null,
        "url": "/products/MAG%20FOUR%20S/MAGFOURCT.png",
        "position": 4,
        "alt": "Oakley MAG FOUR S"
      },
      {
        "id": "img-216",
        "product_id": "prod-18",
        "variant_id": null,
        "url": "/products/MAG%20FOUR%20S/MAGFOURFB.png",
        "position": 5,
        "alt": "Oakley MAG FOUR S"
      },
      {
        "id": "img-217",
        "product_id": "prod-18",
        "variant_id": null,
        "url": "/products/MAG%20FOUR%20S/MAGFOURTB.png",
        "position": 6,
        "alt": "Oakley MAG FOUR S"
      },
      {
        "id": "img-218",
        "product_id": "prod-18",
        "variant_id": null,
        "url": "/products/MAG%20FOUR%20S/MAGFOURTB1.png",
        "position": 7,
        "alt": "Oakley MAG FOUR S"
      },
      {
        "id": "img-219",
        "product_id": "prod-18",
        "variant_id": null,
        "url": "/products/MAG%20FOUR%20S/MAGFOURTG.png",
        "position": 8,
        "alt": "Oakley MAG FOUR S"
      },
      {
        "id": "img-220",
        "product_id": "prod-18",
        "variant_id": null,
        "url": "/products/MAG%20FOUR%20S/MAGFOURTG1.png",
        "position": 9,
        "alt": "Oakley MAG FOUR S"
      },
      {
        "id": "img-221",
        "product_id": "prod-18",
        "variant_id": null,
        "url": "/products/MAG%20FOUR%20S/MAGFOURTT.png",
        "position": 10,
        "alt": "Oakley MAG FOUR S"
      },
      {
        "id": "img-222",
        "product_id": "prod-18",
        "variant_id": null,
        "url": "/products/MAG%20FOUR%20S/MAGFOURTT1.png",
        "position": 11,
        "alt": "Oakley MAG FOUR S"
      },
      {
        "id": "img-223",
        "product_id": "prod-18",
        "variant_id": null,
        "url": "/products/MAG%20FOUR%20S/MAGFOURXB.png",
        "position": 12,
        "alt": "Oakley MAG FOUR S"
      },
      {
        "id": "img-224",
        "product_id": "prod-18",
        "variant_id": null,
        "url": "/products/MAG%20FOUR%20S/MAGFOURXB1.png",
        "position": 13,
        "alt": "Oakley MAG FOUR S"
      },
      {
        "id": "img-225",
        "product_id": "prod-18",
        "variant_id": null,
        "url": "/products/MAG%20FOUR%20S/MAGFOURXE.png",
        "position": 14,
        "alt": "Oakley MAG FOUR S"
      },
      {
        "id": "img-226",
        "product_id": "prod-18",
        "variant_id": null,
        "url": "/products/MAG%20FOUR%20S/MAGFOURXE1.png",
        "position": 15,
        "alt": "Oakley MAG FOUR S"
      },
      {
        "id": "img-227",
        "product_id": "prod-18",
        "variant_id": null,
        "url": "/products/MAG%20FOUR%20S/MAGFOURXGF.png",
        "position": 16,
        "alt": "Oakley MAG FOUR S"
      },
      {
        "id": "img-228",
        "product_id": "prod-18",
        "variant_id": null,
        "url": "/products/MAG%20FOUR%20S/MAGFOURXGF1.png",
        "position": 17,
        "alt": "Oakley MAG FOUR S"
      },
      {
        "id": "img-229",
        "product_id": "prod-18",
        "variant_id": null,
        "url": "/products/MAG%20FOUR%20S/MAGFOURXI.png",
        "position": 18,
        "alt": "Oakley MAG FOUR S"
      },
      {
        "id": "img-230",
        "product_id": "prod-18",
        "variant_id": null,
        "url": "/products/MAG%20FOUR%20S/MAGFOURXI1.png",
        "position": 19,
        "alt": "Oakley MAG FOUR S"
      },
      {
        "id": "img-231",
        "product_id": "prod-18",
        "variant_id": null,
        "url": "/products/MAG%20FOUR%20S/MAGFOURXT.png",
        "position": 20,
        "alt": "Oakley MAG FOUR S"
      },
      {
        "id": "img-232",
        "product_id": "prod-18",
        "variant_id": null,
        "url": "/products/MAG%20FOUR%20S/MAGFOURXT1.png",
        "position": 21,
        "alt": "Oakley MAG FOUR S"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-19",
    "slug": "minute",
    "name": "Minute",
    "description": "<p>O MINUTE é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-classicos",
    "status": "active",
    "featured": true,
    "collection": {
      "id": "col-classicos",
      "slug": "classicos",
      "name": "Clássicos",
      "description": "Os modelos atemporais que definiram a história da Oakley.",
      "image_url": "/products/DOUBLE%20X/doublex24k-Photoroom_upscayl_3x_upscayl-lite-4x.png",
      "position": 2
    },
    "variants": [
      {
        "id": "var-19",
        "product_id": "prod-19",
        "name": "Padrão",
        "price": 499.9,
        "compare_price": null,
        "sku": "OAK-MINUTE-001",
        "stock": 12,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-233",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTEAZULBLACK-Photoroom.png",
        "position": 1,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-234",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTEBLUEBLACKK1-Photoroom.png",
        "position": 2,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-235",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTEBLUELIQUIDD-Photoroom.png",
        "position": 3,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-236",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTEBLUELIQUIDD1-Photoroom.png",
        "position": 4,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-237",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTEBLUETORCHH-Photoroom.png",
        "position": 5,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-238",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTEBLUETORCHH1-Photoroom.png",
        "position": 6,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-239",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTEBRANCALOW-Photoroom.png",
        "position": 7,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-240",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTEBRANCALOW1-Photoroom.png",
        "position": 8,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-241",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTEBRANCAPINK-Photoroom.png",
        "position": 9,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-242",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTEBRANCAPINK1-Photoroom.png",
        "position": 10,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-243",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTEBRANCAPRETA-Photoroom%20(1).png",
        "position": 11,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-244",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTEBRANCAPRETA-Photoroom.png",
        "position": 12,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-245",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTEBRANCARUBY-Photoroom.png",
        "position": 13,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-246",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTEBRANCARUBY1-Photoroom.png",
        "position": 14,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-247",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTEBRANCATORCH-Photoroom.png",
        "position": 15,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-248",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTEBRANCATORCHH1-Photoroom.png",
        "position": 16,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-249",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTECINZABLACKK-Photoroom.png",
        "position": 17,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-250",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTECINZABLACKK1-Photoroom.png",
        "position": 18,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-251",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTECINZALIQUID-Photoroom.png",
        "position": 19,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-252",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTECINZALIQUID1-Photoroom.png",
        "position": 20,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-253",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTECINZATORCH-Photoroom.png",
        "position": 21,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-254",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTECINZATORCHH-Photoroom.png",
        "position": 22,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-255",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTECINZATORCHH1-Photoroom.png",
        "position": 23,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-256",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTECOOOPER-Photoroom.png",
        "position": 24,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-257",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTECOOOPER1-Photoroom.png",
        "position": 25,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-258",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTECOOPERGOLD-Photoroom.png",
        "position": 26,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-259",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTECOOPERGOLD1-Photoroom.png",
        "position": 27,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-260",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTECOOPERRUBY-Photoroom.png",
        "position": 28,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-261",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTECOOPERRUBY1-Photoroom.png",
        "position": 29,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-262",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTECRISTAL1-Photoroom.png",
        "position": 30,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-263",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/MINUTECRISTALPRETA-Photoroom.png",
        "position": 31,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-264",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/minuteblack2.png",
        "position": 32,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-265",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/minuteblack3.png",
        "position": 33,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-266",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/minuteblack4.png",
        "position": 34,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-267",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/minuteblack5.png",
        "position": 35,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-268",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/minuteblack6.png",
        "position": 36,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-269",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/minuteblack7.png",
        "position": 37,
        "alt": "Oakley MINUTE"
      },
      {
        "id": "img-270",
        "product_id": "prod-19",
        "variant_id": null,
        "url": "/products/MINUTE/minuteblack8.png",
        "position": 38,
        "alt": "Oakley MINUTE"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-20",
    "slug": "monster-dog",
    "name": "Monster Dog",
    "description": "<p>O MONSTER DOG é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-lifestyle",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-lifestyle",
      "slug": "lifestyle",
      "name": "Lifestyle",
      "description": "Estilo e performance para o dia a dia.",
      "image_url": "/products/GASCAN/gascanblack.png",
      "position": 4
    },
    "variants": [
      {
        "id": "var-20",
        "product_id": "prod-20",
        "name": "Padrão",
        "price": 369.9,
        "compare_price": null,
        "sku": "OAK-MONSTERD-001",
        "stock": 4,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-271",
        "product_id": "prod-20",
        "variant_id": null,
        "url": "/products/MONSTER%20DOG/monsterdog%20(1).png",
        "position": 1,
        "alt": "Oakley MONSTER DOG"
      },
      {
        "id": "img-272",
        "product_id": "prod-20",
        "variant_id": null,
        "url": "/products/MONSTER%20DOG/monsterdog%20(2).png",
        "position": 2,
        "alt": "Oakley MONSTER DOG"
      },
      {
        "id": "img-273",
        "product_id": "prod-20",
        "variant_id": null,
        "url": "/products/MONSTER%20DOG/monsterdog%20(3).png",
        "position": 3,
        "alt": "Oakley MONSTER DOG"
      },
      {
        "id": "img-274",
        "product_id": "prod-20",
        "variant_id": null,
        "url": "/products/MONSTER%20DOG/monsterdog%20(4).png",
        "position": 4,
        "alt": "Oakley MONSTER DOG"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-21",
    "slug": "penny",
    "name": "Penny",
    "description": "<p>O PENNY é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-classicos",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-classicos",
      "slug": "classicos",
      "name": "Clássicos",
      "description": "Os modelos atemporais que definiram a história da Oakley.",
      "image_url": "/products/DOUBLE%20X/doublex24k-Photoroom_upscayl_3x_upscayl-lite-4x.png",
      "position": 2
    },
    "variants": [
      {
        "id": "var-21",
        "product_id": "prod-21",
        "name": "Padrão",
        "price": 449.9,
        "compare_price": null,
        "sku": "OAK-PENNY-001",
        "stock": 13,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-275",
        "product_id": "prod-21",
        "variant_id": null,
        "url": "/products/PENNY/pennyCarbonrubyfundobranco-Photoroom.webp",
        "position": 1,
        "alt": "Oakley PENNY"
      },
      {
        "id": "img-276",
        "product_id": "prod-21",
        "variant_id": null,
        "url": "/products/PENNY/pennycarbonroxafundobranco-Photoroom.webp",
        "position": 2,
        "alt": "Oakley PENNY"
      },
      {
        "id": "img-277",
        "product_id": "prod-21",
        "variant_id": null,
        "url": "/products/PENNY/pennyfullblack-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 3,
        "alt": "Oakley PENNY"
      },
      {
        "id": "img-278",
        "product_id": "prod-21",
        "variant_id": null,
        "url": "/products/PENNY/pennyplasmametalicfundobranco-Photoroom.png",
        "position": 4,
        "alt": "Oakley PENNY"
      },
      {
        "id": "img-279",
        "product_id": "prod-21",
        "variant_id": null,
        "url": "/products/PENNY/pennyplasmatorchfundobranco-Photoroom.webp",
        "position": 5,
        "alt": "Oakley PENNY"
      },
      {
        "id": "img-280",
        "product_id": "prod-21",
        "variant_id": null,
        "url": "/products/PENNY/pennypretametalic-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 6,
        "alt": "Oakley PENNY"
      },
      {
        "id": "img-281",
        "product_id": "prod-21",
        "variant_id": null,
        "url": "/products/PENNY/pennyxmetal-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 7,
        "alt": "Oakley PENNY"
      },
      {
        "id": "img-282",
        "product_id": "prod-21",
        "variant_id": null,
        "url": "/products/PENNY/pennyxmetalmetalicfundobranco-Photoroom.webp",
        "position": 8,
        "alt": "Oakley PENNY"
      },
      {
        "id": "img-283",
        "product_id": "prod-21",
        "variant_id": null,
        "url": "/products/PENNY/pennyxmetalroxa-Photoroom%20(2)_upscayl_3x_upscayl-lite-4x.png",
        "position": 9,
        "alt": "Oakley PENNY"
      },
      {
        "id": "img-284",
        "product_id": "prod-21",
        "variant_id": null,
        "url": "/products/PENNY/pennyxmetalroxa-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 10,
        "alt": "Oakley PENNY"
      },
      {
        "id": "img-285",
        "product_id": "prod-21",
        "variant_id": null,
        "url": "/products/PENNY/pennyxmetalrubyfundobranco-Photoroom.webp",
        "position": 11,
        "alt": "Oakley PENNY"
      },
      {
        "id": "img-286",
        "product_id": "prod-21",
        "variant_id": null,
        "url": "/products/PENNY/pennyxmetaltanzanitefundobranco-Photoroom.webp",
        "position": 12,
        "alt": "Oakley PENNY"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-22",
    "slug": "permian",
    "name": "Permian",
    "description": "<p>O PERMIAN é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-titanio",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-titanio",
      "slug": "titanio",
      "name": "Titânio & Metal",
      "description": "Armações em X Metal e titânio. O máximo em durabilidade e leveza.",
      "image_url": "/products/CHAMINADE/chaminade_black.png",
      "position": 3
    },
    "variants": [
      {
        "id": "var-22",
        "product_id": "prod-22",
        "name": "Padrão",
        "price": 389.9,
        "compare_price": 507,
        "sku": "OAK-PERMIAN-001",
        "stock": 15,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-287",
        "product_id": "prod-22",
        "variant_id": null,
        "url": "/products/PERMIAN/permian%20(1).png",
        "position": 1,
        "alt": "Oakley PERMIAN"
      },
      {
        "id": "img-288",
        "product_id": "prod-22",
        "variant_id": null,
        "url": "/products/PERMIAN/permian%20(2).png",
        "position": 2,
        "alt": "Oakley PERMIAN"
      },
      {
        "id": "img-289",
        "product_id": "prod-22",
        "variant_id": null,
        "url": "/products/PERMIAN/permian%20(3).png",
        "position": 3,
        "alt": "Oakley PERMIAN"
      },
      {
        "id": "img-290",
        "product_id": "prod-22",
        "variant_id": null,
        "url": "/products/PERMIAN/permian%20(4).png",
        "position": 4,
        "alt": "Oakley PERMIAN"
      },
      {
        "id": "img-291",
        "product_id": "prod-22",
        "variant_id": null,
        "url": "/products/PERMIAN/permian%20(5).png",
        "position": 5,
        "alt": "Oakley PERMIAN"
      },
      {
        "id": "img-292",
        "product_id": "prod-22",
        "variant_id": null,
        "url": "/products/PERMIAN/permian%20(6).png",
        "position": 6,
        "alt": "Oakley PERMIAN"
      },
      {
        "id": "img-293",
        "product_id": "prod-22",
        "variant_id": null,
        "url": "/products/PERMIAN/permian%20(7).png",
        "position": 7,
        "alt": "Oakley PERMIAN"
      },
      {
        "id": "img-294",
        "product_id": "prod-22",
        "variant_id": null,
        "url": "/products/PERMIAN/permian%20(8).png",
        "position": 8,
        "alt": "Oakley PERMIAN"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-23",
    "slug": "pitboss",
    "name": "Pitboss",
    "description": "<p>O PITBOSS é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-lifestyle",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-lifestyle",
      "slug": "lifestyle",
      "name": "Lifestyle",
      "description": "Estilo e performance para o dia a dia.",
      "image_url": "/products/GASCAN/gascanblack.png",
      "position": 4
    },
    "variants": [
      {
        "id": "var-23",
        "product_id": "prod-23",
        "name": "Padrão",
        "price": 349.9,
        "compare_price": null,
        "sku": "OAK-PITBOSS-001",
        "stock": 17,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-295",
        "product_id": "prod-23",
        "variant_id": null,
        "url": "/products/PITBOSS/IMG_8771-Photoroom%20(1).jpg",
        "position": 1,
        "alt": "Oakley PITBOSS"
      },
      {
        "id": "img-296",
        "product_id": "prod-23",
        "variant_id": null,
        "url": "/products/PITBOSS/IMG_8771-Photoroom%20(2).jpg",
        "position": 2,
        "alt": "Oakley PITBOSS"
      },
      {
        "id": "img-297",
        "product_id": "prod-23",
        "variant_id": null,
        "url": "/products/PITBOSS/pitbossfullblack-Photoroom%20(3).jpg",
        "position": 3,
        "alt": "Oakley PITBOSS"
      },
      {
        "id": "img-298",
        "product_id": "prod-23",
        "variant_id": null,
        "url": "/products/PITBOSS/pitbossfullblacktanzanite-Photoroom.jpg",
        "position": 4,
        "alt": "Oakley PITBOSS"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-24",
    "slug": "plantaris",
    "name": "Plantaris",
    "description": "<p>O PLANTARIS é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-titanio",
    "status": "active",
    "featured": true,
    "collection": {
      "id": "col-titanio",
      "slug": "titanio",
      "name": "Titânio & Metal",
      "description": "Armações em X Metal e titânio. O máximo em durabilidade e leveza.",
      "image_url": "/products/CHAMINADE/chaminade_black.png",
      "position": 3
    },
    "variants": [
      {
        "id": "var-24",
        "product_id": "prod-24",
        "name": "Padrão",
        "price": 749.9,
        "compare_price": 975,
        "sku": "OAK-PLANTARI-001",
        "stock": 14,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-299",
        "product_id": "prod-24",
        "variant_id": null,
        "url": "/products/PLANTARIS/plantaris%20(1).png",
        "position": 1,
        "alt": "Oakley PLANTARIS"
      },
      {
        "id": "img-300",
        "product_id": "prod-24",
        "variant_id": null,
        "url": "/products/PLANTARIS/plantaris%20(2).png",
        "position": 2,
        "alt": "Oakley PLANTARIS"
      },
      {
        "id": "img-301",
        "product_id": "prod-24",
        "variant_id": null,
        "url": "/products/PLANTARIS/plantaris%20(3).png",
        "position": 3,
        "alt": "Oakley PLANTARIS"
      },
      {
        "id": "img-302",
        "product_id": "prod-24",
        "variant_id": null,
        "url": "/products/PLANTARIS/plantaris%20(4).png",
        "position": 4,
        "alt": "Oakley PLANTARIS"
      },
      {
        "id": "img-303",
        "product_id": "prod-24",
        "variant_id": null,
        "url": "/products/PLANTARIS/plantaris%20fundo%20branco%20ladoog-Photoroom%20(1)_upscayl_3x_upscayl-lite-4x.png",
        "position": 5,
        "alt": "Oakley PLANTARIS"
      },
      {
        "id": "img-304",
        "product_id": "prod-24",
        "variant_id": null,
        "url": "/products/PLANTARIS/plantaris%20verde-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 6,
        "alt": "Oakley PLANTARIS"
      },
      {
        "id": "img-305",
        "product_id": "prod-24",
        "variant_id": null,
        "url": "/products/PLANTARIS/plantaris_abyss.png",
        "position": 7,
        "alt": "Oakley PLANTARIS"
      },
      {
        "id": "img-306",
        "product_id": "prod-24",
        "variant_id": null,
        "url": "/products/PLANTARIS/plantarisazul-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 8,
        "alt": "Oakley PLANTARIS"
      },
      {
        "id": "img-307",
        "product_id": "prod-24",
        "variant_id": null,
        "url": "/products/PLANTARIS/plantarisfullblack-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 9,
        "alt": "Oakley PLANTARIS"
      },
      {
        "id": "img-308",
        "product_id": "prod-24",
        "variant_id": null,
        "url": "/products/PLANTARIS/plantarismatte-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 10,
        "alt": "Oakley PLANTARIS"
      },
      {
        "id": "img-309",
        "product_id": "prod-24",
        "variant_id": null,
        "url": "/products/PLANTARIS/plantarissilver.png",
        "position": 11,
        "alt": "Oakley PLANTARIS"
      },
      {
        "id": "img-310",
        "product_id": "prod-24",
        "variant_id": null,
        "url": "/products/PLANTARIS/plantarissilver2.png",
        "position": 12,
        "alt": "Oakley PLANTARIS"
      },
      {
        "id": "img-311",
        "product_id": "prod-24",
        "variant_id": null,
        "url": "/products/PLANTARIS/plantarissilver3.png",
        "position": 13,
        "alt": "Oakley PLANTARIS"
      },
      {
        "id": "img-312",
        "product_id": "prod-24",
        "variant_id": null,
        "url": "/products/PLANTARIS/plantarissilver4.png",
        "position": 14,
        "alt": "Oakley PLANTARIS"
      },
      {
        "id": "img-313",
        "product_id": "prod-24",
        "variant_id": null,
        "url": "/products/PLANTARIS/plantarissilver5.png",
        "position": 15,
        "alt": "Oakley PLANTARIS"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-25",
    "slug": "plantaris-squared",
    "name": "Plantaris Squared",
    "description": "<p>O PLANTARIS SQUARED é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-titanio",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-titanio",
      "slug": "titanio",
      "name": "Titânio & Metal",
      "description": "Armações em X Metal e titânio. O máximo em durabilidade e leveza.",
      "image_url": "/products/CHAMINADE/chaminade_black.png",
      "position": 3
    },
    "variants": [
      {
        "id": "var-25",
        "product_id": "prod-25",
        "name": "Padrão",
        "price": 749.9,
        "compare_price": null,
        "sku": "OAK-PLANTARI-001",
        "stock": 7,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-314",
        "product_id": "prod-25",
        "variant_id": null,
        "url": "/products/PLANTARIS%20SQUARED/plantaris%20xsquared%20(1).png",
        "position": 1,
        "alt": "Oakley PLANTARIS SQUARED"
      },
      {
        "id": "img-315",
        "product_id": "prod-25",
        "variant_id": null,
        "url": "/products/PLANTARIS%20SQUARED/plantaris%20xsquared%20(2).png",
        "position": 2,
        "alt": "Oakley PLANTARIS SQUARED"
      },
      {
        "id": "img-316",
        "product_id": "prod-25",
        "variant_id": null,
        "url": "/products/PLANTARIS%20SQUARED/plantaris%20xsquared%20(3).png",
        "position": 3,
        "alt": "Oakley PLANTARIS SQUARED"
      },
      {
        "id": "img-317",
        "product_id": "prod-25",
        "variant_id": null,
        "url": "/products/PLANTARIS%20SQUARED/plantaris%20xsquared%20(4).png",
        "position": 4,
        "alt": "Oakley PLANTARIS SQUARED"
      },
      {
        "id": "img-318",
        "product_id": "prod-25",
        "variant_id": null,
        "url": "/products/PLANTARIS%20SQUARED/plantaris%20xsquared%20(5).png",
        "position": 5,
        "alt": "Oakley PLANTARIS SQUARED"
      },
      {
        "id": "img-319",
        "product_id": "prod-25",
        "variant_id": null,
        "url": "/products/PLANTARIS%20SQUARED/plantaris%20xsquared%20(6).png",
        "position": 6,
        "alt": "Oakley PLANTARIS SQUARED"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-26",
    "slug": "plate",
    "name": "Plate",
    "description": "<p>O PLATE é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-titanio",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-titanio",
      "slug": "titanio",
      "name": "Titânio & Metal",
      "description": "Armações em X Metal e titânio. O máximo em durabilidade e leveza.",
      "image_url": "/products/CHAMINADE/chaminade_black.png",
      "position": 3
    },
    "variants": [
      {
        "id": "var-26",
        "product_id": "prod-26",
        "name": "Padrão",
        "price": 549.9,
        "compare_price": 715,
        "sku": "OAK-PLATE-001",
        "stock": 6,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-320",
        "product_id": "prod-26",
        "variant_id": null,
        "url": "/products/PLATE/platecarbonliquidmetalfundobranco-Photoroom.webp",
        "position": 1,
        "alt": "Oakley PLATE"
      },
      {
        "id": "img-321",
        "product_id": "prod-26",
        "variant_id": null,
        "url": "/products/PLATE/platecarbonpretafundobranco-Photoroom.webp",
        "position": 2,
        "alt": "Oakley PLATE"
      },
      {
        "id": "img-322",
        "product_id": "prod-26",
        "variant_id": null,
        "url": "/products/PLATE/platecarbonrubyfundobranco-Photoroom.webp",
        "position": 3,
        "alt": "Oakley PLATE"
      },
      {
        "id": "img-323",
        "product_id": "prod-26",
        "variant_id": null,
        "url": "/products/PLATE/platemattebonegoldcafefundobranco-Photoroom.webp",
        "position": 4,
        "alt": "Oakley PLATE"
      },
      {
        "id": "img-324",
        "product_id": "prod-26",
        "variant_id": null,
        "url": "/products/PLATE/platemattebonemetalicfundobranco-Photoroom.webp",
        "position": 5,
        "alt": "Oakley PLATE"
      },
      {
        "id": "img-325",
        "product_id": "prod-26",
        "variant_id": null,
        "url": "/products/PLATE/plateplasmadarkrubyfundobranco-Photoroom.webp",
        "position": 6,
        "alt": "Oakley PLATE"
      },
      {
        "id": "img-326",
        "product_id": "prod-26",
        "variant_id": null,
        "url": "/products/PLATE/plateplasmagoldcafefundobranco-Photoroom.webp",
        "position": 7,
        "alt": "Oakley PLATE"
      },
      {
        "id": "img-327",
        "product_id": "prod-26",
        "variant_id": null,
        "url": "/products/PLATE/platexmetalfundobranco-Photoroom.webp",
        "position": 8,
        "alt": "Oakley PLATE"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-27",
    "slug": "radar-ev",
    "name": "Radar Ev",
    "description": "<p>O RADAR EV é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-sport",
    "status": "active",
    "featured": true,
    "collection": {
      "id": "col-sport",
      "slug": "sport",
      "name": "Sport & Performance",
      "description": "Óculos de alta performance para esportes e atividades ao ar livre.",
      "image_url": "/products/EYE%20JACKET/eye%20jacket%20brain%20d%20(1).png",
      "position": 1
    },
    "variants": [
      {
        "id": "var-27",
        "product_id": "prod-27",
        "name": "Padrão",
        "price": 429.9,
        "compare_price": null,
        "sku": "OAK-RADAREV-001",
        "stock": 5,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-328",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVKITDARKRUBY-Photoroom.png",
        "position": 1,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-329",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVKITLIQUID-Photoroom.png",
        "position": 2,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-330",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVKITPRETO-Photoroom.png",
        "position": 3,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-331",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVKITROXA-Photoroom.png",
        "position": 4,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-332",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVKITRUBY-Photoroom.png",
        "position": 5,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-333",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVKITSAPPHIRE-Photoroom.png",
        "position": 6,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-334",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVKITTANZANITE-Photoroom.png",
        "position": 7,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-335",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVPIETGOLDCAFE-Photoroom.png",
        "position": 8,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-336",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVPIETGOLDCAFE1-Photoroom.png",
        "position": 9,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-337",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVPIETLIQUID-Photoroom.png",
        "position": 10,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-338",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVPIETLIQUID1-Photoroom.png",
        "position": 11,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-339",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVPIETPRETA-Photoroom.png",
        "position": 12,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-340",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVPIETPRETA1-Photoroom.png",
        "position": 13,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-341",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVPIETTORCH1-Photoroom.png",
        "position": 14,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-342",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVPIETTORCHFUNDB-Photoroom.png",
        "position": 15,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-343",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVPRETA1-Photoroom.png",
        "position": 16,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-344",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVPRETABRANCA-Photoroom.png",
        "position": 17,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-345",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVPRETADARKRUBY-Photoroom.png",
        "position": 18,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-346",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVPRETADARKRUBY1-Photoroom.png",
        "position": 19,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-347",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVPRETALIQUID-Photoroom.png",
        "position": 20,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-348",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVPRETALIQUID1-Photoroom.png",
        "position": 21,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-349",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVPRETAROXA-Photoroom.png",
        "position": 22,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-350",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVPRETAROXA1-Photoroom.png",
        "position": 23,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-351",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVPRETARUBY-Photoroom.png",
        "position": 24,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-352",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVPRETARUBY1-Photoroom.png",
        "position": 25,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-353",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVPRETASAPPHIRE-Photoroom.png",
        "position": 26,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-354",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVPRETASAPPHIRE1-Photoroom.png",
        "position": 27,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-355",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVPRETATANZANITE-Photoroom.png",
        "position": 28,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-356",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/RADAREVPRETATANZANITE1-Photoroom.png",
        "position": 29,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-357",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/radar%20ev%20acrilico.png",
        "position": 30,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-358",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/radar%20ev%20branca%20(1).png",
        "position": 31,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-359",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/radar%20ev%20branca%20(2).png",
        "position": 32,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-360",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/radar%20ev%20branca%20(3).png",
        "position": 33,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-361",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/radar%20ev%20chumbo.png",
        "position": 34,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-362",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/radar%20ev%20cinza.png",
        "position": 35,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-363",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/radar%20ev%20laranja%20(1).png",
        "position": 36,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-364",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/radar%20ev%20laranja%20(2).png",
        "position": 37,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-365",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/radar%20ev%20laranja%20(3).png",
        "position": 38,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-366",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/radar%20ev%20piett%20(1).png",
        "position": 39,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-367",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/radar%20ev%20piett%20(2).png",
        "position": 40,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-368",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/radar%20ev%20piett%20(3).png",
        "position": 41,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-369",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/radar%20ev%20piett%20(4).png",
        "position": 42,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-370",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/radar%20ev%20piett%20(5).png",
        "position": 43,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-371",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/radarbronzevr28fbranco-Photoroom.png",
        "position": 44,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-372",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/radarbronzevr28fbranco1-Photoroom.png",
        "position": 45,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-373",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/radarcooperblackfbranco-Photoroom.png",
        "position": 46,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-374",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/radarcooperblackfbranco1-Photoroom.png",
        "position": 47,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-375",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/radarevpreta%20(1).png",
        "position": 48,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-376",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/radarevpreta%20(2).png",
        "position": 49,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-377",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/radarevpreta%20(3).png",
        "position": 50,
        "alt": "Oakley RADAR EV"
      },
      {
        "id": "img-378",
        "product_id": "prod-27",
        "variant_id": null,
        "url": "/products/RADAR%20EV/radarevpreta%20(4).png",
        "position": 51,
        "alt": "Oakley RADAR EV"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-28",
    "slug": "radarlock-path",
    "name": "Radarlock Path",
    "description": "<p>O RADARLOCK PATH é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-sport",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-sport",
      "slug": "sport",
      "name": "Sport & Performance",
      "description": "Óculos de alta performance para esportes e atividades ao ar livre.",
      "image_url": "/products/EYE%20JACKET/eye%20jacket%20brain%20d%20(1).png",
      "position": 1
    },
    "variants": [
      {
        "id": "var-28",
        "product_id": "prod-28",
        "name": "Padrão",
        "price": 399.9,
        "compare_price": 520,
        "sku": "OAK-RADARLOC-001",
        "stock": 11,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-379",
        "product_id": "prod-28",
        "variant_id": null,
        "url": "/products/RADARLOCK%20PATH/radarlockpretabranca-Photoroom.png",
        "position": 1,
        "alt": "Oakley RADARLOCK PATH"
      },
      {
        "id": "img-380",
        "product_id": "prod-28",
        "variant_id": null,
        "url": "/products/RADARLOCK%20PATH/radarlockpretabranca1-Photoroom.png",
        "position": 2,
        "alt": "Oakley RADARLOCK PATH"
      },
      {
        "id": "img-381",
        "product_id": "prod-28",
        "variant_id": null,
        "url": "/products/RADARLOCK%20PATH/radarlocksilverfbranco-Photoroom.png",
        "position": 3,
        "alt": "Oakley RADARLOCK PATH"
      },
      {
        "id": "img-382",
        "product_id": "prod-28",
        "variant_id": null,
        "url": "/products/RADARLOCK%20PATH/radarlocksilverfbranco1-Photoroom.png",
        "position": 4,
        "alt": "Oakley RADARLOCK PATH"
      },
      {
        "id": "img-383",
        "product_id": "prod-28",
        "variant_id": null,
        "url": "/products/RADARLOCK%20PATH/radarlocksilverfbranco2-Photoroom.png",
        "position": 5,
        "alt": "Oakley RADARLOCK PATH"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-29",
    "slug": "romeu-1",
    "name": "Romeu 1",
    "description": "<p>O ROMEU 1 é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-classicos",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-classicos",
      "slug": "classicos",
      "name": "Clássicos",
      "description": "Os modelos atemporais que definiram a história da Oakley.",
      "image_url": "/products/DOUBLE%20X/doublex24k-Photoroom_upscayl_3x_upscayl-lite-4x.png",
      "position": 2
    },
    "variants": [
      {
        "id": "var-29",
        "product_id": "prod-29",
        "name": "Padrão",
        "price": 549.9,
        "compare_price": null,
        "sku": "OAK-ROMEU1-001",
        "stock": 10,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-384",
        "product_id": "prod-29",
        "variant_id": null,
        "url": "/products/ROMEU%201/romeoblack-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 1,
        "alt": "Oakley ROMEU 1"
      },
      {
        "id": "img-385",
        "product_id": "prod-29",
        "variant_id": null,
        "url": "/products/ROMEU%201/romeogold-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 2,
        "alt": "Oakley ROMEU 1"
      },
      {
        "id": "img-386",
        "product_id": "prod-29",
        "variant_id": null,
        "url": "/products/ROMEU%201/romeometalic-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 3,
        "alt": "Oakley ROMEU 1"
      },
      {
        "id": "img-387",
        "product_id": "prod-29",
        "variant_id": null,
        "url": "/products/ROMEU%201/romeoruby-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 4,
        "alt": "Oakley ROMEU 1"
      },
      {
        "id": "img-388",
        "product_id": "prod-29",
        "variant_id": null,
        "url": "/products/ROMEU%201/romeotanzanite-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 5,
        "alt": "Oakley ROMEU 1"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-30",
    "slug": "sphaera",
    "name": "Sphaera",
    "description": "<p>O SPHAERA é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-titanio",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-titanio",
      "slug": "titanio",
      "name": "Titânio & Metal",
      "description": "Armações em X Metal e titânio. O máximo em durabilidade e leveza.",
      "image_url": "/products/CHAMINADE/chaminade_black.png",
      "position": 3
    },
    "variants": [
      {
        "id": "var-30",
        "product_id": "prod-30",
        "name": "Padrão",
        "price": 449.9,
        "compare_price": 585,
        "sku": "OAK-SPHAERA-001",
        "stock": 10,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-389",
        "product_id": "prod-30",
        "variant_id": null,
        "url": "/products/SPHAERA/sphaeraazulfbranco-Photoroom.png",
        "position": 1,
        "alt": "Oakley SPHAERA"
      },
      {
        "id": "img-390",
        "product_id": "prod-30",
        "variant_id": null,
        "url": "/products/SPHAERA/sphaeraazulfbranco1-Photoroom.png",
        "position": 2,
        "alt": "Oakley SPHAERA"
      },
      {
        "id": "img-391",
        "product_id": "prod-30",
        "variant_id": null,
        "url": "/products/SPHAERA/sphaeradarkrubyfbranco-Photoroom.png",
        "position": 3,
        "alt": "Oakley SPHAERA"
      },
      {
        "id": "img-392",
        "product_id": "prod-30",
        "variant_id": null,
        "url": "/products/SPHAERA/sphaeradarkrubyfbranco1-Photoroom.png",
        "position": 4,
        "alt": "Oakley SPHAERA"
      },
      {
        "id": "img-393",
        "product_id": "prod-30",
        "variant_id": null,
        "url": "/products/SPHAERA/sphaeragoldcafefbranco-Photoroom.png",
        "position": 5,
        "alt": "Oakley SPHAERA"
      },
      {
        "id": "img-394",
        "product_id": "prod-30",
        "variant_id": null,
        "url": "/products/SPHAERA/sphaeragoldcafefbranco1-Photoroom.png",
        "position": 6,
        "alt": "Oakley SPHAERA"
      },
      {
        "id": "img-395",
        "product_id": "prod-30",
        "variant_id": null,
        "url": "/products/SPHAERA/sphaerapretafbranco-Photoroom.png",
        "position": 7,
        "alt": "Oakley SPHAERA"
      },
      {
        "id": "img-396",
        "product_id": "prod-30",
        "variant_id": null,
        "url": "/products/SPHAERA/sphaerapretafbranco1-Photoroom.png",
        "position": 8,
        "alt": "Oakley SPHAERA"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-31",
    "slug": "splice",
    "name": "Splice",
    "description": "<p>O SPLICE é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-titanio",
    "status": "active",
    "featured": true,
    "collection": {
      "id": "col-titanio",
      "slug": "titanio",
      "name": "Titânio & Metal",
      "description": "Armações em X Metal e titânio. O máximo em durabilidade e leveza.",
      "image_url": "/products/CHAMINADE/chaminade_black.png",
      "position": 3
    },
    "variants": [
      {
        "id": "var-31",
        "product_id": "prod-31",
        "name": "Padrão",
        "price": 599.9,
        "compare_price": 780,
        "sku": "OAK-SPLICE-001",
        "stock": 12,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-397",
        "product_id": "prod-31",
        "variant_id": null,
        "url": "/products/SPLICE/spliceCINZAmetalicfundobranco-Photoroom.webp",
        "position": 1,
        "alt": "Oakley SPLICE"
      },
      {
        "id": "img-398",
        "product_id": "prod-31",
        "variant_id": null,
        "url": "/products/SPLICE/spliceCooperdarkrubyfundobranco-Photoroom.webp",
        "position": 2,
        "alt": "Oakley SPLICE"
      },
      {
        "id": "img-399",
        "product_id": "prod-31",
        "variant_id": null,
        "url": "/products/SPLICE/spliceCoopervr28fundobranco-Photoroom_upscayl_4x_upscayl-lite-4x.jpg",
        "position": 3,
        "alt": "Oakley SPLICE"
      },
      {
        "id": "img-400",
        "product_id": "prod-31",
        "variant_id": null,
        "url": "/products/SPLICE/splicecarbonmetalic-Photoroom.webp",
        "position": 4,
        "alt": "Oakley SPLICE"
      },
      {
        "id": "img-401",
        "product_id": "prod-31",
        "variant_id": null,
        "url": "/products/SPLICE/splicecarbonpretafundobranco-Photoroom.webp",
        "position": 5,
        "alt": "Oakley SPLICE"
      },
      {
        "id": "img-402",
        "product_id": "prod-31",
        "variant_id": null,
        "url": "/products/SPLICE/splicecarbontorchfundobranco-Photoroom.webp",
        "position": 6,
        "alt": "Oakley SPLICE"
      },
      {
        "id": "img-403",
        "product_id": "prod-31",
        "variant_id": null,
        "url": "/products/SPLICE/splicecinza-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 7,
        "alt": "Oakley SPLICE"
      },
      {
        "id": "img-404",
        "product_id": "prod-31",
        "variant_id": null,
        "url": "/products/SPLICE/splicecinzatorch-Photoroom_upscayl_3x_upscayl-lite-4x.png",
        "position": 8,
        "alt": "Oakley SPLICE"
      },
      {
        "id": "img-405",
        "product_id": "prod-31",
        "variant_id": null,
        "url": "/products/SPLICE/splicecmetaltanzanitefundobranco-Photoroom.webp",
        "position": 9,
        "alt": "Oakley SPLICE"
      },
      {
        "id": "img-406",
        "product_id": "prod-31",
        "variant_id": null,
        "url": "/products/SPLICE/splicetio.png",
        "position": 10,
        "alt": "Oakley SPLICE"
      },
      {
        "id": "img-407",
        "product_id": "prod-31",
        "variant_id": null,
        "url": "/products/SPLICE/splicetio2.png",
        "position": 11,
        "alt": "Oakley SPLICE"
      },
      {
        "id": "img-408",
        "product_id": "prod-31",
        "variant_id": null,
        "url": "/products/SPLICE/splicetio3.png",
        "position": 12,
        "alt": "Oakley SPLICE"
      },
      {
        "id": "img-409",
        "product_id": "prod-31",
        "variant_id": null,
        "url": "/products/SPLICE/splicetio4.png",
        "position": 13,
        "alt": "Oakley SPLICE"
      },
      {
        "id": "img-410",
        "product_id": "prod-31",
        "variant_id": null,
        "url": "/products/SPLICE/splicetio5.png",
        "position": 14,
        "alt": "Oakley SPLICE"
      },
      {
        "id": "img-411",
        "product_id": "prod-31",
        "variant_id": null,
        "url": "/products/SPLICE/splicexmetal.png",
        "position": 15,
        "alt": "Oakley SPLICE"
      },
      {
        "id": "img-412",
        "product_id": "prod-31",
        "variant_id": null,
        "url": "/products/SPLICE/splicexmetal2.png",
        "position": 16,
        "alt": "Oakley SPLICE"
      },
      {
        "id": "img-413",
        "product_id": "prod-31",
        "variant_id": null,
        "url": "/products/SPLICE/splicexmetal3.png",
        "position": 17,
        "alt": "Oakley SPLICE"
      },
      {
        "id": "img-414",
        "product_id": "prod-31",
        "variant_id": null,
        "url": "/products/SPLICE/splicexmetal4.png",
        "position": 18,
        "alt": "Oakley SPLICE"
      },
      {
        "id": "img-415",
        "product_id": "prod-31",
        "variant_id": null,
        "url": "/products/SPLICE/splicexmetal5.png",
        "position": 19,
        "alt": "Oakley SPLICE"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-32",
    "slug": "spyke",
    "name": "Spyke",
    "description": "<p>O SPYKE é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-titanio",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-titanio",
      "slug": "titanio",
      "name": "Titânio & Metal",
      "description": "Armações em X Metal e titânio. O máximo em durabilidade e leveza.",
      "image_url": "/products/CHAMINADE/chaminade_black.png",
      "position": 3
    },
    "variants": [
      {
        "id": "var-32",
        "product_id": "prod-32",
        "name": "Padrão",
        "price": 429.9,
        "compare_price": 559,
        "sku": "OAK-SPYKE-001",
        "stock": 16,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-416",
        "product_id": "prod-32",
        "variant_id": null,
        "url": "/products/SPYKE/spykeVR28fbranco-Photoroom.png",
        "position": 1,
        "alt": "Oakley SPYKE"
      },
      {
        "id": "img-417",
        "product_id": "prod-32",
        "variant_id": null,
        "url": "/products/SPYKE/spykeVR28fbranco1-Photoroom.png",
        "position": 2,
        "alt": "Oakley SPYKE"
      },
      {
        "id": "img-418",
        "product_id": "prod-32",
        "variant_id": null,
        "url": "/products/SPYKE/spykelowlightfbranco-Photoroom.png",
        "position": 3,
        "alt": "Oakley SPYKE"
      },
      {
        "id": "img-419",
        "product_id": "prod-32",
        "variant_id": null,
        "url": "/products/SPYKE/spykelowlightfbranco1-Photoroom.png",
        "position": 4,
        "alt": "Oakley SPYKE"
      },
      {
        "id": "img-420",
        "product_id": "prod-32",
        "variant_id": null,
        "url": "/products/SPYKE/spykeprizmfbranco-Photoroom.png",
        "position": 5,
        "alt": "Oakley SPYKE"
      },
      {
        "id": "img-421",
        "product_id": "prod-32",
        "variant_id": null,
        "url": "/products/SPYKE/spykeprizmfbranco1-Photoroom.png",
        "position": 6,
        "alt": "Oakley SPYKE"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-33",
    "slug": "straigh-jacket",
    "name": "Straigh Jacket",
    "description": "<p>O STRAIGH JACKET é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-titanio",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-titanio",
      "slug": "titanio",
      "name": "Titânio & Metal",
      "description": "Armações em X Metal e titânio. O máximo em durabilidade e leveza.",
      "image_url": "/products/CHAMINADE/chaminade_black.png",
      "position": 3
    },
    "variants": [
      {
        "id": "var-33",
        "product_id": "prod-33",
        "name": "Padrão",
        "price": 449.9,
        "compare_price": null,
        "sku": "OAK-STRAIGHJ-001",
        "stock": 9,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-422",
        "product_id": "prod-33",
        "variant_id": null,
        "url": "/products/STRAIGH%20JACKET/straight_jacket_copper.png",
        "position": 1,
        "alt": "Oakley STRAIGH JACKET"
      },
      {
        "id": "img-423",
        "product_id": "prod-33",
        "variant_id": null,
        "url": "/products/STRAIGH%20JACKET/straight_jacket_copper2.png",
        "position": 2,
        "alt": "Oakley STRAIGH JACKET"
      },
      {
        "id": "img-424",
        "product_id": "prod-33",
        "variant_id": null,
        "url": "/products/STRAIGH%20JACKET/straight_jacket_copper3.png",
        "position": 3,
        "alt": "Oakley STRAIGH JACKET"
      },
      {
        "id": "img-425",
        "product_id": "prod-33",
        "variant_id": null,
        "url": "/products/STRAIGH%20JACKET/straightcinzaVR28.png",
        "position": 4,
        "alt": "Oakley STRAIGH JACKET"
      },
      {
        "id": "img-426",
        "product_id": "prod-33",
        "variant_id": null,
        "url": "/products/STRAIGH%20JACKET/straightcinzablackk.png",
        "position": 5,
        "alt": "Oakley STRAIGH JACKET"
      },
      {
        "id": "img-427",
        "product_id": "prod-33",
        "variant_id": null,
        "url": "/products/STRAIGH%20JACKET/straightcinzadarkruby.png",
        "position": 6,
        "alt": "Oakley STRAIGH JACKET"
      },
      {
        "id": "img-428",
        "product_id": "prod-33",
        "variant_id": null,
        "url": "/products/STRAIGH%20JACKET/straightcinzaice.png",
        "position": 7,
        "alt": "Oakley STRAIGH JACKET"
      },
      {
        "id": "img-429",
        "product_id": "prod-33",
        "variant_id": null,
        "url": "/products/STRAIGH%20JACKET/straightcinzaruby.png",
        "position": 8,
        "alt": "Oakley STRAIGH JACKET"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  {
    "id": "prod-34",
    "slug": "wire",
    "name": "Wire",
    "description": "<p>O WIRE é um dos modelos mais icônicos da Oakley. Fabricado com os melhores materiais, combina performance e estilo inigualáveis.</p>",
    "collection_id": "col-classicos",
    "status": "active",
    "featured": false,
    "collection": {
      "id": "col-classicos",
      "slug": "classicos",
      "name": "Clássicos",
      "description": "Os modelos atemporais que definiram a história da Oakley.",
      "image_url": "/products/DOUBLE%20X/doublex24k-Photoroom_upscayl_3x_upscayl-lite-4x.png",
      "position": 2
    },
    "variants": [
      {
        "id": "var-34",
        "product_id": "prod-34",
        "name": "Padrão",
        "price": 399.9,
        "compare_price": null,
        "sku": "OAK-WIRE-001",
        "stock": 8,
        "yampi_product_id": null,
        "position": 1
      }
    ],
    "images": [
      {
        "id": "img-430",
        "product_id": "prod-34",
        "variant_id": null,
        "url": "/products/WIRE/wire%20(1).png",
        "position": 1,
        "alt": "Oakley WIRE"
      },
      {
        "id": "img-431",
        "product_id": "prod-34",
        "variant_id": null,
        "url": "/products/WIRE/wire%20(2).png",
        "position": 2,
        "alt": "Oakley WIRE"
      },
      {
        "id": "img-432",
        "product_id": "prod-34",
        "variant_id": null,
        "url": "/products/WIRE/wire%20(3).png",
        "position": 3,
        "alt": "Oakley WIRE"
      },
      {
        "id": "img-433",
        "product_id": "prod-34",
        "variant_id": null,
        "url": "/products/WIRE/wire%20(4).png",
        "position": 4,
        "alt": "Oakley WIRE"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  }
]

export const mockSettings: Record<string, string> = {
  announcement_bar: 'Frete grátis acima de R$250 · Compra 100% segura · Entrega em todo Brasil',
  hero_title: 'JULIET X METAL',
  hero_subtitle: 'O ícone dos anos 90. Titânio, lentes polarizadas, atemporal.',
  hero_cta: 'Ver Coleção',
}
