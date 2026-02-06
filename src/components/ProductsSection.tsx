import { Button } from "@/components/ui/button";
import { ShoppingBag, Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import productCroissant from "@/assets/product-croissant.jpg";
import productSourdough from "@/assets/product-sourdough.jpg";
import productCinnamon from "@/assets/product-cinnamon.jpg";
import productCake from "@/assets/product-cake.jpg";

const products = [
  {
    name: "Croissant Butter",
    description: "Croissant renyah dengan lapisan butter premium",
    price: "Rp 18.000",
    priceNum: 18000,
    image: productCroissant,
    badge: "Bestseller",
  },
  {
    name: "Sourdough Classic",
    description: "Roti sourdough dengan tekstur lembut dan rasa khas",
    price: "Rp 35.000",
    priceNum: 35000,
    image: productSourdough,
    badge: null,
  },
  {
    name: "Cinnamon Rolls",
    description: "Cinnamon rolls dengan cream cheese frosting",
    price: "Rp 22.000",
    priceNum: 22000,
    image: productCinnamon,
    badge: "New",
  },
  {
    name: "Chocolate Cake",
    description: "Kue coklat premium dengan dark chocolate ganache",
    price: "Rp 180.000",
    priceNum: 180000,
    image: productCake,
    badge: "Premium",
  },
];

const ProductsSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (user) fetchFavorites();
    else setFavorites([]);
  }, [user]);

  const fetchFavorites = async () => {
    const { data } = await supabase
      .from("favorite_orders")
      .select("product_name")
      .eq("user_id", user!.id);
    if (data) setFavorites(data.map((f) => f.product_name));
  };

  const toggleFavorite = async (product: typeof products[0]) => {
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
        product_price: product.priceNum,
        product_image: product.image,
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
          {products.map((product, index) => {
            const isFav = favorites.includes(product.name);
            return (
              <div
                key={product.name}
                className="group bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-500 hover:-translate-y-2"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Image Container */}
                <div className="relative overflow-hidden aspect-square">
                  <img
                    src={product.image}
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
                      {product.price}
                    </span>
                    <Button size="sm" className="gap-2">
                      <ShoppingBag size={16} />
                      Pesan
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
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
