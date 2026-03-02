import AnimatedSection from "./AnimatedSection";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Quanto tempo antes do casamento devo contratar o fotógrafo?",
    answer:
      "Recomendamos fechar o contrato com pelo menos 6 a 12 meses de antecedência. Datas populares (maio, outubro, dezembro) esgotam rápido, então quanto antes, melhor para garantir sua data.",
  },
  {
    question: "Como funciona a entrega das fotos e vídeos?",
    answer:
      "As fotos editadas são entregues em galeria online privada em até 30 dias úteis. Os vídeos (teaser e filme completo) são entregues em até 60 dias úteis. Tudo em alta resolução, pronto para impressão e redes sociais.",
  },
  {
    question: "Vocês atendem fora da cidade?",
    answer:
      "Sim! Atendemos casamentos em todo o Brasil e também destination weddings no exterior. Deslocamentos fora da Grande São Paulo possuem custos adicionais de transporte e hospedagem, que são informados no orçamento.",
  },
  {
    question: "Quantas fotos serão entregues?",
    answer:
      "A quantidade varia conforme o pacote e a duração do evento, mas em média entregamos entre 400 e 800 fotos editadas. Priorizamos qualidade e momentos genuínos — cada clique tem intenção.",
  },
  {
    question: "Posso personalizar meu pacote?",
    answer:
      "Com certeza! Nossos pacotes servem como ponto de partida. Podemos adicionar horas extras, ensaio pré-wedding, álbum impresso, cobertura de making-of e muito mais. Monte o pacote ideal para o seu grande dia.",
  },
  {
    question: "Qual é a forma de pagamento?",
    answer:
      "Oferecemos pagamento via PIX, transferência bancária ou cartão de crédito em até 12x. A reserva da data é confirmada com um sinal de 30%, e o restante pode ser parcelado até a data do evento.",
  },
  {
    question: "E se chover no dia do casamento?",
    answer:
      "Chuva nunca é problema! Temos experiência em criar fotos incríveis em qualquer condição climática. Inclusive, casamentos com chuva costumam render imagens ainda mais emocionantes e únicas.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

const FAQ = () => (
  <section className="py-20 md:py-28 bg-background">
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
    />
    <div className="container max-w-3xl mx-auto px-4">
      <AnimatedSection>
        <h2 className="font-display text-3xl md:text-4xl text-foreground text-center mb-3">
          Perguntas Frequentes
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          Tire suas dúvidas sobre nossos serviços de fotografia e vídeo de casamento.
        </p>
      </AnimatedSection>

      <AnimatedSection delay={0.15}>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-border">
              <AccordionTrigger className="text-left text-foreground hover:no-underline hover:text-primary">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </AnimatedSection>
    </div>
  </section>
);

export default FAQ;
