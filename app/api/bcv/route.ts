import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // API pública y confiable para las tasas en Venezuela
    const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
      next: { revalidate: 3600 } // Next.js cachea la tasa por 1 hora para no saturar al proveedor ni ralentizar tu app
    });
    
    if (!response.ok) throw new Error('Bank API Error');
    const data = await response.json();
    
    // Asumimos que data.promedio es donde expide la tasa
    return NextResponse.json({ bcv: parseFloat(data.promedio), source: 'dolarapi' }, { status: 200 });
  } catch (err: any) {
    console.error("BCV Fetch Error:", err);
    // Tasa Dolar Fallback de emergencia si el servidor externo colapsa
    return NextResponse.json({ bcv: 36.25, source: 'fallback', error: true }, { status: 200 });
  }
}
