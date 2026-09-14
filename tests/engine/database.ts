/**
 * In-memory Transactional Document Database Engine
 * Implements Firestore-compatible collections, document snapshots, atomic transactions,
 * query filtering, sorting, pagination, and FieldValue helpers using native Node 24.
 */

export interface DocumentSnapshot<T = Record<string, any>> {
  id: string;
  exists: boolean;
  data: () => T | undefined;
}

export interface QuerySnapshot<T = Record<string, any>> {
  docs: DocumentSnapshot<T>[];
  size: number;
  empty: boolean;
}

export interface DocumentReference {
  collectionId: string;
  id: string;
  path: string;
}

export class FieldValueSentinel {
  public readonly type: 'serverTimestamp' | 'increment';
  public readonly value?: any;

  constructor(type: 'serverTimestamp' | 'increment', value?: any) {
    this.type = type;
    this.value = value;
  }
}

export const FieldValue = {
  serverTimestamp: () => new FieldValueSentinel('serverTimestamp'),
  increment: (n: number) => new FieldValueSentinel('increment', n),
};

export interface QueryFilter {
  field: string;
  op: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'array-contains';
  value: any;
}

export interface QueryOrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

function deepClone<T>(val: T): T {
  if (val === null || val === undefined) return val;
  if (val instanceof Date) return new Date(val.getTime()) as any;
  if (val instanceof FieldValueSentinel) return val;
  if (Array.isArray(val)) return val.map(deepClone) as any;
  if (typeof val === 'object') {
    const copy: any = {};
    for (const [k, v] of Object.entries(val)) {
      copy[k] = deepClone(v);
    }
    return copy;
  }
  return val;
}

function resolveFieldValue(target: any, source: any): any {
  if (source instanceof FieldValueSentinel) {
    if (source.type === 'serverTimestamp') {
      return new Date();
    }
    if (source.type === 'increment') {
      const current = typeof target === 'number' ? target : 0;
      return current + (source.value || 0);
    }
  }
  if (Array.isArray(source)) {
    return source.map((item, idx) => resolveFieldValue(target?.[idx], item));
  }
  if (typeof source === 'object' && source !== null && !(source instanceof Date)) {
    const result: any = target && typeof target === 'object' ? { ...target } : {};
    for (const key of Object.keys(source)) {
      result[key] = resolveFieldValue(target?.[key], source[key]);
    }
    return result;
  }
  return source;
}

export class TransactionContext {
  private writes: Map<string, { op: 'set' | 'update' | 'delete'; data?: any; merge?: boolean }> = new Map();
  private readSnapshots: Map<string, any> = new Map();
  private db: MemoryDatabase;

  constructor(db: MemoryDatabase) {
    this.db = db;
  }

  async get(ref: DocumentReference): Promise<DocumentSnapshot> {
    const current = this.db._getRaw(ref.collectionId, ref.id);
    this.readSnapshots.set(ref.path, current ? deepClone(current) : null);
    return {
      id: ref.id,
      exists: current !== null && current !== undefined,
      data: () => (current ? deepClone(current) : undefined),
    };
  }

  set(ref: DocumentReference, data: any, options?: { merge?: boolean }): void {
    this.writes.set(ref.path, {
      op: 'set',
      data: deepClone(data),
      merge: options?.merge ?? false,
    });
  }

  update(ref: DocumentReference, data: any): void {
    this.writes.set(ref.path, {
      op: 'update',
      data: deepClone(data),
    });
  }

  delete(ref: DocumentReference): void {
    this.writes.set(ref.path, {
      op: 'delete',
    });
  }

  _commit(): void {
    for (const [path, write] of this.writes.entries()) {
      const [col, id] = path.split('/');
      if (write.op === 'delete') {
        this.db._deleteRaw(col, id);
      } else if (write.op === 'set') {
        const existing = write.merge ? this.db._getRaw(col, id) : null;
        const resolved = resolveFieldValue(existing, write.data);
        const finalData = write.merge && existing ? { ...existing, ...resolved } : resolved;
        this.db._setRaw(col, id, finalData);
      } else if (write.op === 'update') {
        const existing = this.db._getRaw(col, id);
        if (!existing) {
          throw new Error(`Document not found for update: ${path}`);
        }
        const resolved = resolveFieldValue(existing, write.data);
        this.db._setRaw(col, id, { ...existing, ...resolved });
      }
    }
  }
}

export class QueryBuilder {
  private filters: QueryFilter[] = [];
  private orderBys: QueryOrderBy[] = [];
  private limitCount?: number;
  private offsetCount: number = 0;
  private db: MemoryDatabase;
  private collectionId: string;

  constructor(db: MemoryDatabase, collectionId: string) {
    this.db = db;
    this.collectionId = collectionId;
  }

  where(field: string, op: QueryFilter['op'], value: any): this {
    this.filters.push({ field, op, value });
    return this;
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): this {
    this.orderBys.push({ field, direction });
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  offset(count: number): this {
    this.offsetCount = count;
    return this;
  }

  async get(): Promise<QuerySnapshot> {
    const rawDocs = this.db._getAllRaw(this.collectionId);
    let results = Object.entries(rawDocs).map(([id, data]) => ({ id, ...deepClone(data) }));

    // Apply filters
    for (const filter of this.filters) {
      results = results.filter((doc) => {
        const val = doc[filter.field];
        switch (filter.op) {
          case '==':
            return val === filter.value;
          case '!=':
            return val !== filter.value;
          case '<':
            return val < filter.value;
          case '<=':
            return val <= filter.value;
          case '>':
            return val > filter.value;
          case '>=':
            return val >= filter.value;
          case 'in':
            return Array.isArray(filter.value) && filter.value.includes(val);
          case 'array-contains':
            return Array.isArray(val) && val.includes(filter.value);
          default:
            return true;
        }
      });
    }

    // Apply ordering
    if (this.orderBys.length > 0) {
      results.sort((a, b) => {
        for (const order of this.orderBys) {
          let valA = a[order.field];
          let valB = b[order.field];

          if (valA instanceof Date) valA = valA.getTime();
          if (valB instanceof Date) valB = valB.getTime();

          if (valA < valB) return order.direction === 'asc' ? -1 : 1;
          if (valA > valB) return order.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    // Apply pagination
    if (this.offsetCount > 0) {
      results = results.slice(this.offsetCount);
    }
    if (this.limitCount !== undefined) {
      results = results.slice(0, this.limitCount);
    }

    const docs: DocumentSnapshot[] = results.map((item) => {
      const { id, ...data } = item;
      return {
        id,
        exists: true,
        data: () => data,
      };
    });

    return {
      docs,
      size: docs.length,
      empty: docs.length === 0,
    };
  }
}

export class MemoryDatabase {
  private store: Map<string, Map<string, any>> = new Map();

  collection(collectionId: string) {
    const db = this;
    return {
      doc: (id: string): DocumentReference & {
        get: () => Promise<DocumentSnapshot>;
        set: (data: any, options?: { merge?: boolean }) => Promise<void>;
        update: (data: any) => Promise<void>;
        delete: () => Promise<void>;
      } => ({
        collectionId,
        id,
        path: `${collectionId}/${id}`,
        get: async (): Promise<DocumentSnapshot> => {
          const current = db._getRaw(collectionId, id);
          return {
            id,
            exists: current !== null && current !== undefined,
            data: () => (current ? deepClone(current) : undefined),
          };
        },
        set: async (data: any, options?: { merge?: boolean }): Promise<void> => {
          const existing = options?.merge ? db._getRaw(collectionId, id) : null;
          const resolved = resolveFieldValue(existing, data);
          const finalData = options?.merge && existing ? { ...existing, ...resolved } : resolved;
          db._setRaw(collectionId, id, finalData);
        },
        update: async (data: any): Promise<void> => {
          const existing = db._getRaw(collectionId, id);
          if (!existing) {
            throw new Error(`Document not found for update: ${collectionId}/${id}`);
          }
          const resolved = resolveFieldValue(existing, data);
          db._setRaw(collectionId, id, { ...existing, ...resolved });
        },
        delete: async (): Promise<void> => {
          db._deleteRaw(collectionId, id);
        },
      }),
      where: (field: string, op: QueryFilter['op'], value: any) =>
        new QueryBuilder(this, collectionId).where(field, op, value),
      orderBy: (field: string, direction: 'asc' | 'desc' = 'asc') =>
        new QueryBuilder(this, collectionId).orderBy(field, direction),
      limit: (count: number) => new QueryBuilder(this, collectionId).limit(count),
      get: () => new QueryBuilder(this, collectionId).get(),
    };
  }

  private txQueue: Promise<any> = Promise.resolve();

  async runTransaction<T>(updateFunction: (transaction: TransactionContext) => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      const tx = new TransactionContext(this);
      const result = await updateFunction(tx);
      tx._commit();
      return result;
    };
    const next = this.txQueue.then(run, run);
    this.txQueue = next;
    return next;
  }

  _getRaw(collectionId: string, id: string): any {
    const col = this.store.get(collectionId);
    return col ? col.get(id) : null;
  }

  _setRaw(collectionId: string, id: string, data: any): void {
    if (!this.store.has(collectionId)) {
      this.store.set(collectionId, new Map());
    }
    this.store.get(collectionId)!.set(id, deepClone(data));
  }

  _deleteRaw(collectionId: string, id: string): void {
    const col = this.store.get(collectionId);
    if (col) {
      col.delete(id);
    }
  }

  _getAllRaw(collectionId: string): Record<string, any> {
    const col = this.store.get(collectionId);
    if (!col) return {};
    const result: Record<string, any> = {};
    for (const [id, data] of col.entries()) {
      result[id] = deepClone(data);
    }
    return result;
  }

  clear(): void {
    this.store.clear();
  }
}
