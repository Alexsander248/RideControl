// Tipos compartilhados entre AddBike e EditBike
export interface SelectedFipeModel {
  brandCode: string;
  modelCode: number;
}

// Validação de ano
export const validateYear = (year: number): number => {
  const currentYear = new Date().getFullYear();
  if (year >= 1990 && year <= currentYear) {
    return year;
  }
  return currentYear;
};

// Normalização de entrada de KM
export const normalizeKmInput = (value: string): string => {
  const numericValue = value.replace(/\D/g, "");
  return numericValue === "" ? "0" : numericValue;
};

// Formatação de KM para exibição
export const formatKm = (km: number): string => {
  if (km >= 1000) {
    return `${(km / 1000).toFixed(1)}k km`;
  }
  return `${km} km`;
};

// Formatação de preço BRL
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

// Máscara de entrada para BRL
export const maskCurrency = (value: string): string => {
  const numericValue = value.replace(/\D/g, "");
  if (!numericValue) return "";

  const numberValue = parseInt(numericValue, 10);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numberValue / 100);
};
