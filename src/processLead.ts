import { supabase } from './supabaseClient';

// Simulador de Cobertura externa (No modificar)
export async function checkCoverageService(_district: string, _address: string): Promise<any> {
  // En este simulador, para fines de prueba del bug, este servicio retorna null
  // simulando un fallo de red o una zona sin cobertura explícita.
  return null;
}

/**
 * INSTRUCCIONES PARA EL POSTULANTE:
 * 
 * 1. Corrige los bugs de lógica y de base de datos para evitar que se sobrescriban
 *    coberturas previas válidas (como 'contraentrega' de Juan Pérez) al ocurrir fallos.
 * 
 * 2. Tipa de forma estricta todos los parámetros, retornos e interfaces.
 *    REGLA: Queda estrictamente PROHIBIDO usar los tipos 'any' o 'unknown'.
 * 
 * Modifica la función a continuación para resolver el caso técnico.
 */
export async function processShopifyLead(lead: any): Promise<void> {
  try {
    // 1. Guardar o actualizar datos básicos del Lead
    const { error: fetchError } = await supabase
      .from('leads')
      .upsert({
        id: lead.id,
        customer_name: lead.name,
        phone: lead.phone,
        address: lead.address,
        shipping_mode: lead.shippingMode || 'contraentrega',
      })
      .select()
      .single();

    if (fetchError) throw fetchError;

    // 2. Validar cobertura geográfica con servicio externo
    const coverageResult = await checkCoverageService(lead.district, lead.address);

    if (coverageResult && coverageResult.hasCoverage) {
      await supabase
        .from('leads')
        .update({
          shipping_mode: coverageResult.shippingMode, 
          validated_location: coverageResult.location,
        })
        .eq('id', lead.id);
    } else {
      // Fallback a agencia cuando no hay cobertura explícita
      await supabase
        .from('leads')
        .update({
          shipping_mode: 'agencia',
        })
        .eq('id', lead.id);
    }
  } catch (err: any) {
    console.log("Error processing lead", err.message);
  }
}
