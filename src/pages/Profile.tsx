import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Trash2, Heart, User, Phone, Loader2 } from "lucide-react";

type Profile = {
  full_name: string | null;
  phone: string | null;
};

type FavoriteOrder = {
  id: string;
  product_name: string;
  product_price: number;
  product_image: string | null;
  notes: string | null;
  created_at: string;
};

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile>({ full_name: "", phone: "" });
  const [favorites, setFavorites] = useState<FavoriteOrder[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchFavorites();
    }
  }, [user]);

  const fetchProfile = async () => {
    setLoadingProfile(true);
    const { data } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", user!.id)
      .single();
    if (data) setProfile({ full_name: data.full_name ?? "", phone: data.phone ?? "" });
    setLoadingProfile(false);
  };

  const fetchFavorites = async () => {
    const { data } = await supabase
      .from("favorite_orders")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    if (data) setFavorites(data);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: profile.full_name, phone: profile.phone })
      .eq("user_id", user!.id);
    setSaving(false);
    if (error) {
      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profil berhasil disimpan ✅" });
    }
  };

  const removeFavorite = async (id: string, name: string) => {
    await supabase.from("favorite_orders").delete().eq("id", id);
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    toast({ title: `${name} dihapus dari favorit` });
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);

  if (authLoading || loadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container-custom section-padding pt-8 sm:pt-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="font-display text-3xl font-bold text-foreground">Profil Saya</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Profile Form */}
          <div className="bg-card rounded-2xl shadow-card p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User size={24} className="text-primary" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">Data Diri</h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <form onSubmit={saveProfile} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nama Lengkap</Label>
                <Input
                  id="fullName"
                  value={profile.full_name ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                  placeholder="Nama lengkap Anda"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Nomor Telepon</Label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={profile.phone ?? ""}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="08xxxxxxxxxx"
                    className="pl-10"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full gap-2" disabled={saving}>
                <Save size={16} />
                {saving ? "Menyimpan..." : "Simpan Profil"}
              </Button>
            </form>
          </div>

          {/* Favorites */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Heart size={24} className="text-destructive" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">Produk Favorit</h2>
                <p className="text-sm text-muted-foreground">{favorites.length} produk tersimpan</p>
              </div>
            </div>

            {favorites.length === 0 ? (
              <div className="bg-card rounded-2xl shadow-card p-10 text-center">
                <Heart size={40} className="mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Belum ada produk favorit</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/#produk")}>
                  Jelajahi Produk
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {favorites.map((fav) => (
                  <div
                    key={fav.id}
                    className="bg-card rounded-2xl shadow-card overflow-hidden flex items-center gap-4 pr-4 hover:shadow-elevated transition-shadow"
                  >
                    {fav.product_image ? (
                      <img
                        src={fav.product_image}
                        alt={fav.product_name}
                        className="w-20 h-20 object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-muted flex items-center justify-center flex-shrink-0">
                        <ShoppingBagIcon />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 py-3">
                      <h3 className="font-display font-semibold text-foreground truncate">
                        {fav.product_name}
                      </h3>
                      <p className="text-primary font-semibold text-sm">{formatPrice(fav.product_price)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFavorite(fav.id, fav.product_name)}
                      className="text-muted-foreground hover:text-destructive flex-shrink-0"
                      aria-label="Hapus favorit"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ShoppingBagIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" x2="21" y1="6" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

export default Profile;
