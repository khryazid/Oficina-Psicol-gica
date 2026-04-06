import { HeroSection } from '@/components/sections/HeroSection';
import { ServicesSection } from '@/components/sections/ServicesSection';
import { BookingSection } from '@/components/sections/BookingSection';
import { FAQSection } from '@/components/sections/FAQSection';

export default function Home() {
  return (
    <main className="mx-auto flex max-w-[1440px] flex-col px-4 py-20 md:px-6">
      <div className="space-y-20">
        <HeroSection />
        <ServicesSection />
        <BookingSection />
        <FAQSection />
      </div>
    </main>
  );
}
