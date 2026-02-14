# RAG Deployment Checklist

## Pre-Deployment
- [ ] Ensure `LOVABLE_API_KEY` is set in Supabase project secrets
- [ ] Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are available
- [ ] Ensure `SUPABASE_SERVICE_ROLE_KEY` is available (for seed function)

---

## Phase 1: Database Setup

### Execute SQL Migrations
1. [ ] Go to Supabase Dashboard → Your Project
2. [ ] Open **SQL Editor** tab
3. [ ] Create new query with migration 1 content:
   ```sql
   supabase/migrations/20260214000001_create_products_with_embeddings.sql
   ```
   - Creates extension `vector`
   - Creates `products` table with embedding column
   - Creates HNSW index
   - Enables RLS with policies
4. [ ] Execute and verify success
5. [ ] Create new query with migration 2 content:
   ```sql
   supabase/migrations/20260214000002_create_match_products_function.sql
   ```
   - Creates `match_products()` RPC function
6. [ ] Execute and verify success
7. [ ] Verify in **Database** → **Tables** → `products` exists
8. [ ] Verify in **Database** → **Functions** → `match_products` exists

---

## Phase 2: Deploy Edge Functions

### Deploy seed-products function
```bash
# From project root
supabase functions deploy seed-products

# Should see output like:
# Deployed function seed-products
```

### Deploy updated agen-alia-chat function
```bash
# From project root
supabase functions deploy agen-alia-chat

# Should see output like:
# Deployed function agen-alia-chat
```

Verify both deployed:
- [ ] Supabase Dashboard → **Functions** → see both functions listed

---

## Phase 3: Seed Products

### Invoke seed-products function (one-time)

Option A: Using curl
```bash
curl -X POST https://your-project-id.supabase.co/functions/v1/seed-products \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```

Option B: Using Supabase Dashboard
1. [ ] Go to **Functions** → **seed-products**
2. [ ] Click **Invoke**
3. [ ] Click **Send**

Expected response:
```json
{
  "success": true,
  "results": [
    { "name": "Croissant Butter", "success": true, "id": "..." },
    { "name": "Sourdough Classic", "success": true, "id": "..." },
    { "name": "Cinnamon Rolls", "success": true, "id": "..." },
    { "name": "Chocolate Cake", "success": true, "id": "..." }
  ]
}
```

- [ ] All 4 products seeded successfully

### Verify products in database
1. [ ] Supabase Dashboard → **SQL Editor**
2. [ ] Run query:
   ```sql
   SELECT id, name, price, badge, embedding IS NOT NULL as has_embedding FROM products ORDER BY created_at;
   ```
3. [ ] Should see 4 rows with `has_embedding = true`
4. [ ] Verify all prices: 18000, 35000, 22000, 180000

---

## Phase 4: Test Frontend

### Start development server
```bash
npm run dev
# or
bun dev
```

- [ ] Frontend loads without errors
- [ ] Navigate to products section
- [ ] See loading skeleton appear briefly
- [ ] All 4 products display with correct images and prices
- [ ] Product images load from local assets (not broken images)
- [ ] Badges display correctly (Bestseller, New, Premium)

---

## Phase 5: Test Chat RAG Integration

### Test basic chat
1. [ ] Open AgenAliaChat component
2. [ ] Type: "apa itu croissant?"
3. [ ] Wait for response
4. [ ] Response should mention Croissant Butter with price

### Check edge function logs
1. [ ] Supabase Dashboard → **Functions** → **agen-alia-chat**
2. [ ] Click **Logs** tab
3. [ ] Latest log should contain:
   - "Processing chat request with X messages"
   - "Found N matching products" (N should be 1-3)
   - "Streaming response from AI gateway"

### Test with various queries
- [ ] "berapa harga sourdough?" → Should mention sourdough price
- [ ] "cinnamon rolls bagaimana?" → Should mention cinnamon rolls
- [ ] "ada kue coklat?" → Should mention chocolate cake
- [ ] "apa jam buka?" → Should mention operating hours (fallback to base prompt)

### Edge case: No products match
- [ ] Type: "what's the weather today?"
- [ ] Should still respond (with base system prompt, no products injected)

---

## Phase 6: Monitor & Verify

### Check Embedding API Usage
- [ ] Lovable Dashboard → Check API credits
- [ ] Each seed call uses ~4 embeddings
- [ ] Each chat message with RAG uses 1 embedding

### Check Database Queries
- [ ] Supabase Dashboard → Database → View logs
- [ ] Verify `match_products` function is being called
- [ ] Check query execution time (should be fast with HNSW index)

### Test Frontend Network Activity
1. [ ] Open DevTools → **Network** tab
2. [ ] Reload products section
3. [ ] See request to `products` table
4. [ ] Response should NOT include embedding column
5. [ ] Response time should be < 500ms

---

## Phase 7: Troubleshooting

### If seed function fails
- [ ] Check `LOVABLE_API_KEY` is correct in Supabase secrets
- [ ] Check `SUPABASE_SERVICE_ROLE_KEY` is correct
- [ ] Check Supabase Project URL is correct
- [ ] Review function logs for specific error messages
- [ ] Try invoking again (idempotent - won't duplicate)

### If products don't show on frontend
- [ ] Check SQL migration was executed (verify table exists)
- [ ] Check network tab for products query - is it returning data?
- [ ] Check browser console for JavaScript errors
- [ ] Verify SUPABASE_ANON_KEY is correct in frontend client

### If chat doesn't use RAG
- [ ] Check agen-alia-chat function was deployed
- [ ] Check edge function logs for embedding generation errors
- [ ] Check if `SUPABASE_ANON_KEY` is available in edge function
- [ ] Verify RPC function `match_products` exists
- [ ] Check similarity threshold (default 0.2 - adjust if needed)

### If responses are too generic
- [ ] Verify products were seeded with embeddings
- [ ] Check similarity scores in logs (should be > 0.2)
- [ ] Try adjusting `match_threshold` parameter (lower = more results)
- [ ] Check product descriptions are descriptive enough

---

## Success Criteria

✅ All items below should be true:
- [ ] 4 products in database with embeddings
- [ ] Products section loads from database (not hardcoded)
- [ ] Products section shows images correctly
- [ ] Chat responds with product information when asked
- [ ] Seed function is idempotent (safe to invoke multiple times)
- [ ] No TypeErrors in browser console
- [ ] No 500 errors in Edge Function logs

---

## Quick Rollback (if needed)

To revert to hardcoded products while troubleshooting:
1. Restore `ProductsSection.tsx` from git history
2. Keep RAG integration in chat function (non-critical if it fails)
3. Products will still work from hardcoded array

---

## Notes

- First seed call may take 5-10 seconds (generating embeddings)
- Subsequent calls are fast (product data is cached in database)
- RAG query latency: ~500ms-1s per chat message (embedding + RPC)
- If embedding API fails, chat still works (fallback to base prompt)
