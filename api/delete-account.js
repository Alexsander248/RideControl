import { createClient } from "@supabase/supabase-js";

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      error:
        "Servidor sem SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY configurado.",
    });
  }

  let payload;

  try {
    payload = readJsonBody(req.body);
  } catch {
    return res.status(400).json({ error: "JSON inválido." });
  }

  const requestedUserId =
    typeof payload.userId === "string" ? payload.userId.trim() : "";
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!requestedUserId) {
    return res.status(400).json({ error: "userId é obrigatório." });
  }

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

  if (userData.user.id !== requestedUserId) {
    return res.status(403).json({ error: "userId não confere com a sessão." });
  }

  const { error: stateError } = await admin
    .from("app_state")
    .delete()
    .eq("user_id", requestedUserId);

  if (stateError) {
    return res.status(500).json({
      error: `Falha ao excluir dados sincronizados: ${stateError.message}`,
    });
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(
    requestedUserId,
  );

  if (deleteUserError) {
    return res.status(500).json({
      error: `Falha ao excluir conta do Auth: ${deleteUserError.message}`,
    });
  }

  return res.status(200).json({ ok: true });
}
