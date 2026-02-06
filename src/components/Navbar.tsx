import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, LogIn, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();

  const navLinks = [
    { name: "Beranda", href: "#beranda" },
    { name: "Tentang", href: "#tentang" },
    { name: "Produk", href: "#produk" },
    { name: "Testimoni", href: "#testimoni" },
    { name: "Kontak", href: "#kontak" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md shadow-soft">
      <div className="container-custom section-padding !py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="#beranda" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-xl">A</span>
            </div>
            <span className="font-display text-xl font-semibold text-foreground">
              Toko Roti Alia
            </span>
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-muted-foreground hover:text-primary transition-colors duration-300 font-medium"
              >
                {link.name}
              </a>
            ))}
            {user ? (
              <div className="flex items-center gap-3">
                <a href="/profil" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                  <User size={16} />
                  {user.user_metadata?.full_name || user.email?.split("@")[0]}
                </a>
                <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
                  <LogOut size={16} />
                  Keluar
                </Button>
              </div>
            ) : (
              <a href="/auth">
                <Button variant="hero" size="lg" className="gap-2">
                  <LogIn size={18} />
                  Masuk
                </Button>
              </a>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isOpen && (
          <div className="md:hidden mt-4 pb-4 animate-fade-in">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-muted-foreground hover:text-primary transition-colors duration-300 font-medium py-2"
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              {user ? (
                <>
                  <span className="text-sm text-muted-foreground flex items-center gap-1 py-2">
                    <User size={16} />
                    {user.user_metadata?.full_name || user.email?.split("@")[0]}
                  </span>
                  <Button variant="outline" size="lg" onClick={signOut} className="gap-2 mt-2">
                    <LogOut size={16} />
                    Keluar
                  </Button>
                </>
              ) : (
                <a href="/auth">
                  <Button variant="hero" size="lg" className="gap-2 mt-2 w-full">
                    <LogIn size={18} />
                    Masuk
                  </Button>
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
