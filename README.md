# RideControl

RideControl é um app web/PWA para controle de motos. Ele foi pensado para uso no celular e organiza em um só lugar garagem, gastos, tarefas, perfil e diagnóstico.

## O que o app faz?

- Cadastra motos com foto, modelo, ano, quilometragem e preço de compra.
- Registra gastos por moto, com categorias como combustível, manutenção, peças e outros.
- Permite registrar litros abastecidos quando o gasto é de combustível.
- Cria e acompanha tarefas de manutenção.
- Mostra resumo da garagem, atividade recente e métricas de diagnóstico.
- Suporta modo PWA, instalação no celular e cache offline básico.

## Principais telas

### Início

Mostra o resumo geral do app, atalho para as áreas principais, estatísticas rápidas e atividade recente.

### Garagem

Lista todas as motos cadastradas, destaca as favoritas e permite abrir a ficha de cada moto.

### Moto

Exibe os detalhes da moto selecionada, imagem em destaque, botões para adicionar gastos e tarefas, e atividade recente.

### Adicionar Moto

Cadastro de uma nova moto com nome, modelo, ano, quilometragem atual, preço de compra e foto.

### Adicionar Gastos

Cadastro de despesas da moto. Quando a categoria é combustível, aparece o campo de litros abastecidos.

### Adicionar Tarefa

Cadastro de manutenção preventiva ou outras tarefas relacionadas à moto.

### Diagnóstico

Área de análise com gráficos e cards de total gasto, média mensal, custo por km e consumo.

### Perfil

Permite editar dados do usuário, foto do perfil, ativar tema escuro e acessar informações e notificações.

## Recursos de PWA

RideControl funciona como PWA:

- Pode ser instalado no celular.
- Abre em modo standalone, sem barra do navegador.
- Conta com service worker para cache de arquivos principais.
- Foi ajustado para melhorar o fluxo de abertura em dispositivos móveis.

## Estrutura do projeto

- `src/App.tsx`: rotas principais do app.
- `src/main.tsx`: ponto de entrada da aplicação React.
- `src/context/AppContext.tsx`: estado global, persistência em `localStorage` e ações do app.
- `src/pages/`: telas principais do sistema.
- `src/components/`: componentes compartilhados, como navegação inferior e modal de imagem.
- `src/lib/`: utilitários auxiliares.
- `public/manifest.json`: configuração da PWA.
- `public/sw.js`: service worker.

## Fluxo dos dados

Os dados ficam salvos localmente no navegador via `localStorage`.

- Motos cadastradas vão para o estado global.
- Gastos são associados a uma moto específica.
- Tarefas também ficam vinculadas à moto.
- O perfil do usuário e as configurações do app são persistidos localmente.

## Tema claro e escuro

O app tem alternância de tema claro e escuro. O estado é salvo localmente e reaplicado ao abrir o app.

## Sincronização em nuvem (definitivo)

O app agora suporta autenticação e backup em nuvem via Supabase.

### 1) Configure variáveis de ambiente

No `.env`:

```bash
APP_URL="https://ride-control.vercel.app"
VITE_APP_URL="https://ride-control.vercel.app"
VITE_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
VITE_SUPABASE_ANON_KEY="SUA_CHAVE_ANON"
```

Se você não tem domínio próprio, use a URL gratuita gerada pela Vercel.
Ela já é pública e funciona para o redirect de confirmação do Supabase.

### 2) Crie a tabela de estado no Supabase (SQL Editor)

```sql
create table if not exists public.app_state (
	user_id uuid primary key references auth.users(id) on delete cascade,
	data jsonb not null,
	updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

create policy "select own state"
on public.app_state for select
using (auth.uid() = user_id);

create policy "insert own state"
on public.app_state for insert
with check (auth.uid() = user_id);

create policy "update own state"
on public.app_state for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

Se você rodar apenas o bloco de RLS/políticas sem criar a tabela antes,
o Supabase retorna `relation "public.app_state" does not exist`.
Por isso, execute o bloco inteiro acima exatamente nessa ordem.

### 3) Uso no app

- Tela Perfil: criar conta/entrar com email e senha
- Após login, o app sincroniza automaticamente
- Botão "Sincronizar agora" força upload imediato
- Ao trocar de celular, basta fazer login na mesma conta
- O email de confirmação é enviado com redirect para `${APP_URL}/auth`
- Se estiver testando localmente, o redirect usa `localhost`; para produção,
  use a URL pública da Vercel

### 4) Conta de dev local

Para testes rápidos no ambiente de desenvolvimento, a tela de login mostra o
botão "Entrar como dev". Essa conta:

- entra sem email e senha
- usa uma senha definida apenas na build de desenvolvimento
- salva os dados localmente no navegador
- não faz sincronização com o Supabase
- serve para testar o app inteiro sem depender de backend

Se quiser personalizar o rótulo da conta, defina estas variáveis no `.env`:

```bash
VITE_DEV_ACCOUNT_EMAIL="dev@ridecontrol.local"
VITE_DEV_ACCOUNT_NAME="Conta de dev"
VITE_DEV_SESSION_PASSWORD="sua_senha_de_dev"
```

### 4) Configuração obrigatória no Supabase

- Em Authentication > URL Configuration, defina a Site URL da sua implantação
- Em produção, adicione também a URL final do app em Additional Redirect URLs
- Não use `localhost` como URL principal se o app for aberto em web pública ou APK
- Para o app Android abrir de volta na instalação, adicione também
  `com.ridecontrol.app://auth/callback` em Additional Redirect URLs

### 5) Exclusão de conta no servidor

Para cumprir a exigência da Play Store, publique o endpoint `/api/delete-account`
na mesma implantação do app e configure estas variáveis no servidor:

```bash
SUPABASE_URL="https://SEU-PROJETO.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="SUA_CHAVE_SERVICE_ROLE"
```

O app envia o `userId` e o token autenticado. O endpoint valida a sessão,
remove `public.app_state` e apaga o usuário no Supabase Auth.

## Atualização do APK

O app verifica um manifesto remoto de atualização ao abrir e também quando volta
para primeiro plano.

Essa função deve ficar desligada na build publicada na Play Store.

### 1) Publique um manifesto JSON

Hospede um arquivo JSON em um servidor público, por exemplo:

```json
{
  "version": "1.0.2",
  "apkUrl": "https://seu-servidor.com/RideControl.apk",
  "notes": "Correções e melhorias na versão 1.0.2",
  "force": false
}
```

### 2) Configure a URL do manifesto

No `.env` da build:

```bash
VITE_UPDATE_MANIFEST_URL="https://seu-servidor.com/app-update.json"
VITE_ENABLE_APK_UPDATE="true"
```

Se essa variável não existir, o app usa `/app-update.json` como fallback.

Para a Play Store, mantenha `VITE_ENABLE_APK_UPDATE` ausente ou como `false`.

### 3) Fluxo no app

- Ao detectar uma versão maior que a atual, o app mostra um modal de atualização
- O botão "Atualizar APK" baixa o APK antes de abrir a instalação
- Se `force` for `true`, a atualização não pode ser dispensada pelo usuário
- No Android, o usuário ainda precisa permitir "Instalar apps desconhecidos"
- O APK novo precisa usar o mesmo `package name` e o mesmo keystore do anterior

### 4) Cache de checagem

- O app evita repetir a mesma checagem em sequência usando cache local
- Se você publicar uma versão nova, a checagem volta a acontecer normalmente

### 5) Versionamento do app

- A versão atual do app vem de `package.json`
- O Android usa `versionName` sincronizado com essa versão
- Ao publicar um novo APK, incremente a versão e gere um novo manifesto

## Privacidade

O app coleta e sincroniza apenas os dados necessários para o funcionamento:

- conta de usuário para autenticação
- dados de motos, gastos, tarefas e perfil
- foto de perfil, quando o usuário define uma imagem

O app não compartilha dados com terceiros fora do fluxo de autenticação e
sincronização configurado pelo próprio usuário.

Se você quiser publicar, hospede uma política de privacidade pública e aponte o
link na Play Console.

## Como rodar

### Requisitos

- Node.js

### Instalar dependências

```bash
npm install
```

### Rodar em desenvolvimento

```bash
npm run dev
```

### Gerar build de produção

```bash
npm run build
```

### Pré-visualizar build

```bash
npm run preview
```

### Verificação de TypeScript

```bash
npm run lint
```

## Observações

- O app foi otimizado para uso em celular.
- Algumas imagens são salvas em formato local no navegador, então o espaço disponível no dispositivo pode afetar arquivos grandes.
- Em PWA, recomenda-se instalar o app diretamente pela opção de instalação do navegador.

## Shortcuts

press r + enter to restart the server
press u + enter to show server url
press o + enter to open in browser
press c + enter to clear console
press q + enter to quit

## Tecnologias

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Motion
- Recharts
- date-fns
- Lucide React
