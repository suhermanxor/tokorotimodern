import { Instagram, Facebook, MessageCircle, MapPin } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background">
      <div className="container-custom section-padding !pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-display font-bold text-xl">A</span>
              </div>
              <span className="font-display text-xl font-semibold">
                Toko Roti Alia
              </span>
            </div>
            <p className="text-background/70 mb-6">
              Menghadirkan roti artisan berkualitas premium untuk keluarga Indonesia sejak 2010.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary transition-colors"
                aria-label="WhatsApp"
              >
                <MessageCircle size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display text-lg font-semibold mb-6">
              Menu Cepat
            </h4>
            <ul className="space-y-3">
              {["Beranda", "Tentang Kami", "Produk", "Testimoni", "Kontak"].map((link) => (
                <li key={link}>
                  <a
                    href={`#${link.toLowerCase().replace(" ", "")}`}
                    className="text-background/70 hover:text-primary transition-colors"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Products */}
          <div>
            <h4 className="font-display text-lg font-semibold mb-6">
              Produk Populer
            </h4>
            <ul className="space-y-3">
              {["Croissant", "Sourdough", "Cinnamon Rolls", "Chocolate Cake", "Roti Tawar"].map((product) => (
                <li key={product}>
                  <a
                    href="#produk"
                    className="text-background/70 hover:text-primary transition-colors"
                  >
                    {product}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Location */}
          <div>
            <h4 className="font-display text-lg font-semibold mb-6">
              Lokasi
            </h4>
            <div className="flex gap-3 mb-4">
              <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
              <p className="text-background/70">
                Jl. Raya Bakery No. 123,<br />
                Jakarta Selatan 12345
              </p>
            </div>
            <p className="text-background/70 text-sm">
              <strong className="text-background">Jam Buka:</strong><br />
              Senin - Minggu<br />
              07.00 - 21.00 WIB
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-background/10 text-center">
          <p className="text-background/60 text-sm">
            © {currentYear} Toko Roti Alia. Semua hak dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
