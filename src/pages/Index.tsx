import { Helmet } from "react-helmet-async";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Services from "@/components/landing/Services";
import Portfolio from "@/components/landing/Portfolio";
import Testimonials from "@/components/landing/Testimonials";
import Process from "@/components/landing/Process";
import Pricing from "@/components/landing/Pricing";
import ContactForm from "@/components/landing/ContactForm";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";
import FloatingWhatsApp from "@/components/landing/FloatingWhatsApp";

const SITE_URL = "https://weddings.agenciaracun.com";

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": SITE_URL,
  name: "Racun Weddings",
  description:
    "Filmes e fotografias de casamento cinematográficos para casais que querem reviver cada sentimento. Atendimento limitado e exclusivo.",
  url: SITE_URL,
  telephone: "+554732096098",
  email: "racunagencia@gmail.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Blumenau",
    addressRegion: "SC",
    addressCountry: "BR",
  },
  geo: { "@type": "GeoCoordinates", latitude: -26.9194, longitude: -49.0661 },
  image: `${SITE_URL}/og-image.jpg`,
  priceRange: "$$",
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "09:00",
    closes: "18:00",
  },
  sameAs: ["https://instagram.com/racunweddings"],
  areaServed: [
    { "@type": "City", name: "Blumenau" },
    { "@type": "City", name: "Florianópolis" },
    { "@type": "City", name: "Joinville" },
    { "@type": "City", name: "Balneário Camboriú" },
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
    <Helmet>
      <title>Racun Weddings — Fotografia e Filme de Casamento Cinematográfico em SC</title>
      <meta name="description" content="Filmes e fotografias de casamento cinematográficos em Blumenau, Florianópolis, Joinville e Balneário Camboriú. Atendimento limitado e exclusivo." />
      <link rel="canonical" href={`${SITE_URL}/`} />
      <meta property="og:url" content={`${SITE_URL}/`} />
      <script type="application/ld+json">{JSON.stringify(localBusinessJsonLd)}</script>
    </Helmet>
    <Navbar />
    <Hero />
    <Services />
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
