import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-background min-h-screen">
            <nav className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex gap-2 items-center">
                        <span className="bg-primary text-primary-foreground font-black px-3 py-1 rounded-lg text-sm">ADMIN</span>
                        <span className="font-bold hidden sm:inline">Centro de Operaciones</span>
                    </div>
                    <div className="flex gap-1 md:gap-4">
                        <Link href="/admin/citas" className="text-sm font-bold bg-secondary hover:bg-secondary/60 text-secondary-foreground px-4 py-2 rounded-xl transition-colors">
                            📑 Aprobar Citas y Pagos
                        </Link>
                        <Link href="/admin/horarios" className="text-sm font-bold bg-secondary hover:bg-secondary/60 text-secondary-foreground px-4 py-2 rounded-xl transition-colors">
                            ⚙️ Horarios y Banco
                        </Link>
                        <a href="/" target="_blank" className="text-[10px] font-bold uppercase text-primary/70 hover:text-primary px-2 py-2 flex items-center">Ver Perfil Público ↗</a>
                    </div>
                </div>
            </nav>
            {children}
        </div>
    );
}
