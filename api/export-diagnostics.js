import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { format, isWithinInterval, subDays, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

const readJsonBody = (body) => {
  if (!body) return {};

  if (typeof body === "string") {
    return JSON.parse(body);
  }

  if (typeof body === "object") {
    return body;
  }

  return {};
};

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const parseLocalDate = (value) => {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (typeof value === "number") {
    return new Date(value);
  }

  if (typeof value === "string" && DATE_ONLY_REGEX.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(value);
};

const categoryLabels = {
  Combustivel: "Combustível",
  Manutencao: "Manutenção",
  Pecas: "Peças",
  Equipamentos: "Equipamentos",
  Outros: "Outros",
};

const calculateDistanceFromKmReadings = (kms, baseKm) => {
  if (kms.length === 0) return 0;

  const sortedKms = [...kms].sort((a, b) => a - b);
  const firstKm = sortedKms[0];
  const startKm = typeof baseKm === "number" ? baseKm : firstKm;

  let distance = Math.max(0, firstKm - startKm);

  for (let index = 1; index < sortedKms.length; index += 1) {
    distance += Math.max(0, sortedKms[index] - sortedKms[index - 1]);
  }

  return distance;
};

const resolvePeriodRange = (preset, periodStart, periodEnd) => {
  const now = new Date();

  switch (preset) {
    case "30d":
      return { start: subDays(now, 30), end: now };
    case "90d":
      return { start: subMonths(now, 3), end: now };
    case "365d":
      return { start: subMonths(now, 12), end: now };
    case "custom": {
      const start = parseLocalDate(periodStart);
      const end = parseLocalDate(periodEnd);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return null;
      }

      return start <= end ? { start, end } : { start: end, end: start };
    }
    case "all":
    default:
      return null;
  }
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      error:
        "Servidor sem SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY configurado.",
    });
  }

  if (!resendApiKey || !resendFromEmail) {
    return res.status(500).json({
      error:
        "Servidor sem RESEND_API_KEY ou RESEND_FROM_EMAIL configurado.",
    });
  }

  let payload;

  try {
    payload = readJsonBody(req.body);
  } catch {
    return res.status(400).json({ error: "JSON inválido." });
  }

  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!token) {
    return res.status(401).json({ error: "Token ausente." });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(token);

  if (userError || !userData.user) {
    return res.status(401).json({ error: "Token inválido." });
  }

  const recipientEmail = userData.user.email;
  if (!recipientEmail) {
    return res.status(400).json({
      error: "Não foi possível identificar o e-mail da conta logada.",
    });
  }

  const rawBikes = Array.isArray(payload.bikes) ? payload.bikes : [];
  const rawExpenses = Array.isArray(payload.expenses) ? payload.expenses : [];
  const filters = payload.filters || {};
  const selectedBikeId =
    typeof filters.bikeId === "string" ? filters.bikeId.trim() : "all";
  const periodPreset =
    typeof filters.periodPreset === "string" ? filters.periodPreset : "all";
  const periodStart =
    typeof filters.periodStart === "string" ? filters.periodStart : "";
  const periodEnd =
    typeof filters.periodEnd === "string" ? filters.periodEnd : "";

  const bikes = rawBikes.map((bike) => ({
    id: typeof bike.id === "string" ? bike.id : "",
    name: typeof bike.name === "string" ? bike.name : "Moto",
    initialKm:
      typeof bike.initialKm === "number" ? bike.initialKm : bike.currentKm,
    currentKm: typeof bike.currentKm === "number" ? bike.currentKm : 0,
  }));

  const bikeMap = new Map(bikes.map((bike) => [bike.id, bike]));
  const range = resolvePeriodRange(periodPreset, periodStart, periodEnd);

  const normalExpenses = rawExpenses
    .map((expense) => ({
      id: typeof expense.id === "string" ? expense.id : "",
      bikeId: typeof expense.bikeId === "string" ? expense.bikeId : "",
      type: typeof expense.type === "string" ? expense.type : "Outros",
      date:
        typeof expense.date === "string"
          ? expense.date
          : format(new Date(), "yyyy-MM-dd"),
      amount: Number(expense.amount || 0),
      km: Number(expense.km || 0),
      liters:
        typeof expense.liters === "number" ? expense.liters : undefined,
      fullTank:
        typeof expense.fullTank === "boolean" ? expense.fullTank : undefined,
      notes: typeof expense.notes === "string" ? expense.notes : "",
      status: typeof expense.status === "string" ? expense.status : "Pago",
    }))
    .filter((expense) => expense.id && expense.bikeId);

  const selectedBikeExpensesAllTime =
    selectedBikeId === "all"
      ? normalExpenses
      : normalExpenses.filter((expense) => expense.bikeId === selectedBikeId);

  const filteredExpenses = range
    ? selectedBikeExpensesAllTime.filter((expense) => {
        const expenseDate = parseLocalDate(expense.date);
        return isWithinInterval(expenseDate, range);
      })
    : selectedBikeExpensesAllTime;

  const selectedBikeName =
    selectedBikeId === "all"
      ? "Todas as motos"
      : bikeMap.get(selectedBikeId)?.name || "Moto selecionada";

  const periodLabel = range
    ? `${format(range.start, "dd/MM/yyyy")} até ${format(
        range.end,
        "dd/MM/yyyy",
      )}`
    : "Todo o período";

  const totalSpentInPeriod = filteredExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );

  const totalSpentAllTime = selectedBikeExpensesAllTime.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );

  const bikeInitialKmMap = new Map(
    bikes.map((bike) => [bike.id, bike.initialKm ?? bike.currentKm]),
  );

  const bikeIds =
    selectedBikeId !== "all"
      ? [selectedBikeId]
      : Array.from(new Set(filteredExpenses.map((expense) => expense.bikeId)));

  let totalDistance = 0;
  bikeIds.forEach((bikeId) => {
    const bikeKms = filteredExpenses
      .filter((expense) => expense.bikeId === bikeId)
      .map((expense) => expense.km);

    if (bikeKms.length === 0) return;

    totalDistance += calculateDistanceFromKmReadings(
      bikeKms,
      bikeInitialKmMap.get(bikeId),
    );
  });

  const fuelExpenses = filteredExpenses.filter(
    (expense) => expense.type === "Combustivel",
  );
  const totalFuelLiters = fuelExpenses.reduce(
    (sum, expense) => sum + (expense.liters || 0),
    0,
  );
  const fuelConsumptionKmPerLiter =
    totalFuelLiters > 0 ? totalDistance / totalFuelLiters : 0;
  const costPerKm = totalDistance > 0 ? totalSpentInPeriod / totalDistance : 0;
  const avgMonthly = totalSpentAllTime / 12;

  const categoryTotals = {
    Combustivel: 0,
    Manutencao: 0,
    Pecas: 0,
    Equipamentos: 0,
    Outros: 0,
  };

  filteredExpenses.forEach((expense) => {
    if (expense.type in categoryTotals) {
      categoryTotals[expense.type] += expense.amount;
    } else {
      categoryTotals.Outros += expense.amount;
    }
  });

  const monthTotals = new Map();
  filteredExpenses.forEach((expense) => {
    const monthKey = format(parseLocalDate(expense.date), "yyyy-MM");
    monthTotals.set(monthKey, (monthTotals.get(monthKey) || 0) + expense.amount);
  });

  const workbook = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Métrica", "Valor"],
    ["Motocicleta", selectedBikeName],
    ["Período", periodLabel],
    ["Gastos no período", totalSpentInPeriod],
    ["Gastos acumulados", totalSpentAllTime],
    ["Média mensal", avgMonthly],
    ["Quantidade de gastos", filteredExpenses.length],
    ["Distância considerada (KM)", totalDistance],
    ["Custo por KM", costPerKm],
    ["Consumo (KM/L)", fuelConsumptionKmPerLiter],
  ]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");

  const categoriesSheet = XLSX.utils.json_to_sheet(
    Object.entries(categoryTotals).map(([key, value]) => ({
      Categoria: categoryLabels[key] || key,
      Valor: value,
      Participacao:
        totalSpentInPeriod > 0
          ? `${((value / totalSpentInPeriod) * 100).toFixed(1)}%`
          : "0.0%",
    })),
  );
  XLSX.utils.book_append_sheet(workbook, categoriesSheet, "Categorias");

  const monthlySheet = XLSX.utils.json_to_sheet(
    [...monthTotals.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([monthKey, value]) => ({
        Mes: format(parseLocalDate(`${monthKey}-01`), "MMM/yy", {
          locale: ptBR,
        })
          .replace(".", "")
          .toUpperCase(),
        Valor: value,
      })),
  );
  XLSX.utils.book_append_sheet(workbook, monthlySheet, "Mensal");

  const expensesSheet = XLSX.utils.json_to_sheet(
    filteredExpenses
      .slice()
      .sort(
        (a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime(),
      )
      .map((expense) => ({
        Data: format(parseLocalDate(expense.date), "dd/MM/yyyy"),
        Moto: bikeMap.get(expense.bikeId)?.name || expense.bikeId,
        Categoria: categoryLabels[expense.type] || expense.type,
        Valor: expense.amount,
        KM: expense.km,
        Litros: expense.type === "Combustivel" ? expense.liters || "" : "",
        "Tanque cheio":
          expense.type === "Combustivel"
            ? expense.fullTank
              ? "Sim"
              : "Não"
            : "",
        Observações: expense.notes || "",
        Status: expense.status || "Pago",
      })),
  );
  XLSX.utils.book_append_sheet(workbook, expensesSheet, "Gastos");

  const workbookBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  });

  const subject = `RideControl - Diagnóstico de ${selectedBikeName}`;
  const attachmentName = `ridecontrol-diagnostico-${selectedBikeId || "todas"}-${Date.now()}.xlsx`;

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFromEmail,
      to: [recipientEmail],
      subject,
      html: `
        <p>Olá,</p>
        <p>Sua planilha de diagnóstico do RideControl está em anexo.</p>
        <ul>
          <li><strong>Motocicleta:</strong> ${selectedBikeName}</li>
          <li><strong>Período:</strong> ${periodLabel}</li>
          <li><strong>Gastos no período:</strong> ${formatCurrency(
            totalSpentInPeriod,
          )}</li>
        </ul>
        <p>Abra o anexo para visualizar os detalhes da exportação.</p>
      `,
      attachments: [
        {
          filename: attachmentName,
          content: Buffer.from(workbookBuffer).toString("base64"),
        },
      ],
    }),
  });

  if (!emailResponse.ok) {
    const responseText = await emailResponse.text();
    return res.status(500).json({
      error: `Falha ao enviar o e-mail: ${responseText}`,
    });
  }

  return res.status(200).json({ ok: true });
}
