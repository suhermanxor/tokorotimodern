import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import heroBakery from "@/assets/hero-bakery.jpg";

const HeroSection = () => {
  return (
    <section
      id="beranda"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroBakery}
          alt="Toko Roti Alia"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-hero-gradient opacity-80" />
      </div>

      {/* Content */}
      <div className="relative z-10 container-custom section-padding text-center">
        <div className="max-w-4xl mx-auto animate-fade-up">
          <span className="inline-block px-4 py-2 bg-primary-foreground/20 backdrop-blur-sm rounded-full text-primary-foreground text-sm font-medium mb-6">
            🍞 Roti Segar Setiap Hari
          </span>
          
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-tight mb-6">
            Nikmati Kelezatan
            <br />
            <span className="text-accent">Roti Artisan</span> Kami
          </h1>
          
          <p className="text-primary-foreground/90 text-lg sm:text-xl max-w-2xl mx-auto mb-10 font-body">
            Dibuat dengan cinta dan bahan-bahan premium pilihan. 
            Setiap gigitan adalah pengalaman rasa yang tak terlupakan.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="gold" size="xl">
              Lihat Menu Kami
            </Button>
            <Button variant="heroOutline" size="xl">
              Hubungi Kami
            </Button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
          <a href="#tentang" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
            <ChevronDown size={32} />
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
