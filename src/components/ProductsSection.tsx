import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import productCroissant from "@/assets/product-croissant.jpg";
import productSourdough from "@/assets/product-sourdough.jpg";
import productCinnamon from "@/assets/product-cinnamon.jpg";
import productCake from "@/assets/product-cake.jpg";

const products = [
  {
    name: "Croissant Butter",
    description: "Croissant renyah dengan lapisan butter premium",
    price: "Rp 18.000",
    image: productCroissant,
    badge: "Bestseller",
  },
  {
    name: "Sourdough Classic",
    description: "Roti sourdough dengan tekstur lembut dan rasa khas",
    price: "Rp 35.000",
    image: productSourdough,
    badge: null,
  },
  {
    name: "Cinnamon Rolls",
    description: "Cinnamon rolls dengan cream cheese frosting",
    price: "Rp 22.000",
    image: productCinnamon,
    badge: "New",
  },
  {
    name: "Chocolate Cake",
    description: "Kue coklat premium dengan dark chocolate ganache",
    price: "Rp 180.000",
    image: productCake,
    badge: "Premium",
  },
];

const ProductsSection = () => {
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
          {products.map((product, index) => (
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
                  <span className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold ${
                    product.badge === "Bestseller" 
                      ? "bg-primary text-primary-foreground" 
                      : product.badge === "New" 
                      ? "bg-accent text-accent-foreground"
                      : "bg-brown-warm text-primary-foreground"
                  }`}>
                    {product.badge}
                  </span>
                )}
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
          ))}
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
