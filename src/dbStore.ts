export interface Lead {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  district: string;
  shipping_mode: 'contraentrega' | 'agencia' | 'pendiente';
  validated_location: string | null;
}

export interface LogEntry {
  text: string;
  type: 'info' | 'success' | 'error' | 'warn' | 'output';
  timestamp: string;
}

const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead_99342',
    customer_name: 'Juan Perez',
    phone: '+51 987654321',
    address: 'Av. Larco 123',
    district: 'Miraflores',
    shipping_mode: 'pendiente',
    validated_location: null
  },
  {
    id: 'lead_55123',
    customer_name: 'Ana Rodriguez',
    phone: '+51 912345678',
    address: 'Calle Falsa 456',
    district: 'Chorrillos',
    shipping_mode: 'pendiente',
    validated_location: null
  }
];

type Listener = () => void;

export interface UpsertLeadPayload {
  id: string;
  customer_name?: string;
  name?: string;
  phone: string;
  address: string;
  district?: string;
  shipping_mode?: 'contraentrega' | 'agencia' | 'pendiente';
  shippingMode?: 'contraentrega' | 'agencia' | 'pendiente';
  validated_location?: string | null;
}

class DbStore {
  private leads: Lead[] = [];
  private logs: LogEntry[] = [];
  private listeners: Set<Listener> = new Set();
  public onFlash: ((id: string, type: 'green' | 'red') => void) | null = null;

  constructor() {
    this.reset();
  }

  public subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public getLeads(): Lead[] {
    return [...this.leads];
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public addLog(text: string, type: 'info' | 'success' | 'error' | 'warn' | 'output') {
    const timestamp = new Date().toLocaleTimeString();
    this.logs.push({ text, type, timestamp });
    this.notify();
  }

  public updateLead(id: string, updates: Partial<Lead>) {
    const leadIndex = this.leads.findIndex(l => l.id === id);
    if (leadIndex !== -1) {
      const oldMode = this.leads[leadIndex].shipping_mode;
      this.leads[leadIndex] = {
        ...this.leads[leadIndex],
        ...updates
      };
      
      // Visual feedback trigger
      if (updates.shipping_mode) {
        const newMode = updates.shipping_mode;
        if (oldMode === 'contraentrega' && newMode === 'agencia') {
          this.onFlash?.(id, 'red');
        } else if (newMode === 'contraentrega') {
          this.onFlash?.(id, 'green');
        } else {
          this.onFlash?.(id, 'green');
        }
      }
      this.notify();
    }
  }

  public upsertLead(lead: UpsertLeadPayload) {
    const leadIndex = this.leads.findIndex(l => l.id === lead.id);
    const mapped: Lead = {
      id: lead.id,
      customer_name: lead.customer_name || lead.name || '',
      phone: lead.phone,
      address: lead.address,
      district: lead.district || '',
      shipping_mode: lead.shipping_mode || lead.shippingMode || 'pendiente',
      validated_location: lead.validated_location || null
    };

    if (leadIndex !== -1) {
      this.leads[leadIndex] = {
        ...this.leads[leadIndex],
        ...mapped
      };
    } else {
      this.leads.push(mapped);
    }
    this.onFlash?.(lead.id, 'green');
    this.notify();
  }

  public reset() {
    this.leads = JSON.parse(JSON.stringify(INITIAL_LEADS));
    this.logs = [];
    this.addLog('Base de datos simulada inicializada.', 'info');
    this.notify();
  }
}

export const dbStore = new DbStore();
