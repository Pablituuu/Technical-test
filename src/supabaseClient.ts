import { dbStore } from './dbStore';
import type { Lead, UpsertLeadPayload } from './dbStore';

interface DatabaseResponse<T> {
  data: T | null;
  error: Error | null;
}

interface SimpleResponse {
  error: Error | null;
}

export const supabase = {
  from(tableName: string) {
    if (tableName !== 'leads') {
      dbStore.addLog(`[Error] Tabla no simulada: ${tableName}`, 'error');
      throw new Error(`Tabla no simulada: ${tableName}`);
    }

    return {
      // Mock for select()
      select(_columns: string = '*') {
        return {
          eq(field: keyof Lead, value: string | null) {
            return {
              single() {
                return {
                  then<R = DatabaseResponse<Lead>>(onfulfilled?: (value: DatabaseResponse<Lead>) => R | PromiseLike<R>): Promise<R> {
                    dbStore.addLog(`[Supabase Mock] select('${_columns}').eq('${String(field)}', '${value}').single()`, 'output');
                    const lead = dbStore.getLeads().find(l => l[field] === value);
                    const result: DatabaseResponse<Lead> = lead 
                      ? { data: lead, error: null } 
                      : { data: null, error: new Error('Registro no encontrado') };
                    if (onfulfilled) return Promise.resolve(onfulfilled(result));
                    return Promise.resolve(result as R);
                  }
                };
              },
              maybeSingle() {
                return {
                  then<R = DatabaseResponse<Lead>>(onfulfilled?: (value: DatabaseResponse<Lead>) => R | PromiseLike<R>): Promise<R> {
                    dbStore.addLog(`[Supabase Mock] select('${_columns}').eq('${String(field)}', '${value}').maybeSingle()`, 'output');
                    const lead = dbStore.getLeads().find(l => l[field] === value);
                    const result: DatabaseResponse<Lead> = { data: lead || null, error: null };
                    if (onfulfilled) return Promise.resolve(onfulfilled(result));
                    return Promise.resolve(result as R);
                  }
                };
              }
            };
          }
        };
      },

      // Mock for upsert()
      upsert(payload: UpsertLeadPayload) {
        return {
          select(_columns: string = '*') {
            return {
              single() {
                return {
                  then<R = DatabaseResponse<Lead>>(onfulfilled?: (value: DatabaseResponse<Lead>) => R | PromiseLike<R>): Promise<R> {
                    dbStore.addLog(`[Supabase Mock] upsert() con select().single() para ID ${payload.id}`, 'output');
                    dbStore.upsertLead(payload);
                    const lead = dbStore.getLeads().find(l => l.id === payload.id);
                    const result: DatabaseResponse<Lead> = { data: lead || null, error: null };
                    if (onfulfilled) return Promise.resolve(onfulfilled(result));
                    return Promise.resolve(result as R);
                  }
                };
              }
            };
          },
          then<R = SimpleResponse>(onfulfilled?: (value: SimpleResponse) => R | PromiseLike<R>): Promise<R> {
            dbStore.addLog(`[Supabase Mock] upsert() simple para ID ${payload.id}`, 'output');
            dbStore.upsertLead(payload);
            const result: SimpleResponse = { error: null };
            if (onfulfilled) return Promise.resolve(onfulfilled(result));
            return Promise.resolve(result as R);
          }
        };
      },

      // Mock for update()
      update(payload: Partial<Lead>) {
        return {
          eq(field: keyof Lead, value: string | null) {
            return {
              then<R = SimpleResponse>(onfulfilled?: (value: SimpleResponse) => R | PromiseLike<R>): Promise<R> {
                dbStore.addLog(`[Supabase Mock] update() para ID ${value} con: ${JSON.stringify(payload)}`, 'output');
                if (field === 'id' && value) {
                  dbStore.updateLead(value, payload);
                }
                const result: SimpleResponse = { error: null };
                if (onfulfilled) return Promise.resolve(onfulfilled(result));
                return Promise.resolve(result as R);
              }
            };
          }
        };
      }
    };
  }
};
