import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-semibold text-foreground tracking-tight">
            Oficina <span className="text-primary">Psicológica</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
          <Link href="/servicios" className="text-muted-foreground hover:text-primary transition-colors">Servicios</Link>
          <Link href="/#sobre-mi" className="text-muted-foreground hover:text-primary transition-colors">Sobre Mí</Link>
        </nav>
        <div className="flex items-center justify-end">
          <Link href="/#reserva">
            <Button size="sm">Reservar Sesión</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
