# Code Changes Summary

## Overview
All changes implement RAG (Retrieval-Augmented Generation) integration for the Agen Alia chatbot. The system now uses semantic search to inject relevant products from the database into the system prompt, replacing hardcoded product knowledge.

---

## File-by-File Changes

### 1. NEW: `supabase/migrations/20260214000001_create_products_with_embeddings.sql`

**Purpose:** Create products table with vector embeddings support

**Key Features:**
- `products` table with columns: id, name, description, price, badge, embedding, created_at, updated_at
- `embedding` column stores 768-dimensional vectors (Google text-embedding-004)
- HNSW index for fast cosine similarity search
- Row Level Security enabled:
  - Public read access (all users can query)
  - Service role only write/delete (admin operations)

**SQL:**
```sql
create extension if not exists vector with schema extensions;
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null,
  price integer not null,
  badge text,
  embedding vector(768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_embedding_hnsw_idx
  on public.products using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);
```

---

### 2. NEW: `supabase/migrations/20260214000002_create_match_products_function.sql`

**Purpose:** Create RPC function for semantic product search

**Key Features:**
- Function signature: `match_products(query_embedding vector, match_count int, match_threshold float)`
- Returns products ordered by cosine similarity (1 - <=> operator)
- Filters by similarity threshold (default 0.2)
- Grants execute permission to anonymous and authenticated users

**Usage in Edge Function:**
```typescript
const { data } = await supabase.rpc("match_products", {
  query_embedding: embedding,
  match_count: 3,
  match_threshold: 0.2,
});
```

---

### 3. NEW: `supabase/functions/seed-products/index.ts`

**Purpose:** One-time seeding of products with embeddings

**What It Does:**
1. Seeds 4 products with hardcoded data (moved from ProductsSection.tsx)
2. For each product:
   - Generates embedding via Lovable Gateway API
   - Upserts to products table (idempotent by product name)
   - Uses SERVICE_ROLE_KEY to bypass RLS
3. Returns success/failure for each product

**Pseudocode:**
```typescript
for each product in productsToSeed:
  embedding = generateEmbedding(product.name + product.description)
  upsert to products table with embedding
  return result (success/error)
```

**Invocation:**
```bash
curl -X POST https://project.supabase.co/functions/v1/seed-products \
  -H "Authorization: Bearer ANON_KEY"
```

**Response:**
```json
{
  "success": true,
  "results": [
    { "name": "Croissant Butter", "success": true, "id": "..." },
    ...
  ]
}
```

---

### 4. UPDATED: `supabase/functions/agen-alia-chat/index.ts`

**Previous Behavior:** Hardcoded product info in system prompt

**New Behavior:** Dynamic RAG pipeline

**Changes:**

#### A. Imports
```typescript
// NEW
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
```

#### B. Constants
```typescript
// CHANGED: From hardcoded system prompt → base prompt
const BASE_SYSTEM_PROMPT = `Kamu adalah Agen Alia...`;

// NEW: Type for matched products
interface MatchedProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  badge: string | null;
  similarity: number;
}
```

#### C. New Helper Functions
```typescript
// NEW: Generate embedding for user message
async function generateQueryEmbedding(text: string, apiKey: string): Promise<number[]>

// NEW: Format price to IDR
function formatPrice(price: number): string

// NEW: Query RPC for matching products
async function getMatchingProducts(...): Promise<MatchedProduct[]>

// NEW: Inject products into system prompt
function buildSystemPrompt(matchedProducts: MatchedProduct[]): string
```

#### D. Main Handler Changes
```typescript
// OLD:
const systemPrompt = `Kamu adalah Agen Alia...`; // hardcoded

// NEW:
const lastUserMessage = messages.find(m => m.role === "user");
const matchedProducts = await getMatchingProducts(
  lastUserMessage.content,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  LOVABLE_API_KEY
);
const systemPrompt = buildSystemPrompt(matchedProducts);
```

**Error Handling:** RAG failures are non-critical
- If embedding fails → logs error → falls back to BASE_SYSTEM_PROMPT
- Chat still works even if RPC fails

---

### 5. UPDATED: `src/components/ProductsSection.tsx`

**Previous Behavior:** Hardcoded 4 products in const array

**New Behavior:** Fetch products from Supabase database

**Changes:**

#### A. Removed
```typescript
// DELETED
const products = [
  { name: "Croissant Butter", description: "...", price: "Rp 18.000", priceNum: 18000, ... },
  ...
];
```

#### B. Added
```typescript
// NEW: Interface
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  badge: string | null;
  created_at: string;
  updated_at: string;
}

// NEW: Product image mapping
const PRODUCT_IMAGE_MAP: Record<string, string> = {
  "Croissant Butter": productCroissant,
  "Sourdough Classic": productSourdough,
  "Cinnamon Rolls": productCinnamon,
  "Chocolate Cake": productCake,
};

// NEW: Price formatter utility
function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}
```

#### C. Updated Component
```typescript
// NEW: State management
const [products, setProducts] = useState<Product[]>([]);
const [loading, setLoading] = useState(true);

// NEW: Fetch products on mount
useEffect(() => {
  fetchProducts();
}, []);

// NEW: Fetch from database
const fetchProducts = async () => {
  const { data } = await supabase
    .from("products")
    .select("id, name, description, price, badge, created_at, updated_at")
    .order("created_at", { ascending: true });
  setProducts(data as Product[]);
};

// UPDATED: Fetch favorites now has proper typing
const toggleFavorite = async (product: Product) => {
  // Uses product.price (number) instead of product.priceNum
  // Uses PRODUCT_IMAGE_MAP[product.name] for image
};
```

#### D. JSX Changes
```typescript
// NEW: Loading skeleton
{loading ? (
  Array.from({ length: 4 }).map((_, index) => (
    <div key={`skeleton-${index}`}>
      <Skeleton className="aspect-square w-full" />
      {/* ... more skeletons */}
    </div>
  ))
) : products.length > 0 ? (
  // Render products
) : (
  // No products message
)}

// UPDATED: Product card rendering
<img src={PRODUCT_IMAGE_MAP[product.name]} alt={product.name} />
<span className="font-display text-xl font-bold text-primary">
  {formatPrice(product.price)}
</span>
```

**Benefits:**
- Products automatically update when database changes
- No hardcoding = easier maintenance
- Loading state improves UX
- Consistent price formatting with chat responses

---

### 6. UPDATED: `src/integrations/supabase/types.ts`

**Previous State:** Only had `favorite_orders` and `profiles` tables

**Changes:**

#### A. Added Products Table Type
```typescript
products: {
  Row: {
    id: string
    name: string
    description: string
    price: number
    badge: string | null
    embedding: number[] | null  // 768-dim vector
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    name: string
    description: string
    price: number
    badge?: string | null
    embedding?: number[] | null
    created_at?: string
    updated_at?: string
  }
  Update: {
    // All fields optional
    ...
  }
  Relationships: []
}
```

#### B. Added Match Products Function Type
```typescript
Functions: {
  match_products: {
    Args: {
      query_embedding: number[]  // 768-dim vector
      match_count?: number       // default 3
      match_threshold?: number   // default 0.2
    }
    Returns: {
      id: string
      name: string
      description: string
      price: number
      badge: string | null
      similarity: number        // cosine similarity 0-1
    }[]
  }
}
```

**Benefits:**
- Full TypeScript support for products table operations
- RPC function properly typed
- Autocompletion in IDE
- Type safety for embedding vectors

---

## Data Migration

### Before (Hardcoded)
```typescript
// ProductsSection.tsx
const products = [
  { name: "Croissant Butter", price: 18000, ... },
  { name: "Sourdough Classic", price: 35000, ... },
  { name: "Cinnamon Rolls", price: 22000, ... },
  { name: "Chocolate Cake", price: 180000, ... },
];

// agen-alia-chat/index.ts system prompt
"Harga produk (Croissant Rp 18.000, Sourdough Rp 35.000, ...)"
```

### After (Database)
```sql
-- products table
INSERT INTO products (name, description, price, badge, embedding)
VALUES ('Croissant Butter', 'Croissant renyah...', 18000, 'Bestseller', [768 embedding values]);
-- ... 3 more products
```

### Access Pattern
```typescript
// Frontend
const { data: products } = await supabase.from("products").select(...);

// Chat
const { data: matchedProducts } = await supabase.rpc("match_products", {
  query_embedding: embedding,
  match_count: 3,
  match_threshold: 0.2,
});
```

---

## Critical Implementation Details

1. **Embedding Dimension:** 768 (Google text-embedding-004 output)
2. **Similarity Metric:** Cosine similarity (1 - PostgreSQL <=> operator)
3. **Match Threshold:** 0.2 (filter products with similarity > 20%)
4. **Match Limit:** Top 3 most relevant products per query
5. **Price Format:** `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" })`
6. **Fallback Behavior:** If RAG fails, chatbot uses BASE_SYSTEM_PROMPT without products
7. **Idempotency:** Seed function uses UPSERT with `onConflict: "name"` - safe to invoke multiple times

---

## No Breaking Changes

✅ All changes are additive or backwards-compatible:
- Old hardcoded data removed but not missed (replaced with database)
- Chat function still accepts same request format
- Frontend component interface unchanged to parent components
- Types additions don't affect existing types
- Edge functions can be deployed independently

---

## Testing Matrix

| Component | Before | After | Test |
|-----------|--------|-------|------|
| ProductsSection | Hardcoded array | DB query | Load products section |
| Chat RAG | Hardcoded prompts | Semantic search | Chat about products |
| Price format | "Rp X.XXX" | Intl.NumberFormat | Verify consistency |
| Loading UX | N/A | Skeleton spinner | Check loading state |
| Fallback | N/A | Base prompt on error | Break embedding API |
