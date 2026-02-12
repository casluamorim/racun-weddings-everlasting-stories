import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Differentials from "@/components/landing/Differentials";
import Portfolio from "@/components/landing/Portfolio";
import Testimonials from "@/components/landing/Testimonials";
import Process from "@/components/landing/Process";
import Pricing from "@/components/landing/Pricing";
import ContactForm from "@/components/landing/ContactForm";
import Footer from "@/components/landing/Footer";
import FloatingWhatsApp from "@/components/landing/FloatingWhatsApp";

const Index = () => (
  <>
    <Navbar />
    <Hero />
    <Differentials />
    <Portfolio />
    <Testimonials />
    <Process />
    <Pricing />
    <ContactForm />
    <Footer />
    <FloatingWhatsApp />
  </>
);

export default Index;
