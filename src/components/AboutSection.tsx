import { Clock, Heart, Award, Leaf } from "lucide-react";

const features = [
  {
    icon: Heart,
    title: "Dibuat dengan Cinta",
    description: "Setiap roti kami buat dengan penuh kasih sayang dan dedikasi tinggi.",
  },
  {
    icon: Leaf,
    title: "Bahan Premium",
    description: "Hanya menggunakan bahan-bahan berkualitas tinggi dan segar.",
  },
  {
    icon: Clock,
    title: "Segar Setiap Hari",
    description: "Dipanggang setiap pagi untuk menjamin kesegaran maksimal.",
  },
  {
    icon: Award,
    title: "Resep Warisan",
    description: "Resep turun-temurun yang telah disempurnakan selama bertahun-tahun.",
  },
];

const AboutSection = () => {
  return (
    <section id="tentang" className="section-padding bg-secondary">
      <div className="container-custom">
        <div className="text-center mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Tentang Kami
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mt-3 mb-6">
            Cerita di Balik Setiap Roti
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Toko Roti Alia berdiri sejak 2010, menghadirkan roti dan kue berkualitas 
            dengan cita rasa autentik untuk keluarga Indonesia.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="bg-card rounded-2xl p-8 shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                <feature.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { number: "15+", label: "Tahun Pengalaman" },
            { number: "50+", label: "Varian Roti" },
            { number: "10K+", label: "Pelanggan Puas" },
            { number: "100%", label: "Bahan Alami" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-display text-4xl md:text-5xl font-bold text-primary mb-2">
                {stat.number}
              </div>
              <div className="text-muted-foreground font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
