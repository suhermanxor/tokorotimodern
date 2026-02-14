import { Button } from "@/components/ui/button";
import { ShoppingBag, Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import productCroissant from "@/assets/product-croissant.jpg";
import productSourdough from "@/assets/product-sourdough.jpg";
import productCinnamon from "@/assets/product-cinnamon.jpg";
import productCake from "@/assets/product-cake.jpg";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  badge: string | null;
  created_at: string;
  updated_at: string;
}

// Map product names to local images
const PRODUCT_IMAGE_MAP: Record<string, string> = {
  "Croissant Butter": productCroissant,
  "Sourdough Classic": productSourdough,
  "Cinnamon Rolls": productCinnamon,
  "Chocolate Cake": productCake,
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

const ProductsSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (user) fetchFavorites();
    else setFavorites([]);
  }, [user]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("id, name, description, price, badge, created_at, updated_at")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching products:", error);
        toast({ title: "Error", description: "Gagal memuat produk", variant: "destructive" });
      } else if (data) {
        setProducts(data as Product[]);
      }
    } catch (error) {
      console.error("Fetch products error:", error);
      toast({ title: "Error", description: "Gagal memuat produk", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    const { data } = await supabase
      .from("favorite_orders")
      .select("product_name")
      .eq("user_id", user!.id);
    if (data) setFavorites(data.map((f) => f.product_name));
  };

  const toggleFavorite = async (product: Product) => {
    if (!user) {
      toast({ title: "Silakan masuk terlebih dahulu", description: "Anda perlu login untuk menyimpan favorit.", variant: "destructive" });
      return;
    }

    const isFav = favorites.includes(product.name);

    if (isFav) {
      await supabase
        .from("favorite_orders")
        .delete()
        .eq("user_id", user.id)
        .eq("product_name", product.name);
      setFavorites((prev) => prev.filter((n) => n !== product.name));
      toast({ title: "Dihapus dari favorit" });
    } else {
      await supabase.from("favorite_orders").insert({
        user_id: user.id,
        product_name: product.name,
        product_price: product.price,
        product_image: PRODUCT_IMAGE_MAP[product.name] || productCake,
      });
      setFavorites((prev) => [...prev, product.name]);
      toast({ title: "Ditambahkan ke favorit ❤️" });
    }
  };

  return (
    <section id="produk" className="section-padding bg-background">
      <div className="container-custom">
        <div className="text-center mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Menu Kami
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mt-3 mb-6">
            Produk Unggulan
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Jelajahi koleksi roti dan kue terbaik kami yang dibuat dengan penuh cinta
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="bg-card rounded-2xl overflow-hidden shadow-card"
              >
                <Skeleton className="aspect-square w-full" />
                <div className="p-6 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-9 w-16" />
                  </div>
                </div>
              </div>
            ))
          ) : products.length > 0 ? (
            // Products list
            products.map((product, index) => {
              const isFav = favorites.includes(product.name);
              const productImage = PRODUCT_IMAGE_MAP[product.name] || productCake;
              return (
                <div
                  key={product.id}
                  className="group bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-500 hover:-translate-y-2"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Image Container */}
                  <div className="relative overflow-hidden aspect-square">
                    <img
                      src={productImage}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    {product.badge && (
                      <span
                        className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold ${
                          product.badge === "Bestseller"
                            ? "bg-primary text-primary-foreground"
                            : product.badge === "New"
                            ? "bg-accent text-accent-foreground"
                            : "bg-brown-warm text-primary-foreground"
                        }`}
                      >
                        {product.badge}
                      </span>
                    )}
                    <button
                      onClick={() => toggleFavorite(product)}
                      className="absolute top-4 right-4 w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform"
                      aria-label={isFav ? "Hapus dari favorit" : "Tambah ke favorit"}
                    >
                      <Heart
                        size={18}
                        className={isFav ? "fill-destructive text-destructive" : "text-muted-foreground"}
                      />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                      {product.name}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-display text-xl font-bold text-primary">
                        {formatPrice(product.price)}
                      </span>
                      <Button size="sm" className="gap-2">
                        <ShoppingBag size={16} />
                        Pesan
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            // No products
            <div className="col-span-full text-center py-8">
              <p className="text-muted-foreground">Tidak ada produk tersedia</p>
            </div>
          )}
        </div>

        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            Lihat Semua Menu
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProductsSection;
