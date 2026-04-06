import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-card py-12 mt-auto">
      <div className="container mx-auto max-w-7xl px-4 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center md:items-start">
          <span className="text-xl font-semibold text-foreground tracking-tight">
            Oficina <span className="text-primary">Psicológica</span>
          </span>
          <p className="text-muted-foreground text-sm mt-2 text-center md:text-left">
            Salud mental accesible, profesional y confidencial.
          </p>
          <div className="flex items-center gap-2 mt-4 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-800/50">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            Cumplimiento GDPR & Privacidad Asegurada
          </div>
        </div>
        
        <div className="flex flex-col items-center md:items-end text-sm text-muted-foreground space-y-2">
          <Link href="/servicios" className="hover:text-primary transition-colors">Catálogo de Servicios</Link>
          <a href="#" className="hover:text-primary transition-colors">Aviso de Privacidad</a>
          <a href="#" className="hover:text-primary transition-colors">Términos y Condiciones</a>
        </div>
      </div>
      <div className="container mx-auto max-w-7xl px-4 mt-8 pt-8 border-t border-border/40 text-center text-xs text-muted-foreground/70">
        &copy; {new Date().getFullYear()} Práctica Psicológica. Todos los derechos reservados.
      </div>
    </footer>
  );
}
