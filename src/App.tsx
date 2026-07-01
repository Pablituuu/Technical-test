import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Code2,
  Play,
  RotateCcw,
  Database,
  Terminal,
  FileText,
  Sun,
  Moon,
  Info,
  AlertTriangle,
  ArrowUpNarrowWide,
  Download,
  Brain,
  Truck,
  Building2,
  ShoppingBag,
  HelpCircle,
  Globe,
  Activity,
  Settings,
  User,
  Search,
  Filter
} from "lucide-react";
import { dbStore } from "./dbStore";
import type { Lead, LogEntry } from "./dbStore";
import { processShopifyLead } from "./processLead";
import "./App.css";

interface Priorities {
  A: string;
  B: string;
  C: string;
  D: string;
}

interface CaseItem {
  id: "A" | "B" | "C" | "D";
  badge: string;
  client: string;
  title: string;
  body: string;
}

const CASES_DATA: CaseItem[] = [
  {
    id: "A",
    badge: "Caso A",
    client: "CalzadoExpress (VIP • 500 Pedidos/Día)",
    title: "Bloqueo de Pedidos Shopify",
    body: "Hola, detectamos que desde las 8:00 AM no están entrando los pedidos de Shopify a nuestro dashboard de envíos. Los clientes ya pagaron pero no vemos nada en el sistema. ¡Ayuda urgente!"
  },
  {
    id: "D",
    badge: "Caso D",
    client: "Accesorios Tech (Standard • 15 Pedidos/Día)",
    title: "Bucle de Carga Infinito en Login",
    body: "Hola, no puedo acceder a mi cuenta. Pongo mi correo y contraseña y se queda cargando con un círculo infinito en la pantalla de login. Necesito entrar para despachar mis pedidos de hoy."
  },
  {
    id: "C",
    badge: "Caso C",
    client: "HogarModerno (VIP • 200 Pedidos/Día)",
    title: "Cobro Erróneo en Pedido lead_99342",
    body: "Hola, un cliente me dice que vive en una zona con cobertura para 'Contraentrega' (Delivery Propio) pero el sistema le asignó automáticamente 'Agencia Shalom' (Envío por encomienda), cobrándole de más. El ID del lead en el sistema es lead_99342."
  },
  {
    id: "B",
    badge: "Caso B",
    client: "Boutique Flores (Standard • 10 Pedidos/Día)",
    title: "Typo de Ortografía en Coberturas",
    body: "Hola, en el panel de coberturas de distritos hay una falta de ortografía. Dice 'Miraflores' pero abajo en la lista dice 'Miraflores - Agencia Shalom' sin la 'S' al final. Por favor corregir."
  }
];


export interface SqlResult {
  columns: string[];
  rows: Record<string, string | number | null>[];
  message?: string;
  updatedLeads?: typeof SQL_MOCK_LEADS;
}

const SQL_MOCK_LEADS = [
  { id: "lead_99342", customer_name: "Juan Perez", phone: "+51 987654321", address: "Av. Larco 123", district: "Miraflores", shipping_mode: "contraentrega", status: "entregado", price: 150, deleted_at: null as string | null },
  { id: "lead_55123", customer_name: "Ana Rodriguez", phone: "+51 912345678", address: "Calle Falsa 456", district: "Chorrillos", shipping_mode: "agencia", status: "pendiente", price: 95, deleted_at: null as string | null },
  { id: "lead_88291", customer_name: "Carlos Mendoza", phone: "+51 999888777", address: "Av. Aviacion 1450", district: "San Borja", shipping_mode: "agencia", status: "archivado", price: 350, deleted_at: "2026-07-01 10:00:00" as string | null },
  { id: "lead_44212", customer_name: "Maria Silva", phone: "+51 922334455", address: "Jr. Carabaya 550", district: "Lima", shipping_mode: "contraentrega", status: "entregado", price: 120, deleted_at: null as string | null },
  { id: "lead_11029", customer_name: "Luis Torres", phone: "+51 933445566", address: "Av. Arequipa 2210", district: "San Isidro", shipping_mode: "contraentrega", status: "pendiente", price: 210, deleted_at: null as string | null },
  { id: "lead_33019", customer_name: "Jorge Rivas", phone: "+51 944556677", address: "Av. San Luis 980", district: "San Borja", shipping_mode: "contraentrega", status: "archivado", price: 80, deleted_at: null as string | null },
  { id: "lead_77102", customer_name: "Sofia Castro", phone: "+51 955667788", address: "Calle Las Begonias 320", district: "San Isidro", shipping_mode: "agencia", status: "pendiente", price: 150, deleted_at: null as string | null }
];

function executeSqlSandbox(sql: string, currentLeads: typeof SQL_MOCK_LEADS): SqlResult {
  const query = sql.trim().replace(/;$/, "");
  
  if (/^\s*update\s+/i.test(query)) {
    const updateRegex = /^\s*update\s+(\w+)\s+set\s+(\w+)\s*=\s*(null|'.*?'|".*?"|\d+)(?:\s+where\s+(.+?))?\s*$/i;
    const match = query.match(updateRegex);
    if (!match) {
      throw new Error("Syntax Error: Estructura de UPDATE no soportada. Usa el formato 'UPDATE leads SET columna = valor WHERE condición'");
    }
    
    const table = match[1].toLowerCase();
    const column = match[2].toLowerCase();
    let valStr = match[3].trim();
    const whereClause = match[4] ? match[4].trim() : null;
    
    if (table !== "leads") {
      throw new Error(`RelationError: La relación "${table}" no existe. ¿Quisiste decir "leads"?`);
    }
    
    if (!["id", "customer_name", "phone", "address", "district", "shipping_mode", "status", "price", "deleted_at"].includes(column)) {
      throw new Error(`ColumnError: La columna "${column}" no existe en la tabla "leads".`);
    }
    
    let targetVal: string | number | null = null;
    if (valStr.toLowerCase() === "null") {
      targetVal = null;
    } else if ((valStr.startsWith("'") && valStr.endsWith("'")) || (valStr.startsWith('"') && valStr.endsWith('"'))) {
      targetVal = valStr.substring(1, valStr.length - 1);
    } else {
      targetVal = isNaN(Number(valStr)) ? valStr : Number(valStr);
    }
    
    let updatedCount = 0;
    const nextLeads = currentLeads.map(item => {
      let matches = true;
      if (whereClause) {
        const conditions = whereClause.split(/\band\b/i);
        for (let cond of conditions) {
          cond = cond.trim();
          const condRegex = /(\w+)\s*(!=|<>|<=|>=|=|<|>|like)/i;
          const condMatch = cond.match(condRegex);
          if (!condMatch) {
            throw new Error(`Syntax Error: No se pudo interpretar la condición "${cond}"`);
          }
          const field = condMatch[1].trim().toLowerCase();
          const op = condMatch[2].trim().toLowerCase();
          const valueStartIndex = cond.indexOf(condMatch[2]) + condMatch[2].length;
          let val = cond.substring(valueStartIndex).trim();
          
          if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
            val = val.substring(1, val.length - 1);
          }
          
          const itemVal = item[field as keyof typeof item];
          if (itemVal === undefined) {
            throw new Error(`ColumnError: La columna "${field}" no existe.`);
          }
          
          const compareVal = isNaN(Number(val)) ? val : Number(val);
          const cellVal = isNaN(Number(itemVal)) ? itemVal : Number(itemVal);
          
          let condPassed = false;
          switch (op) {
            case "=":
              condPassed = String(cellVal).toLowerCase() === String(compareVal).toLowerCase();
              break;
            case "!=":
            case "<>":
              condPassed = String(cellVal).toLowerCase() !== String(compareVal).toLowerCase();
              break;
            case "<":
              condPassed = Number(cellVal) < Number(compareVal);
              break;
            case ">":
              condPassed = Number(cellVal) > Number(compareVal);
              break;
            case "<=":
              condPassed = Number(cellVal) <= Number(compareVal);
              break;
            case ">=":
              condPassed = Number(cellVal) >= Number(compareVal);
              break;
            case "like":
              const regexStr = String(compareVal).replace(/%/g, ".*");
              const regex = new RegExp(`^${regexStr}$`, "i");
              condPassed = regex.test(String(cellVal));
              break;
          }
          if (!condPassed) {
            matches = false;
            break;
          }
        }
      }
      if (matches) {
        updatedCount++;
        return { ...item, [column]: targetVal };
      }
      return item;
    });
    
    return {
      columns: [],
      rows: [],
      message: `UPDATE ${updatedCount}. Consulta ejecutada con éxito. ${updatedCount} fila(s) modificada(s).`,
      updatedLeads: nextLeads
    };
  }
  
  if (!/^\s*select\s+/i.test(query)) {
    throw new Error("Syntax Error: Solo se permiten consultas SELECT u UPDATE sobre la tabla 'leads'.");
  }
  
  const fromMatch = query.match(/\bfrom\s+(\w+)/i);
  if (!fromMatch) {
    throw new Error("Syntax Error: Falta la cláusula FROM o la sintaxis es incorrecta.");
  }
  
  const table = fromMatch[1].toLowerCase();
  if (table !== "leads") {
    throw new Error(`RelationError: La relación "${table}" no existe. ¿Quisiste decir "leads"?`);
  }
  
  let result = [...currentLeads];
  
  // WHERE parsing
  const whereMatch = query.match(/\bwhere\s+(.+?)(?:\border\s+by|\blimit|$)/i);
  if (whereMatch) {
    const whereClause = whereMatch[1].trim();
    const conditions = whereClause.split(/\band\b/i);
    
    for (let cond of conditions) {
      cond = cond.trim();
      const condRegex = /(\w+)\s*(!=|<>|<=|>=|=|<|>|like)/i;
      const condMatch = cond.match(condRegex);
      if (!condMatch) {
        throw new Error(`Syntax Error: No se pudo interpretar la condición "${cond}"`);
      }
      
      const field = condMatch[1].trim().toLowerCase();
      const op = condMatch[2].trim().toLowerCase();
      
      const valueStartIndex = cond.indexOf(condMatch[2]) + condMatch[2].length;
      let val = cond.substring(valueStartIndex).trim();
      
      if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
        val = val.substring(1, val.length - 1);
      }
      
      result = result.filter(item => {
        const itemVal = item[field as keyof typeof item];
        if (itemVal === undefined) {
          throw new Error(`ColumnError: La columna "${field}" no existe en la tabla "leads".`);
        }
        
        const compareVal = isNaN(Number(val)) ? val : Number(val);
        const cellVal = isNaN(Number(itemVal)) ? itemVal : Number(itemVal);
        
        switch (op) {
          case "=":
            return String(cellVal).toLowerCase() === String(compareVal).toLowerCase();
          case "!=":
          case "<>":
            return String(cellVal).toLowerCase() !== String(compareVal).toLowerCase();
          case "<":
            return Number(cellVal) < Number(compareVal);
          case ">":
            return Number(cellVal) > Number(compareVal);
          case "<=":
            return Number(cellVal) <= Number(compareVal);
          case ">=":
            return Number(cellVal) >= Number(compareVal);
          case "like":
            const regexStr = String(compareVal).replace(/%/g, ".*");
            const regex = new RegExp(`^${regexStr}$`, "i");
            return regex.test(String(cellVal));
          default:
            return false;
        }
      });
    }
  }
  
  // ORDER BY parsing
  const orderMatch = query.match(/\border\s+by\s+(.+?)(?:\blimit|$)/i);
  if (orderMatch) {
    const orderBy = orderMatch[1].trim();
    const parts = orderBy.split(/\s+/);
    const orderField = parts[0].toLowerCase();
    const direction = parts[1] ? parts[1].toLowerCase() : "asc";
    
    result.sort((a, b) => {
      let valA = a[orderField as keyof typeof a];
      let valB = b[orderField as keyof typeof b];
      
      if (valA === undefined || valB === undefined) {
        throw new Error(`ColumnError: La columna "${orderField}" no existe en la tabla "leads".`);
      }
      
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      
      if (valA < valB) return direction === "desc" ? 1 : -1;
      if (valA > valB) return direction === "desc" ? -1 : 1;
      return 0;
    });
  }
  
  // LIMIT parsing
  const limitMatch = query.match(/\blimit\s+(\d+)/i);
  if (limitMatch) {
    const limitVal = parseInt(limitMatch[1], 10);
    result = result.slice(0, limitVal);
  }
  
  // Column Selection parsing
  const selectMatch = query.match(/^\s*select\s+(.+?)\s+from/i);
  if (!selectMatch) {
    throw new Error("Syntax Error: Error en la estructura SELECT.");
  }
  
  const selectFields = selectMatch[1].trim();
  let finalColumns: string[] = [];
  
  if (selectFields === "*") {
    finalColumns = Object.keys(currentLeads[0]);
  } else {
    finalColumns = selectFields.split(",").map(f => f.trim().toLowerCase());
    for (const col of finalColumns) {
      if (!Object.keys(currentLeads[0]).includes(col)) {
        throw new Error(`ColumnError: La columna "${col}" no existe en la tabla "leads".`);
      }
    }
  }
  
  const finalRows = result.map(item => {
    const rowObj: Record<string, string | number | null> = {};
    for (const col of finalColumns) {
      rowObj[col] = item[col as keyof typeof item] ?? null;
    }
    return rowObj;
  });
  
  return { columns: finalColumns, rows: finalRows };
}

function App() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [activeTab, setActiveTab] = useState<"support" | "code" | "sql">("support");

  // Tab 1: Support states
  const [priorities, setPriorities] = useState<Priorities>({
    A: "",
    B: "",
    C: "",
    D: "",
  });
  const [sortMode, setSortMode] = useState<"original" | "priority">("original");

  // Tab 2: Code simulator states
  const [leads, setLeads] = useState<Lead[]>(dbStore.getLeads());
  const [logs, setLogs] = useState<LogEntry[]>(dbStore.getLogs());
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [flashingRowId, setFlashingRowId] = useState<string | null>(null);
  const [flashType, setFlashType] = useState<"green" | "red" | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("lead_99342");

  // Tab 3: SQL Sandbox states
  const [sqlLeads, setSqlLeads] = useState(SQL_MOCK_LEADS);
  const [sqlQuery, setSqlQuery] = useState<string>("SELECT * FROM leads LIMIT 5;");
  const [sqlResults, setSqlResults] = useState<SqlResult | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [sqlSuccess, setSqlSuccess] = useState<boolean>(false);

  // Sync leads and logs from dbStore
  useEffect(() => {
    const unsubscribe = dbStore.subscribe(() => {
      setLeads(dbStore.getLeads());
      setLogs(dbStore.getLogs());
    });

    dbStore.onFlash = (id: string, type: "green" | "red") => {
      setFlashingRowId(id);
      setFlashType(type);
      setTimeout(() => {
        setFlashingRowId(null);
        setFlashType(null);
      }, 2000);
    };

    return unsubscribe;
  }, []);

  // Toggle theme class on body
  useEffect(() => {
    const body = document.body;
    if (theme === "light") {
      body.classList.add("light-theme");
    } else {
      body.classList.remove("light-theme");
    }
  }, [theme]);

  const resetSimulator = () => {
    dbStore.reset();
  };

  const runCodeSimulation = async () => {
    if (isRunning) return;
    setIsRunning(true);
    dbStore.addLog("Iniciando ejecución de processShopifyLead...", "info");

    // Lead payload sent from Shopify webhook
    const leadPayload = {
      id: "lead_99342",
      name: "Juan Perez",
      phone: "+51 987654321",
      address: "Av. Larco 123",
      district: "Miraflores",
      shippingMode: "contraentrega" as const,
    };

    dbStore.addLog(
      `Shopify Webhook recibido para el lead: ${leadPayload.id}`,
      "info",
    );

    try {
      // Execute the function that the candidate is editing in processLead.ts
      await processShopifyLead(leadPayload);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Error desconocido";
      dbStore.addLog(
        `[Excepción Runtime] El código falló durante la ejecución: ${errMsg}`,
        "error",
      );
    }

    setIsRunning(false);
  };

  const getPriorityWeight = (val: string) => {
    switch (val) {
      case "P1": return 1;
      case "P2": return 2;
      case "P3": return 3;
      case "P4": return 4;
      default: return 5;
    }
  };

  const getSortedCases = () => {
    if (sortMode === "original") {
      return CASES_DATA;
    }
    return [...CASES_DATA].sort((a, b) => {
      const weightA = getPriorityWeight(priorities[a.id]);
      const weightB = getPriorityWeight(priorities[b.id]);
      return weightA - weightB;
    });
  };

  // Validate state of query execution
  useEffect(() => {
    const targetLead = sqlLeads.find(l => l.id === "lead_88291");
    if (targetLead && targetLead.deleted_at === null) {
      setSqlSuccess(true);
    } else {
      setSqlSuccess(false);
    }
  }, [sqlLeads]);

  const handleExecuteSql = () => {
    try {
      setSqlError(null);
      const results = executeSqlSandbox(sqlQuery, sqlLeads);
      setSqlResults(results);
      if (results.updatedLeads) {
        setSqlLeads(results.updatedLeads);
      }
    } catch (err) {
      setSqlResults(null);
      const errMsg = err instanceof Error ? err.message : String(err);
      setSqlError(errMsg);
    }
  };

  const downloadReport = () => {
    const reportContent = `=====================================================
REPORTE DE RESPUESTAS - EVALUACIÓN TÉCNICA
=====================================================
Fecha: ${new Date().toLocaleString()}
Candidato: Evaluado en entorno local

RESPUESTAS DE PRIORIZACIÓN ASIGNADAS POR EL CANDIDATO (CASO 1):
-----------------------------------------------------
Caso A (CalzadoExpress - VIP • 500 Pedidos/Día):
- Prioridad seleccionada: ${priorities.A || "No seleccionada"}

Caso B (Boutique Flores - Standard • 10 Pedidos/Día):
- Prioridad seleccionada: ${priorities.B || "No seleccionada"}

Caso C (HogarModerno - VIP • 200 Pedidos/Día):
- Prioridad seleccionada: ${priorities.C || "No seleccionada"}

Caso D (Accesorios Tech - Standard • 15 Pedidos/Día):
- Prioridad seleccionada: ${priorities.D || "No seleccionada"}

=====================================================
CASO 3: AUDITORÍA Y ANÁLISIS SQL (SUPABASE)
=====================================================
¿Caso SQL resuelto exitosamente?: ${sqlSuccess ? "SÍ" : "NO / Incompleto"}
=====================================================
`;

    const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "reporte_respuestas_candidato.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container">
      {/* Brand & Theme Toggle */}
      <header className="header-container">
        <div className="brand-section">
          <h1>Evaluación Técnica: Soporte & Desarrollo</h1>
          <p>
            Entorno local de evaluación para candidatos. Completa los casos
            prácticos y descarga tu reporte.
          </p>
        </div>
        <button
          className="theme-toggle-btn"
          onClick={() =>
            setTheme((prev) => (prev === "dark" ? "light" : "dark"))
          }
        >
          {theme === "dark" ? (
            <>
              <Sun size={16} className="text-warning" />
              <span>Modo Claro</span>
            </>
          ) : (
            <>
              <Moon size={16} className="text-primary" />
              <span>Modo Oscuro</span>
            </>
          )}
        </button>
      </header>

      {/* Main Grid */}
      <div className="simulator-layout">
        {/* Navigation Sidebar */}
        <aside className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === "support" ? "active" : ""}`}
            onClick={() => setActiveTab("support")}
          >
            <ShieldAlert size={18} />
            <span>Criterio & Soporte</span>
          </button>

          <button
            className={`nav-item ${activeTab === "code" ? "active" : ""}`}
            onClick={() => setActiveTab("code")}
          >
            <Code2 size={18} />
            <span>Simulador de Código</span>
          </button>

          <button
            className={`nav-item ${activeTab === "sql" ? "active" : ""}`}
            onClick={() => setActiveTab("sql")}
          >
            <Database size={18} />
            <span>Consola SQL</span>
          </button>

          <div
            className="simulation-notes"
            style={{
              marginTop: "auto",
              border: "none",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Área de Evaluación de Candidatos
            </span>
          </div>
        </aside>

        {/* Screen Area */}
        <main className="screen-container">
          {/* TAB 1: SUPPORT AND CRITERIA */}
          {activeTab === "support" && (
            <div className="support-screen">
              <div className="screen-title-area">
                <h2>Caso 1: Criterio de Priorización y Comunicación de Negocio</h2>
                <p>
                  Analiza el impacto comercial de los siguientes 4 incidentes recibidos en paralelo, establece sus prioridades (P1 a P4) y redacta la comunicación adecuada basada en el contexto de negocio.
                </p>
              </div>

              {/* Módulo de Contexto de Negocio (ai-commerce-flows) */}
              <div className="business-context-card">
                <div className="context-header">
                  <Brain size={20} className="text-accent" />
                  <span>Introducción al Negocio: Flujo de Operaciones E-commerce</span>
                </div>
                
                <div className="context-intro-text">
                  Para realizar un triage efectivo, un Ingeniero de Soporte debe comprender la cadena de valor y el impacto comercial del software. A continuación se detalla cómo opera la plataforma:
                </div>

                <div className="context-sections-grid">
                  <div className="context-section-item">
                    <div className="section-item-title">
                      <ShoppingBag size={16} className="text-accent" />
                      <h4>¿Qué es un Lead en la plataforma?</h4>
                    </div>
                    <p>
                      Un <strong>lead</strong> representa un pedido o registro de compra iniciado por un comprador final en tiendas online de nuestros afiliados (ej. Shopify). Contiene la información de contacto, dirección física y el modo de despacho deseado por el cliente.
                    </p>
                  </div>

                  <div className="context-section-item">
                    <div className="section-item-title">
                      <Truck size={16} className="text-accent" />
                      <h4>¿Qué hace el software "ai-commerce-flows"?</h4>
                    </div>
                    <p>
                      Actúa como un <strong>orquestador logístico en tiempo real</strong>. Cuando se genera una venta, Shopify nos envía un Webhook. Nuestro sistema procesa ese payload, valida con coordenadas de geolocalización si la dirección califica para entrega a domicilio con pago contra entrega (<strong>Contraentrega</strong>), o si debe derivarse a una encomienda externa (<strong>Agencia Shalom</strong>), guardando el estado final en Supabase.
                    </p>
                  </div>

                  <div className="context-section-item">
                    <div className="section-item-title">
                      <Brain size={16} className="text-primary" />
                      <h4>¿Cómo participa la Inteligencia Artificial (IA)?</h4>
                    </div>
                    <p>
                      La IA interviene en tres puntos críticos:
                    </p>
                    <ul style={{ paddingLeft: "16px", marginTop: "4px", fontSize: "12px", color: "var(--text-muted)", listStyleType: "disc" }}>
                      <li><strong>Normalización de Direcciones:</strong> Procesa el texto escrito con errores tipográficos por el comprador para deducir el distrito real.</li>
                      <li><strong>Predicción Adaptativa de Cobertura:</strong> Resuelve rutas cuando las APIs de mapas fallan.</li>
                      <li><strong>Triage Inteligente de Tickets:</strong> Clasifica la prioridad de incidencias cruzando impacto financiero y nivel del cliente (VIP vs Standard).</li>
                    </ul>
                  </div>

                  <div className="context-section-item">
                    <div className="section-item-title">
                      <Building2 size={16} className="text-accent" />
                      <h4>El Impacto Financiero en el Negocio</h4>
                    </div>
                    <p>
                      Cualquier error de asignación de envío genera pérdidas directas: enviar como Agencia un pedido que era Contraentrega molesta al cliente y le cobra de más; mientras que romper la webhook detiene por completo la facturación de grandes tiendas VIP, provocando costosas cancelaciones y reclamos.
                    </p>
                  </div>
                </div>

              </div>

              {/* Controles de Visualización y Ordenamiento */}
              <div className="cases-control-panel">
                <div className="sorting-selector-container">
                  <span className="sorting-label">
                    <ArrowUpNarrowWide size={16} className="text-accent" />
                    <span>Visualización y Ordenamiento de Casos:</span>
                  </span>
                  <div className="sorting-btn-group">
                    <button 
                      className={`sort-btn ${sortMode === "original" ? "active" : ""}`}
                      onClick={() => setSortMode("original")}
                    >
                      Orden Cronológico Recibido (A, D, C, B)
                    </button>
                    <button 
                      className={`sort-btn ${sortMode === "priority" ? "active" : ""}`}
                      onClick={() => setSortMode("priority")}
                    >
                      Ordenar por Prioridad Seleccionada (P1 → P4)
                    </button>
                  </div>
                </div>
              </div>

              <div className="section-subtitle">
                <FileText size={18} className="text-primary" />
                <span>Casos Pendientes de Triage (9:00 AM)</span>
              </div>

              {/* Case Cards rendering dynamically based on sorted mode */}
              <div className="cases-grid">
                {getSortedCases().map((c) => (
                  <div key={c.id} className="case-card">
                    <div className="case-header">
                      <span className="case-badge">{c.badge}</span>
                      <span className="case-client">{c.client}</span>
                    </div>
                    <div className="case-title">{c.title}</div>
                    <div className="case-body">"{c.body}"</div>
                    <div className="case-controls">
                      <div className="priority-select-container">
                        <span className="priority-label">Gravedad del Caso:</span>
                        <select 
                          className="priority-select"
                          value={priorities[c.id]}
                          onChange={(e) => {
                            setPriorities(prev => ({ ...prev, [c.id]: e.target.value }));
                          }}
                        >
                          <option value="">Seleccionar prioridad...</option>
                          <option value="P1">P1 - Crítico (Bloqueo general / Pérdida financiera)</option>
                          <option value="P2">P2 - Alto (Bloqueo de usuario / Operación detenida individual)</option>
                          <option value="P3">P3 - Medio (Bug funcional / Transacción aislada errónea)</option>
                          <option value="P4">P4 - Bajo (Detalle estético / Tipografía / Consulta general)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Bar */}
              <div className="action-bar" style={{ justifyContent: "center", marginTop: "32px" }}>
                <button 
                  className="btn-primary" 
                  onClick={downloadReport}
                  style={{ padding: "10px 24px" }}
                >
                  <Download size={16} />
                  <span>Descargar Reporte (.txt)</span>
                </button>

                <button 
                  className="btn-outline" 
                  onClick={() => {
                    setPriorities({ A: "", B: "", C: "", D: "" });
                    setSortMode("original");
                  }}
                  style={{ padding: "10px 24px" }}
                >
                  <RotateCcw size={14} />
                  <span>Reiniciar Soporte</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: CODE SIMULATOR */}
          {activeTab === "code" && (() => {
            const selectedLead = leads.find((l) => l.id === selectedLeadId) || leads[0];
            return (
              <div className="code-screen">
                <div className="screen-title-area">
                  <h2>
                    Caso 2: Diagnóstico y Solución de Código (Bug de Coberturas)
                  </h2>
                  <p>
                    Edita el archivo <code>src/processLead.ts</code> en tu editor
                    de código para resolver el problema de sobreescritura de datos
                    y corregir el tipado estricto (cero any/unknown). La vista
                    del simulador refleja en tiempo real la cola de webhooks de tu tienda Shopify.
                  </p>
                </div>

                {/* Dashboard Mockup Wrapper */}
                <div className="dashboard-wrapper">
                  {/* Sidebar */}
                  <div className="dashboard-sidebar">
                    <div>
                      <div className="dashboard-sidebar-header">
                        <Brain size={20} className="text-accent" />
                        <span>Flin AI Logistics</span>
                      </div>
                      
                      <div className="dashboard-sidebar-menu">
                        <div className="dashboard-menu-item active">
                          <ShoppingBag size={16} />
                          <span>Pedidos Shopify</span>
                        </div>
                      </div>
                    </div>

                    <div className="dashboard-sidebar-footer">
                      <Building2 size={14} />
                      <span>Flin Commerce S.A.</span>
                    </div>
                  </div>

                  {/* Main Panel */}
                  <div className="dashboard-main">
                    {/* Topbar */}
                    <div className="dashboard-navbar">
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-bright)" }}>
                        Gestión de Pedidos & Leads
                      </div>
                      <div className="dashboard-navbar-status">
                        <span className="status-pill online">
                          <Globe size={12} />
                          Shopify Webhook: ACTIVO
                        </span>
                        <span className="status-pill connected">
                          <Database size={12} />
                          Supabase DB: CONECTADA
                        </span>
                      </div>
                    </div>

                    {/* Viewport content */}
                    <div className="dashboard-viewport">
                        <div className="dashboard-split-layout">
                          {/* Table Panel */}
                          <div className="dashboard-panel-left">
                            <div className="dashboard-table-card">
                              <div className="dashboard-table-header">
                                <h3>Cola de Webhooks Recibidos</h3>
                                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                  {leads.length} leads normalizados
                                </span>
                              </div>
                              <table className="dashboard-leads-table">
                                <thead>
                                  <tr>
                                    <th>Cliente / ID</th>
                                    <th>Dirección / Distrito</th>
                                    <th>Modo Resuelto</th>
                                    <th>Estado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {leads.map((l) => {
                                    const isSelected = l.id === selectedLeadId;
                                    const isFlashing = flashingRowId === l.id;
                                    const flashClass = isFlashing
                                      ? flashType === "green"
                                        ? "row-flash-green"
                                        : "row-flash-red"
                                      : "";
                                    
                                    return (
                                      <tr
                                        key={l.id}
                                        className={`dashboard-row-clickable ${isSelected ? "selected" : ""} ${flashClass}`}
                                        onClick={() => setSelectedLeadId(l.id)}
                                      >
                                        <td>
                                          <div style={{ fontWeight: "600", color: "var(--text-bright)" }}>
                                            {l.customer_name}
                                          </div>
                                          <div style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                                            {l.id}
                                          </div>
                                        </td>
                                        <td>
                                          <div style={{ fontWeight: "500" }}>{l.district}</div>
                                          <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                                            {l.address}
                                          </div>
                                        </td>
                                        <td>
                                          <span className={`dashboard-badge ${l.shipping_mode}`}>
                                            {l.shipping_mode === "contraentrega" ? "Contraentrega" : l.shipping_mode === "agencia" ? "Agencia (Shalom)" : "Pendiente"}
                                          </span>
                                        </td>
                                        <td>
                                          {l.id === "lead_99342" && l.shipping_mode === "agencia" ? (
                                            <span className="dashboard-badge state-alert">⚠️ Alerta Tarifa</span>
                                          ) : l.id === "lead_99342" && l.shipping_mode === "contraentrega" ? (
                                            <span className="dashboard-badge state-ok">✅ Exitoso</span>
                                          ) : (
                                            <span className="dashboard-badge" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}>
                                              Pendiente
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Detail Drawer Panel */}
                          <div className="dashboard-panel-right">
                            <div>
                              <div className="dashboard-detail-header">
                                <h3>Detalle del Lead: {selectedLead.id}</h3>
                              </div>
                              <div className="dashboard-detail-body">
                                <div className="detail-info-group">
                                  <span className="detail-info-label">Cliente</span>
                                  <span className="detail-info-value">{selectedLead.customer_name}</span>
                                </div>
                                <div className="detail-info-group">
                                  <span className="detail-info-label">Dirección</span>
                                  <span className="detail-info-value">{selectedLead.address}, {selectedLead.district}</span>
                                </div>
                                <div className="detail-info-group">
                                  <span className="detail-info-label">Coordenadas Resolvidas</span>
                                  <span className="detail-info-value" style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                                    {selectedLead.validated_location || "null (No validado)"}
                                  </span>
                                </div>

                                {/* Diagnostic box */}
                                {selectedLead.id === "lead_99342" && (
                                  selectedLead.shipping_mode === "agencia" ? (
                                    <div className="diagnostic-card warning">
                                      <div style={{ display: "flex", gap: "6px", alignItems: "center", fontWeight: "600", marginBottom: "4px" }}>
                                        <AlertTriangle size={14} />
                                        <span>Conflicto de Ruteo Detectado</span>
                                      </div>
                                      <p style={{ fontSize: "11.5px", lineHeight: "1.4" }}>
                                        El webhook solicitó <strong>contraentrega</strong>, pero la validación geográfica falló por timeout y tu backend ejecutó la sección <code>else</code>, sobrescribiendo erróneamente el modo a <strong>agencia (Shalom)</strong>.
                                      </p>
                                    </div>
                                  ) : selectedLead.shipping_mode === "contraentrega" ? (
                                    <div className="diagnostic-card success">
                                      <div style={{ display: "flex", gap: "6px", alignItems: "center", fontWeight: "600", marginBottom: "4px" }}>
                                        <Info size={14} />
                                        <span>Ruteo Resuelto Exitosamente</span>
                                      </div>
                                      <p style={{ fontSize: "11.5px", lineHeight: "1.4" }}>
                                        ¡Código corregido! La preferencia de <strong>contraentrega</strong> fue protegida y persistida en Supabase, ignorando la asignación forzada a agencia cuando la cobertura ya está resuelta.
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="diagnostic-card" style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border-color)", color: "var(--text-muted)" }}>
                                      <div style={{ display: "flex", gap: "6px", alignItems: "center", fontWeight: "600", marginBottom: "4px" }}>
                                        <Info size={14} />
                                        <span>Simulación Pendiente</span>
                                      </div>
                                      <p style={{ fontSize: "11.5px", lineHeight: "1.4" }}>
                                        Haz clic en <strong>"Simular Shopify Webhook"</strong> para simular la llegada del webhook de Shopify y procesar el pedido.
                                      </p>
                                    </div>
                                  )
                                )}

                                {/* Server Console Logs */}
                                <div className="log-stream-panel">
                                  <div className="log-stream-header">
                                    <Terminal size={12} />
                                    <span>Logs de la Operación en Server</span>
                                  </div>
                                  <div className="log-stream-content">
                                    {logs.length === 0 ? (
                                      <div className="log-stream-row info">
                                        Consola lista. Haz clic en "Simular Shopify Webhook".
                                      </div>
                                    ) : (
                                      logs.map((log, idx) => (
                                        <div key={idx} className={`log-stream-row ${log.type}`}>
                                          [{log.timestamp}] {log.text}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px" }}>
                              <button
                                className="btn-primary"
                                onClick={runCodeSimulation}
                                disabled={isRunning}
                                style={{ width: "100%", justifyContent: "center" }}
                              >
                                <Play size={14} />
                                <span>{isRunning ? "Procesando Webhook..." : "Simular Shopify Webhook"}</span>
                              </button>
                              <button
                                className="btn-outline"
                                onClick={resetSimulator}
                                style={{ width: "100%", justifyContent: "center", border: "1px solid var(--border-color)" }}
                              >
                                <RotateCcw size={12} />
                                <span>Reiniciar Base de Datos</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 3: SQL SANDBOX */}
          {activeTab === "sql" && (
            <div className="sql-screen">
              <div className="screen-title-area">
                <h2>Caso 3: Consulta y Auditoría SQL (Supabase)</h2>
                <p>
                  Un cliente del afiliado HogarModerno afirma que su pedido de $350 USD se "perdió" y no aparece en el panel de envíos. Usa la consola SQL interactiva a continuación para auditar la tabla de base de datos <code>leads</code> y encontrar el registro.
                </p>
              </div>

              <div className="sql-split-layout">
                {/* Panel izquierdo: Editor y resultados */}
                <div className="sql-editor-container">
                  <div className="sql-editor-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Terminal size={16} className="text-accent" />
                      <span style={{ fontWeight: "600", fontSize: "14px" }}>Editor de Consultas Supabase</span>
                    </div>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>leads (tabla)</span>
                  </div>

                  <div className="sql-textarea-wrapper">
                    <div className="sql-line-numbers">
                      <div>1</div>
                      <div>2</div>
                      <div>3</div>
                      <div>4</div>
                    </div>
                    <textarea
                      value={sqlQuery}
                      onChange={(e) => setSqlQuery(e.target.value)}
                      placeholder="SELECT * FROM leads WHERE ..."
                      className="sql-editor-textarea"
                    />
                  </div>

                  <div className="sql-actions-bar">
                    <button className="btn-primary" onClick={handleExecuteSql}>
                      <Play size={14} />
                      <span>Ejecutar Consulta</span>
                    </button>
                    <button className="btn-outline" onClick={() => setSqlQuery("SELECT * FROM leads LIMIT 5;")}>
                      <RotateCcw size={12} />
                      <span>Restaurar Query</span>
                    </button>
                  </div>

                  {/* Resultados SQL */}
                  <div className="sql-results-panel">
                    <div className="sql-results-header">
                      <span>Resultados de la Consulta</span>
                      {sqlResults && (
                        <span className="results-count">{sqlResults.rows.length} filas retornadas</span>
                      )}
                    </div>
                    <div className="sql-results-body">
                      {sqlError ? (
                        <div className="sql-error-box">
                          <AlertTriangle size={16} />
                          <span>{sqlError}</span>
                        </div>
                      ) : sqlResults ? (
                        sqlResults.rows.length > 0 ? (
                          <div className="sql-table-wrapper">
                            <table className="sql-results-table">
                              <thead>
                                <tr>
                                  {sqlResults.columns.map((col, idx) => (
                                    <th key={idx}>{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sqlResults.rows.map((row, rIdx) => (
                                  <tr key={rIdx}>
                                    {sqlResults.columns.map((col, cIdx) => (
                                      <td key={cIdx}>{String(row[col] ?? "NULL")}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="sql-empty-state">
                            Consulta ejecutada. 0 filas retornadas.
                          </div>
                        )
                      ) : (
                        <div className="sql-empty-state">
                          Escribe tu consulta SELECT y haz clic en "Ejecutar Consulta" para visualizar los datos.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Panel derecho: Esquema de base de datos y Validación */}
                <div className="sql-sidebar-container">
                  {/* Database Schema Card */}
                  <div className="schema-card">
                    <div className="schema-header">
                      <Database size={16} className="text-accent" />
                      <span>Esquema: public.leads</span>
                    </div>
                    <div className="schema-body">
                      <div className="schema-field">
                        <span className="field-name">id</span>
                        <span className="field-type">text (PK)</span>
                      </div>
                      <div className="schema-field">
                        <span className="field-name">customer_name</span>
                        <span className="field-type">text</span>
                      </div>
                      <div className="schema-field">
                        <span className="field-name">phone</span>
                        <span className="field-type">text</span>
                      </div>
                      <div className="schema-field">
                        <span className="field-name">address</span>
                        <span className="field-type">text</span>
                      </div>
                      <div className="schema-field">
                        <span className="field-name">district</span>
                        <span className="field-type">text</span>
                      </div>
                      <div className="schema-field">
                        <span className="field-name">shipping_mode</span>
                        <span className="field-type">text</span>
                      </div>
                      <div className="schema-field">
                        <span className="field-name">status</span>
                        <span className="field-type">text</span>
                      </div>
                      <div className="schema-field">
                        <span className="field-name">price</span>
                        <span className="field-type">numeric</span>
                      </div>
                      <div className="schema-field">
                        <span className="field-name">deleted_at</span>
                        <span className="field-type">timestamp</span>
                      </div>
                    </div>
                  </div>

                  {/* Answer Verification Card */}
                  <div className="sql-verification-card">
                    <div className="verification-header">
                      <FileText size={16} className="text-accent" />
                      <span>Auditoría de Pedido</span>
                    </div>
                    <div className="verification-body">
                      <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px", lineHeight: "1.4" }}>
                        El pedido de Carlos Mendoza (<strong>lead_88291</strong>) tiene un valor en <code>deleted_at</code> (Soft-deleted) y no se visualiza en la tienda.
                      </p>
                      
                      <div style={{ background: "rgba(0, 0, 0, 0.15)", borderRadius: "8px", padding: "12px", border: "1px solid var(--border-color)", marginBottom: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12px" }}>
                          <span style={{ color: "var(--text-muted)" }}>Cliente:</span>
                          <span style={{ fontWeight: 600, color: "var(--text-bright)" }}>Carlos Mendoza</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12px" }}>
                          <span style={{ color: "var(--text-muted)" }}>ID Pedido:</span>
                          <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-bright)" }}>lead_88291</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12px" }}>
                          <span style={{ color: "var(--text-muted)" }}>Estado de Visibilidad:</span>
                          {sqlSuccess ? (
                            <span style={{ color: "#2ecc71", fontWeight: 600, fontSize: "11px", background: "rgba(46, 204, 113, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                              Activo / Visible (deleted_at = NULL)
                            </span>
                          ) : (
                            <span style={{ color: "#e74c3c", fontWeight: 600, fontSize: "11px", background: "rgba(231, 76, 60, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                              Soft-deleted (deleted_at ≠ NULL)
                            </span>
                          )}
                        </div>
                      </div>

                      {sqlSuccess && (
                        <div className="verification-success-alert" style={{ marginTop: "12px" }}>
                          <Info size={14} />
                          <span><strong>Auditado Exitosamente:</strong> El pedido ha sido restaurado en la base de datos. Respuesta guardada en el reporte.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
