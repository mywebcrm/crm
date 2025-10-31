import type { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const bartenders = [
  { username: 'noonshift', password: 'bar123', role: 'bartender' },
  { username: 'nightowl', password: 'mixology', role: 'bartender' }
];

const categories = [
  { name: 'Classics', color: '#ff006a' },
  { name: 'Signatures', color: '#ff4f94' },
  { name: 'Seasonal', color: '#22d3ee' }
];

const ingredients = [
  { name: 'Vodka', unit: 'ml', stock_qty: 5000, min_qty: 1000 },
  { name: 'Gin', unit: 'ml', stock_qty: 4000, min_qty: 800 },
  { name: 'White Rum', unit: 'ml', stock_qty: 3500, min_qty: 700 },
  { name: 'Tequila', unit: 'ml', stock_qty: 3000, min_qty: 600 },
  { name: 'Triple Sec', unit: 'ml', stock_qty: 2000, min_qty: 400 },
  { name: 'Lime Juice', unit: 'ml', stock_qty: 2500, min_qty: 500 },
  { name: 'Simple Syrup', unit: 'ml', stock_qty: 2500, min_qty: 600 },
  { name: 'Angostura Bitters', unit: 'dashes', stock_qty: 200, min_qty: 50 }
];

const cocktails = [
  {
    name: 'Neon Martini',
    price: 12.5,
    image: '/images/cocktails/neon-martini.svg',
    category: 'Classics'
  },
  {
    name: 'Midnight Mojito',
    price: 11,
    image: '/images/cocktails/midnight-mojito.svg',
    category: 'Signatures'
  },
  {
    name: 'Museum Mule',
    price: 10,
    image: '/images/cocktails/museum-mule.svg',
    category: 'Classics'
  },
  {
    name: 'Pink Negroni',
    price: 13,
    image: '/images/cocktails/pink-negroni.svg',
    category: 'Signatures'
  },
  {
    name: 'Twilight Paloma',
    price: 11.5,
    image: '/images/cocktails/twilight-paloma.svg',
    category: 'Seasonal'
  },
  {
    name: 'Electric Spritz',
    price: 12,
    image: '/images/cocktails/electric-spritz.svg',
    category: 'Seasonal'
  }
];

const recipeMatrix: Record<string, { ingredient: string; qty: number }[]> = {
  'Neon Martini': [
    { ingredient: 'Vodka', qty: 90 },
    { ingredient: 'Triple Sec', qty: 15 },
    { ingredient: 'Lime Juice', qty: 15 }
  ],
  'Midnight Mojito': [
    { ingredient: 'White Rum', qty: 60 },
    { ingredient: 'Lime Juice', qty: 25 },
    { ingredient: 'Simple Syrup', qty: 20 }
  ],
  'Museum Mule': [
    { ingredient: 'Vodka', qty: 50 },
    { ingredient: 'Lime Juice', qty: 20 }
  ],
  'Pink Negroni': [
    { ingredient: 'Gin', qty: 30 },
    { ingredient: 'Triple Sec', qty: 30 },
    { ingredient: 'Angostura Bitters', qty: 2 }
  ],
  'Twilight Paloma': [
    { ingredient: 'Tequila', qty: 50 },
    { ingredient: 'Lime Juice', qty: 20 }
  ],
  'Electric Spritz': [
    { ingredient: 'Gin', qty: 40 },
    { ingredient: 'Simple Syrup', qty: 15 }
  ]
};

export async function seedDatabase(prisma: PrismaClient) {
  const adminLogin = process.env.ADMIN_LOGIN ?? 'admin';
  const adminPass = process.env.ADMIN_PASS ?? 'admin';

  const adminHash = await bcrypt.hash(adminPass, 10);

  const admin = await prisma.user.upsert({
    where: { username: adminLogin },
    update: { password: adminHash, role: 'admin' },
    create: { username: adminLogin, password: adminHash, role: 'admin' }
  });

  for (const bartender of bartenders) {
    const hash = await bcrypt.hash(bartender.password, 10);
    await prisma.user.upsert({
      where: { username: bartender.username },
      update: { password: hash, role: bartender.role },
      create: { username: bartender.username, password: hash, role: bartender.role }
    });
  }

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: category,
      create: category
    });
  }

  for (const ingredient of ingredients) {
    await prisma.ingredient.upsert({
      where: { name: ingredient.name },
      update: ingredient,
      create: ingredient
    });
  }

  const categoryMap = await prisma.category.findMany();

  for (const cocktail of cocktails) {
    const categoryId = categoryMap.find((c) => c.name === cocktail.category)?.id;
    await prisma.cocktail.upsert({
      where: { name: cocktail.name },
      update: {
        price: cocktail.price,
        image: cocktail.image,
        category_id: categoryId ?? null
      },
      create: {
        name: cocktail.name,
        price: cocktail.price,
        image: cocktail.image,
        category_id: categoryId ?? null
      }
    });
  }

  for (const [cocktailName, recipeItems] of Object.entries(recipeMatrix)) {
    const cocktail = await prisma.cocktail.findUnique({ where: { name: cocktailName } });
    if (!cocktail) continue;
    for (const item of recipeItems) {
      const ingredient = await prisma.ingredient.findUnique({ where: { name: item.ingredient } });
      if (!ingredient) continue;
      await prisma.recipe.upsert({
        where: {
          cocktail_id_ingredient_id: {
            cocktail_id: cocktail.id,
            ingredient_id: ingredient.id
          }
        },
        update: { qty: item.qty },
        create: {
          cocktail_id: cocktail.id,
          ingredient_id: ingredient.id,
          qty: item.qty
        }
      });
    }
  }

  const bartender = await prisma.user.findUnique({ where: { username: bartenders[0].username } });

  if (bartender) {
    const neonMartini = await prisma.cocktail.findUnique({ where: { name: 'Neon Martini' } });
    const mojito = await prisma.cocktail.findUnique({ where: { name: 'Midnight Mojito' } });

    if (neonMartini && mojito) {
      const sale = await prisma.sale.upsert({
        where: { id: 1 },
        update: {},
        create: {
          user_id: bartender.id,
          paymentType: 'card',
          total: neonMartini.price + mojito.price,
          items: {
            create: [
              { cocktail_id: neonMartini.id, qty: 1, price: neonMartini.price },
              { cocktail_id: mojito.id, qty: 1, price: mojito.price }
            ]
          }
        }
      });

      const saleItems = await prisma.saleItem.findMany({
        where: { sale_id: sale.id },
        include: { cocktail: { include: { recipe: true } } }
      });

      for (const item of saleItems) {
        for (const recipe of item.cocktail.recipe) {
          await prisma.ingredient.update({
            where: { id: recipe.ingredient_id },
            data: {
              stock_qty: {
                decrement: recipe.qty * item.qty
              }
            }
          });
        }
      }
    }
  }

  return admin;
}
