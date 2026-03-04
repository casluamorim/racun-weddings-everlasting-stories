import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Differentials from "@/components/landing/Differentials";
import Portfolio from "@/components/landing/Portfolio";
import Testimonials from "@/components/landing/Testimonials";
import Process from "@/components/landing/Process";
import Pricing from "@/components/landing/Pricing";
import ContactForm from "@/components/landing/ContactForm";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";
import FloatingWhatsApp from "@/components/landing/FloatingWhatsApp";

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://everbloom-storyteller.lovable.app",
  name: "Racun Weddings",
  description:
    "Filmes e fotografias de casamento cinematográficos para casais que querem reviver cada sentimento. Atendimento limitado e exclusivo.",
  url: "https://everbloom-storyteller.lovable.app",
  telephone: "+554732096098",
  email: "racunagencia@gmail.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Joinville",
    addressRegion: "SC",
    addressCountry: "BR",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: -26.3044,
    longitude: -48.8487,
  },
  image: "https://everbloom-storyteller.lovable.app/placeholder.svg",
  priceRange: "$$",
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "09:00",
    closes: "18:00",
  },
  sameAs: ["https://instagram.com/racunweddings"],
  areaServed: [
    { "@type": "City", name: "Joinville" },
    { "@type": "City", name: "Florianópolis" },
    { "@type": "City", name: "Curitiba" },
    { "@type": "State", name: "Santa Catarina" },
  ],
  knowsAbout: [
    "Fotografia de casamento",
    "Filmagem de casamento",
    "Ensaio pré-wedding",
    "Destination wedding",
  ],
};

const Index = () => (
  <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
    />
    <Navbar />
    <Hero />
    <Differentials />
    <Portfolio />
    <Testimonials />
    <Process />
    <Pricing />
    <ContactForm />
    <FAQ />
    <Footer />
    <FloatingWhatsApp />
  </>
);

export default Index;
