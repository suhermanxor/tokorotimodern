import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Wijaya",
    role: "Pelanggan Setia",
    content: "Rotinya selalu segar dan enak! Croissant di sini adalah yang terbaik yang pernah saya coba. Sudah langganan 3 tahun!",
    rating: 5,
    avatar: "S",
  },
  {
    name: "Budi Santoso",
    role: "Food Blogger",
    content: "Kualitas bakery yang luar biasa. Bahan premium terasa di setiap gigitan. Highly recommended untuk pecinta roti artisan!",
    rating: 5,
    avatar: "B",
  },
  {
    name: "Dina Pratiwi",
    role: "Ibu Rumah Tangga",
    content: "Anak-anak sangat suka dengan roti di sini. Teksturnya lembut dan tidak menggunakan bahan pengawet. Aman untuk keluarga!",
    rating: 5,
    avatar: "D",
  },
];

const TestimonialsSection = () => {
  return (
    <section id="testimoni" className="section-padding bg-secondary">
      <div className="container-custom">
        <div className="text-center mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Testimoni
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mt-3 mb-6">
            Apa Kata Mereka?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Dengarkan pengalaman pelanggan setia kami
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className="bg-card rounded-2xl p-8 shadow-card hover:shadow-elevated transition-all duration-300 relative group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Quote Icon */}
              <div className="absolute top-6 right-6 text-primary/10 group-hover:text-primary/20 transition-colors">
                <Quote size={48} />
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-6">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} size={20} className="text-accent fill-accent" />
                ))}
              </div>

              {/* Content */}
              <p className="text-foreground mb-8 relative z-10">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-display font-bold text-lg">
                    {testimonial.avatar}
                  </span>
                </div>
                <div>
                  <h4 className="font-display font-semibold text-foreground">
                    {testimonial.name}
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
