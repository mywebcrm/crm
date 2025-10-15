export type PosCocktail = {
  id: number;
  name: string;
  price: number;
  image: string | null;
  category?: { id: number; name: string; color: string | null } | null;
};

export type SaleRecord = {
  id: number;
  created_at: string;
  total: number;
  paymentType: string;
  user: { id: number; username: string } | null;
  items: {
    id: number;
    qty: number;
    price: number;
    cocktail: { id: number; name: string };
  }[];
};

function toNumber(value: unknown) {
  const numeric = typeof value === 'string' ? Number(value) : value;
  return typeof numeric === 'number' && Number.isFinite(numeric) ? numeric : 0;
}

function toString(value: unknown) {
  return typeof value === 'string' ? value : String(value ?? '');
}

export function normalizeSale(raw: unknown): SaleRecord {
  const source = (raw ?? {}) as Record<string, unknown>;
  const items = Array.isArray(source.items)
    ? source.items.map((item) => {
        const entry = (item ?? {}) as Record<string, unknown>;
        const cocktail = (entry.cocktail ?? {}) as Record<string, unknown>;
        return {
          id: Number(entry.id ?? 0),
          qty: toNumber(entry.qty),
          price: toNumber(entry.price),
          cocktail: {
            id: Number(cocktail.id ?? 0),
            name: toString(cocktail.name)
          }
        };
      })
    : [];

  const userData = source.user as Record<string, unknown> | null | undefined;

  const createdAt = source.created_at;
  const createdAtString =
    typeof createdAt === 'string'
      ? createdAt
      : createdAt instanceof Date
        ? createdAt.toISOString()
        : new Date().toISOString();

  return {
    id: Number(source.id ?? 0),
    created_at: createdAtString,
    total: toNumber(source.total),
    paymentType: toString(source.paymentType || 'card'),
    user: userData
      ? {
          id: Number(userData.id ?? 0),
          username: toString(userData.username)
        }
      : null,
    items
  };
}
