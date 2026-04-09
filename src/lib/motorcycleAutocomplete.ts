type FipeBrand = {
  codigo: string;
  nome: string;
};

type FipeModel = {
  codigo: number;
  nome: string;
};

type FipeYear = {
  codigo: string;
  nome: string;
};

type FipePriceResponse = {
  Valor: string;
};

type FipeModelsResponse = {
  modelos: FipeModel[];
};

export type MotorcycleSuggestion = {
  label: string;
  name: string;
  model: string;
  brandCode: string;
  modelCode: number;
};

export type MotorcycleYearOption = {
  code: string;
  label: string;
  year: number;
};

const FIPE_BASE_URL = "https://parallelum.com.br/fipe/api/v1/motos";
const PRIORITY_BRANDS = [
  "YAMAHA",
  "HONDA",
  "BMW",
  "KAWASAKI",
  "SUZUKI",
  "DUCATI",
  "TRIUMPH",
];

let brandsCache: FipeBrand[] | null = null;
const modelsCache = new Map<string, FipeModel[]>();
const yearsCache = new Map<string, FipeYear[]>();

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const normalizeCompact = (value: string) =>
  normalize(value).replace(/\s+/g, "");

function matchesQuery(candidate: string, query: string): boolean {
  const normalizedCandidate = normalize(candidate);
  const compactCandidate = normalizeCompact(candidate);
  const normalizedQuery = normalize(query);
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);

  return queryTokens.every((token) => {
    const compactToken = normalizeCompact(token);
    return (
      normalizedCandidate.includes(token) ||
      compactCandidate.includes(compactToken)
    );
  });
}

function pickCandidateBrands(brands: FipeBrand[], query: string): FipeBrand[] {
  const normalizedQuery = normalize(query);
  const firstToken = normalizedQuery.split(" ")[0];

  const directMatches = brands.filter((brand) => {
    const normalizedBrand = normalize(brand.nome);
    return (
      normalizedBrand.startsWith(firstToken) ||
      normalizedBrand.includes(firstToken) ||
      normalizedQuery.includes(normalizedBrand)
    );
  });

  if (directMatches.length > 0) {
    return directMatches.slice(0, 6);
  }

  const priority = brands.filter((brand) =>
    PRIORITY_BRANDS.includes(brand.nome.toUpperCase()),
  );

  return priority.slice(0, 6);
}

async function fetchBrands(): Promise<FipeBrand[]> {
  if (brandsCache) {
    return brandsCache;
  }

  const response = await fetch(`${FIPE_BASE_URL}/marcas`);
  if (!response.ok) {
    throw new Error("Nao foi possivel carregar marcas de motos.");
  }

  const data = (await response.json()) as FipeBrand[];
  brandsCache = data;
  return data;
}

async function fetchModelsByBrand(brandCode: string): Promise<FipeModel[]> {
  const cached = modelsCache.get(brandCode);
  if (cached) {
    return cached;
  }

  const response = await fetch(`${FIPE_BASE_URL}/marcas/${brandCode}/modelos`);
  if (!response.ok) {
    throw new Error("Nao foi possivel carregar modelos da marca.");
  }

  const data = (await response.json()) as FipeModelsResponse;
  const models = data.modelos || [];
  modelsCache.set(brandCode, models);
  return models;
}

async function fetchYearsByModel(
  brandCode: string,
  modelCode: number,
): Promise<FipeYear[]> {
  const cacheKey = `${brandCode}-${modelCode}`;
  const cached = yearsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await fetch(
    `${FIPE_BASE_URL}/marcas/${brandCode}/modelos/${modelCode}/anos`,
  );
  if (!response.ok) {
    throw new Error("Nao foi possivel carregar anos do modelo.");
  }

  const data = (await response.json()) as FipeYear[];
  yearsCache.set(cacheKey, data);
  return data;
}

function extractYear(value: string): number {
  if (!value || typeof value !== "string") {
    return new Date().getFullYear();
  }

  const match = value.match(/\b(19|20)\d{2}\b/);
  const year = match ? Number(match[0]) : null;

  // Valida se é um ano válido (entre 1990 e atual)
  const currentYear = new Date().getFullYear();
  if (year && year >= 1990 && year <= currentYear) {
    return year;
  }

  return currentYear;
}

function extractYearFromFipeEntry(year: FipeYear): number | null {
  const currentYear = new Date().getFullYear();

  const codeYearMatch = String(year.codigo).match(/^(\d{4})-/);
  if (codeYearMatch) {
    const codeYear = Number(codeYearMatch[1]);
    if (codeYear >= 1990 && codeYear <= currentYear) {
      return codeYear;
    }
    return null;
  }

  const nameYear = extractYear(String(year.nome));
  if (nameYear >= 1990 && nameYear <= currentYear) {
    return nameYear;
  }

  return null;
}

function parseBrlValueToNumber(rawValue: string): number {
  const sanitized = rawValue
    .replace(/R\$\s?/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getMotorcycleSuggestions(
  query: string,
): Promise<MotorcycleSuggestion[]> {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length < 2) {
    return [];
  }

  const brands = await fetchBrands();

  const candidateBrands = pickCandidateBrands(brands, normalizedQuery);

  if (candidateBrands.length === 0) {
    return [];
  }

  const modelLists = await Promise.all(
    candidateBrands.map(async (brand) => {
      const models = await fetchModelsByBrand(brand.codigo);
      return models.map((model) => ({
        label: `${brand.nome} ${model.nome}`,
        name: `${brand.nome} ${model.nome}`,
        model: model.nome,
        brandCode: brand.codigo,
        modelCode: model.codigo,
      }));
    }),
  );

  const allSuggestions = modelLists.flat();
  const filtered = allSuggestions.filter((item) =>
    matchesQuery(item.label, normalizedQuery),
  );

  const uniqueByLabel = new Map<string, MotorcycleSuggestion>();
  filtered.forEach((item) => {
    if (!uniqueByLabel.has(item.label)) {
      uniqueByLabel.set(item.label, item);
    }
  });

  return Array.from(uniqueByLabel.values()).slice(0, 8);
}

export async function getMotorcycleYearOptions(
  brandCode: string,
  modelCode: number,
): Promise<MotorcycleYearOption[]> {
  const years = await fetchYearsByModel(brandCode, modelCode);
  const currentYear = new Date().getFullYear();

  const options = years
    .map((year) => {
      const extractedYear = extractYearFromFipeEntry(year);
      return {
        code: year.codigo,
        label: extractedYear ? String(extractedYear) : "",
        year: extractedYear,
      };
    })
    .filter((item): item is { code: string; label: string; year: number } => {
      // Filtra anos válidos: entre 1990 e ano atual
      return (
        item.year !== null && item.year >= 1990 && item.year <= currentYear
      );
    });

  // Mantem apenas uma opcao por ano e prioriza a primeira ocorrencia retornada pela FIPE.
  const dedupedByYear = new Map<number, MotorcycleYearOption>();
  options.forEach((option) => {
    if (!dedupedByYear.has(option.year)) {
      dedupedByYear.set(option.year, {
        code: option.code,
        label: option.label,
        year: option.year,
      });
    }
  });

  return Array.from(dedupedByYear.values()).sort((a, b) => b.year - a.year);
}

export async function getFipePriceForYear(
  brandCode: string,
  modelCode: number,
  yearCode: string,
): Promise<number> {
  const response = await fetch(
    `${FIPE_BASE_URL}/marcas/${brandCode}/modelos/${modelCode}/anos/${yearCode}`,
  );

  if (!response.ok) {
    throw new Error("Nao foi possivel carregar valor FIPE do ano selecionado.");
  }

  const data = (await response.json()) as FipePriceResponse;
  return parseBrlValueToNumber(data.Valor || "0");
}
