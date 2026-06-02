type ExecaFn = typeof import('execa').execa;

let cachedExeca: ExecaFn | null = null;

async function importExecaModule() {
  const importer = new Function(
    'specifier',
    'return import(specifier)',
  ) as (specifier: string) => Promise<typeof import('execa')>;
  return importer('execa');
}

export async function getExeca(): Promise<ExecaFn> {
  if (cachedExeca) {
    return cachedExeca;
  }
  const module = await importExecaModule();
  cachedExeca = module.execa;
  return cachedExeca;
}
