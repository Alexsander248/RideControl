# RideControl

> Gestão inteligente para motociclistas: garagem, despesas, manutenção e indicadores em um só lugar.

O RideControl é um aplicativo multiplataforma desenvolvido para organizar a rotina de quem possui uma ou mais motocicletas. O projeto combina uma experiência mobile-first na web, publicação como PWA e um aplicativo Android empacotado com Capacitor.

## Demonstracao

- **Web/PWA:** [ride-control.vercel.app](https://ride-control.vercel.app)
- **Android:** aplicativo gerado a partir do mesmo código-fonte web usando Capacitor
- **iPhone:** acesso pela versão web publicada na Vercel, com suporte à instalação como PWA no Safari

A experiência é responsiva e foi pensada para uso com uma mão em telas de celular, sem perder organização em telas maiores.

## Visão do produto

O RideControl transforma registros simples do dia a dia em uma visão prática da saúde e do custo de cada motocicleta:

- centraliza motos, quilometragem, fotos e preço de aquisição;
- registra abastecimentos e despesas por categoria;
- acompanha manutenção preventiva por quilometragem, prazo e prioridade;
- permite cadastrar despesas recorrentes;
- apresenta indicadores de custo, distância e consumo;
- oferece autenticação e sincronização em nuvem com Supabase;
- mantém uma experiência local com persistência no navegador;
- oferece tema claro e escuro, tutorial inicial e notificações de lembrete.

## Telas e fluxos

### Início

Dashboard com resumo da garagem, atalhos de ações rápidas, visão de gastos, próximas tarefas e atividade recente.

### Garagem

Lista de motocicletas cadastradas, com identificação visual, favoritos e acesso rápido à ficha individual.

### Detalhes da moto

Ficha com foto, modelo, ano, quilometragem atual, preço de compra, ações para novo gasto ou tarefa e histórico associado à motocicleta.

### Cadastro e edicao de moto

Fluxo para informar nome, modelo, ano, quilometragem inicial/atual, preço de compra e imagem da moto.

### Gastos

Registro de despesas de combustível, manutenção, peças, equipamentos e outros. Cada lançamento pode conter data, valor, quilometragem, observações, status e comprovante. Para combustível, o formulário também registra litros e marcação de tanque cheio.

### Tarefas de manutencao

Criação e acompanhamento de tarefas com quilometragem-alvo, prazo, prioridade e status de conclusão. A tela da moto reúne as tarefas pendentes e concluídas.

### Despesas recorrentes

Cadastro de compromissos periódicos, como seguro, documentação e mensalidades, com valor, categoria, dia de vencimento e ativação individual.

### Diagnostico e insights

Área analítica com filtros por motocicleta e período, cards de indicadores, gráficos de evolução mensal e detalhamento da atividade financeira.

### Perfil

Gerenciamento de dados pessoais, foto, preferências visuais, contas, sincronização e acesso às configurações do aplicativo.

### Notificacoes

Configuração de lembretes para tarefas próximas do vencimento e despesas recorrentes, incluindo antecedência personalizada.

### Autenticacao e onboarding

Fluxo de criação de conta e login por e-mail, callback de autenticação, tutorial de apresentação e configuração inicial do perfil.

## Cálculos e indicadores

Os indicadores são calculados a partir dos registros informados pelo usuário:

- **Total gasto:** soma dos valores das despesas no período selecionado.
- **Média mensal:** total do período dividido pela quantidade de meses considerados.
- **Distância percorrida:** diferença entre leituras de quilometragem, considerando a quilometragem inicial de cada moto e evitando diferenças negativas.
- **Litros abastecidos:** soma dos litros registrados nos lançamentos de combustível.
- **Consumo médio:** ciclos válidos entre abastecimentos de tanque cheio, calculados por `quilômetros percorridos / litros acumulados`.
- **Custo por quilômetro:** relação entre o gasto e a distância calculada para o contexto filtrado.

Os ciclos de consumo são considerados válidos apenas quando há distância positiva e litros registrados. Isso evita indicadores distorcidos por cadastros incompletos.

## Temas e experiência visual

O aplicativo possui alternância entre **tema claro** e **tema escuro**, com a preferência salva localmente e restaurada na próxima abertura. A interface usa navegação inferior, ações rápidas, feedback visual, transições de página, safe areas para dispositivos móveis e componentes responsivos.

## Arquitetura

```text
src/
├── App.tsx                 Rotas, autenticação e ciclo principal do app
├── components/             Navegação, modais, tutorial e atualização
├── context/                Estado global, persistência e sincronização
├── lib/                    Cálculos, datas, imagens, notificações e integrações
├── pages/                  Telas e fluxos de negócio
├── index.css               Estilos globais e temas
├── main.tsx                Inicialização da aplicação
└── types.ts                Contratos de dados do domínio
```

O estado do aplicativo é mantido no contexto global e persistido no `localStorage`. Quando o Supabase está configurado, os dados do usuário são sincronizados com a tabela `app_state`, protegida por Row Level Security.

## Tecnologias utilizadas

### Front-end

- React 19 e TypeScript
- Vite
- React Router
- Tailwind CSS
- Lucide React
- Motion
- Recharts

### Plataforma e dados

- Progressive Web App com `vite-plugin-pwa`
- Capacitor 8 para Android
- Supabase Auth e banco PostgreSQL
- `localStorage` para persistencia local
- Web APIs e Capacitor Local Notifications
- Vercel para hospedagem web e funcoes serverless

### Qualidade e ferramentas

- Vitest para testes unitarios
- TypeScript em modo de verificacao estatica
- O script `lint` executa o TypeScript compiler em modo `noEmit`

## Como executar localmente

### Pre-requisitos

- Node.js 20 ou superior
- npm
- Android Studio e SDK Android, caso queira gerar o aplicativo Android

### Instalacao

```bash
npm install
copy .env.example .env.local
npm run dev
```

No macOS/Linux, use `cp .env.example .env.local` no lugar do comando `copy`. O endereco local padrao e `http://localhost:3000`.

### Variaveis de ambiente

Preencha apenas as variaveis necessarias em `.env.local` ou nas configuracoes da Vercel. Nunca publique valores reais no repositorio:

```env
VITE_APP_URL=https://ride-control.vercel.app
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
```

A chave `SUPABASE_SERVICE_ROLE_KEY` e exclusiva do ambiente do servidor e nao deve ser exposta ao navegador, ao APK ou ao GitHub. O arquivo `.env.example` contem somente nomes de variaveis e valores vazios para orientar a configuracao.

## Scripts disponiveis

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera a versao de producao |
| `npm run preview` | Serve a build localmente |
| `npm run lint` | Verifica os tipos TypeScript |
| `npm test` | Executa os testes unitarios |

## Build Android

O projeto Android esta em `android/` e utiliza o bundle web produzido pelo Vite. Para atualizar os arquivos nativos apos uma build web:

```bash
npm run build
npx cap sync android
```

Depois, abra o projeto no Android Studio para executar em um dispositivo ou gerar um APK/AAB assinado. Credenciais de assinatura, keystores e artefatos de release devem permanecer fora do Git.

## Publicacao na Vercel

1. Importe o repositorio na Vercel.
2. Use `npm run build` como comando de build.
3. Configure as variaveis publicas do Supabase no ambiente da Vercel.
4. Configure no Supabase a URL da implantacao e os redirects de autenticacao.
5. Publique e valide o fluxo web no desktop, Android e Safari/iPhone.

O arquivo `vercel.json` mantem o roteamento da SPA funcionando ao abrir diretamente qualquer rota e encaminha as funcoes da pasta `api/`.

## Privacidade e seguranca

O RideControl foi estruturado para nao versionar credenciais ou artefatos locais. O `.gitignore` exclui arquivos `.env`, builds, cobertura, diretorios da Vercel, propriedades locais do Android, keystores, APKs e AABs.

Os dados sincronizados pertencem a conta autenticada e as politicas de RLS devem permitir acesso somente ao proprio `user_id`. Consulte [PRIVACY_POLICY.md](PRIVACY_POLICY.md) para a politica de privacidade do aplicativo.

## Status do projeto

Projeto funcional em evolucao, com foco em gestao pessoal de motocicletas, acompanhamento financeiro e manutencao preventiva.

## Autor

Desenvolvido por **Alexsander de Assis Alcantara**.

Este repositorio apresenta a implementacao, as decisoes tecnicas e a arquitetura do RideControl para fins de portfolio e evolucao continua.
