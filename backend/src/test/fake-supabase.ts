/**
 * Doble en memoria del cliente Supabase para tests de módulos.
 * Cubre el subconjunto de PostgREST que usan los servicios (filtros, order,
 * single/maybeSingle, insert/update/upsert/delete y storage) sin red ni base
 * de datos. No aplica RLS: los tests verifican que el servicio filtre por el
 * student_id del JWT.
 */

export type FakeRow = Record<string, unknown>;

interface QueryResult {
  data: unknown;
  error: { message: string } | null;
}

type FilterOperator = 'eq' | 'neq' | 'in' | 'is' | 'gte' | 'lte' | 'gt' | 'lt';

interface Filter {
  operator: FilterOperator;
  column: string;
  value: unknown;
}

interface OrderSpec {
  column: string;
  ascending: boolean;
}

export interface UploadRecord {
  bucket: string;
  path: string;
  size: number;
  contentType?: string;
}

export class FakeStore {
  tables = new Map<string, FakeRow[]>();
  uploads: UploadRecord[] = [];
  removed: { bucket: string; paths: string[] }[] = [];
  /** Fuerza un error de PostgREST en la siguiente operación de una tabla */
  failOn = new Set<string>();
  private sequence = 0;

  reset(): void {
    this.tables.clear();
    this.uploads = [];
    this.removed = [];
    this.failOn.clear();
    this.sequence = 0;
  }

  seed(table: string, rows: FakeRow[]): void {
    this.tables.set(table, rows.map((row) => ({ ...row })));
  }

  rows(table: string): FakeRow[] {
    let rows = this.tables.get(table);
    if (!rows) {
      rows = [];
      this.tables.set(table, rows);
    }
    return rows;
  }

  nextId(): string {
    this.sequence += 1;
    return `00000000-0000-4000-8000-${`${this.sequence}`.padStart(12, '0')}`;
  }
}

function compare(left: unknown, right: unknown): number {
  if (left === right) return 0;
  if (left === null || left === undefined) return 1;
  if (right === null || right === undefined) return -1;
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right));
}

function matches(row: FakeRow, filter: Filter): boolean {
  const value = row[filter.column];
  switch (filter.operator) {
    case 'eq':
      return value === filter.value;
    case 'neq':
      return value !== filter.value;
    case 'in':
      return Array.isArray(filter.value) && filter.value.includes(value);
    case 'is':
      return filter.value === null ? value === null || value === undefined : value === filter.value;
    case 'gte':
      return compare(value, filter.value) >= 0;
    case 'lte':
      return compare(value, filter.value) <= 0;
    case 'gt':
      return compare(value, filter.value) > 0;
    case 'lt':
      return compare(value, filter.value) < 0;
  }
}

class FakeQuery implements PromiseLike<QueryResult> {
  private filters: Filter[] = [];
  private orders: OrderSpec[] = [];
  private limitCount: number | null = null;
  private action: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private payload: FakeRow[] = [];
  private conflictColumns: string[] = [];
  private updates: FakeRow = {};

  constructor(
    private readonly store: FakeStore,
    private readonly table: string,
  ) {}

  /** La proyección de columnas se ignora: los tests siembran solo lo necesario */
  select(): this {
    return this;
  }

  insert(payload: FakeRow | FakeRow[]): this {
    this.action = 'insert';
    this.payload = Array.isArray(payload) ? payload : [payload];
    return this;
  }

  upsert(payload: FakeRow | FakeRow[], options?: { onConflict?: string }): this {
    this.action = 'upsert';
    this.payload = Array.isArray(payload) ? payload : [payload];
    this.conflictColumns = options?.onConflict?.split(',').map((column) => column.trim()) ?? [];
    return this;
  }

  update(payload: FakeRow): this {
    this.action = 'update';
    this.updates = payload;
    return this;
  }

  delete(): this {
    this.action = 'delete';
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ operator: 'eq', column, value });
    return this;
  }

  neq(column: string, value: unknown): this {
    this.filters.push({ operator: 'neq', column, value });
    return this;
  }

  in(column: string, value: unknown[]): this {
    this.filters.push({ operator: 'in', column, value });
    return this;
  }

  is(column: string, value: unknown): this {
    this.filters.push({ operator: 'is', column, value });
    return this;
  }

  gte(column: string, value: unknown): this {
    this.filters.push({ operator: 'gte', column, value });
    return this;
  }

  lte(column: string, value: unknown): this {
    this.filters.push({ operator: 'lte', column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orders.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  async single(): Promise<QueryResult> {
    const result = this.run();
    if (result.error) return result;
    const rows = result.data as FakeRow[];
    const first = rows[0];
    if (!first) return { data: null, error: { message: 'No rows found' } };
    return { data: first, error: null };
  }

  async maybeSingle(): Promise<QueryResult> {
    const result = this.run();
    if (result.error) return result;
    return { data: (result.data as FakeRow[])[0] ?? null, error: null };
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }

  private run(): QueryResult {
    if (this.store.failOn.has(this.table)) {
      return { data: null, error: { message: `forced failure on ${this.table}` } };
    }

    const rows = this.store.rows(this.table);

    switch (this.action) {
      case 'insert':
        return { data: this.insertRows(rows, this.payload), error: null };
      case 'upsert':
        return { data: this.upsertRows(rows), error: null };
      case 'update': {
        const matched = this.applyFilters(rows);
        for (const row of matched) Object.assign(row, this.updates);
        return { data: matched, error: null };
      }
      case 'delete': {
        const matched = this.applyFilters(rows);
        this.store.tables.set(
          this.table,
          rows.filter((row) => !matched.includes(row)),
        );
        return { data: matched, error: null };
      }
      case 'select':
        return { data: this.sortAndLimit(this.applyFilters(rows)), error: null };
    }
  }

  private insertRows(rows: FakeRow[], payload: FakeRow[]): FakeRow[] {
    const inserted = payload.map((entry) => ({
      id: this.store.nextId(),
      created_at: new Date().toISOString(),
      ...entry,
    }));
    rows.push(...inserted);
    return inserted;
  }

  private upsertRows(rows: FakeRow[]): FakeRow[] {
    const result: FakeRow[] = [];
    for (const entry of this.payload) {
      const existing =
        this.conflictColumns.length > 0
          ? rows.find((row) =>
              this.conflictColumns.every((column) => row[column] === entry[column]),
            )
          : undefined;

      if (existing) {
        Object.assign(existing, entry);
        result.push(existing);
      } else {
        result.push(...this.insertRows(rows, [entry]));
      }
    }
    return result;
  }

  private applyFilters(rows: FakeRow[]): FakeRow[] {
    return rows.filter((row) => this.filters.every((filter) => matches(row, filter)));
  }

  private sortAndLimit(rows: FakeRow[]): FakeRow[] {
    const sorted = [...rows];
    for (const order of [...this.orders].reverse()) {
      sorted.sort((left, right) => {
        const result = compare(left[order.column], right[order.column]);
        return order.ascending ? result : -result;
      });
    }
    return this.limitCount === null ? sorted : sorted.slice(0, this.limitCount);
  }
}

/**
 * Store compartido por archivo de test: vitest aísla el registro de módulos,
 * así que cada test file obtiene su propia instancia. Permite que la factory
 * de vi.mock y el propio test hablen del mismo estado sin usar vi.hoisted.
 */
export const testStore = new FakeStore();

/** Cliente falso compatible con el subconjunto de la API que usan los servicios */
export function createFakeSupabase(store: FakeStore) {
  return {
    from: (table: string) => new FakeQuery(store, table),
    storage: {
      from: (bucket: string) => ({
        upload: (path: string, buffer: Buffer, options?: { contentType?: string }) => {
          store.uploads.push({
            bucket,
            path,
            size: buffer.length,
            contentType: options?.contentType,
          });
          return Promise.resolve({ data: { path }, error: null });
        },
        remove: (paths: string[]) => {
          store.removed.push({ bucket, paths });
          return Promise.resolve({ data: [], error: null });
        },
        createSignedUrl: (path: string) =>
          Promise.resolve({
            data: { signedUrl: `https://storage.test/${bucket}/${path}?token=fake` },
            error: null,
          }),
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://storage.test/${bucket}/${path}` },
        }),
      }),
    },
  };
}
