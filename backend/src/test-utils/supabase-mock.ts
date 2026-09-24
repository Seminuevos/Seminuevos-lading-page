export interface QueryResult<T = unknown> {
  data: T;
  error: { message: string } | null;
}

/**
 * Crea un mock encadenable que imita al query builder de @supabase/supabase-js
 * (que es "thenable": se puede await sin llamar a un método terminal).
 */
export function createQueryBuilderMock<T = unknown>(result: QueryResult<T>) {
  const builder: Record<string, unknown> = {};
  const chainMethods = [
    'from',
    'select',
    'insert',
    'update',
    'upsert',
    'delete',
    'eq',
    'ilike',
    'in',
    'order',
    'limit',
  ];

  for (const method of chainMethods) {
    builder[method] = jest.fn(() => builder);
  }

  builder.single = jest.fn(() => Promise.resolve(result));
  builder.maybeSingle = jest.fn(() => Promise.resolve(result));
  builder.then = (
    onFulfilled?: (value: QueryResult<T>) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(onFulfilled, onRejected);

  return builder;
}

export function createSupabaseClientMock() {
  return { from: jest.fn() };
}
