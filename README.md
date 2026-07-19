# Personal Finance Manager — Web (frontend)

Interface em **React + TypeScript + Vite** do gerenciador de finanças pessoais.
Consome a API em Laravel do projeto
[`personal-finance-manager`](../personal-finance-manager).

Permite gerenciar receitas, caixas e gastos; importar faturas de cartão (Nubank);
dividir a fatura por pessoa; **compartilhar a fatura por link** para cada pessoa
marcar o que é dela; e **exportar para Excel** respeitando o filtro por pessoa.

---

## Stack

- **React** 19 · **TypeScript** · **Vite** 8
- **Tailwind CSS** 4 + componentes estilo shadcn/ui (`src/components/ui`)
- **React Router** 7 · **react-i18next** (pt-BR)
- **Recharts** (gráficos) · **ExcelJS** (exportação .xlsx, carregado sob demanda)
- Autenticação via **cookie/sessão do Sanctum** (`credentials: include` + CSRF)

---

## Como rodar

Requer Node 18+ e a API rodando (por padrão em `http://localhost:8000`).

```bash
npm install

# configure a URL da API (veja abaixo)
cp .env.example .env   # se não existir, crie o .env manualmente

npm run dev            # http://localhost:5173
```

### Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Vite, porta 5173) |
| `npm run build` | Type-check (`tsc -b`) + build de produção em `dist/` |
| `npm run preview` | Serve o build de produção localmente |
| `npm run lint` | ESLint |

---

## Variáveis de ambiente

Arquivo `.env` na raiz do frontend:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

- `VITE_API_BASE_URL` — base da API. O cliente HTTP deriva daí a URL do
  `sanctum/csrf-cookie` (removendo o sufixo `/api`).

> A origem do frontend (`http://localhost:5173`) precisa estar liberada no CORS e
> em `SANCTUM_STATEFUL_DOMAINS` do backend, senão o login/sessão não funciona.

---

## Estrutura

```
src/
├── Services/api.ts       # todos os serviços de chamada à API
├── lib/
│   ├── api.ts            # cliente fetch (credentials + CSRF + erros)
│   ├── faturaAnalise.ts  # análise da fatura (totais, categorias, por pessoa)
│   ├── exportFatura.ts   # geração do .xlsx (ExcelJS)
│   └── format.ts         # formatação de moeda/data (pt-BR)
├── pages/
│   ├── auth/             # login / signup
│   └── pages/            # telas autenticadas + FaturaCompartilhada (pública)
├── routes/AppRoutes.tsx  # rotas (públicas, protegidas e o link público /f/:token)
├── components/ui/        # componentes base (button, card, select, ...)
├── types/                # tipos TypeScript compartilhados
└── i18n/locales/pt.json  # textos (pt-BR)
```

---

## Rotas principais

| Rota | Acesso | Tela |
|---|---|---|
| `/dashboard` | protegida | Painel |
| `/dashboard/faturas` | protegida | Lista de faturas |
| `/dashboard/faturas/importar` | protegida | Importar fatura (Nubank) |
| `/dashboard/faturas/:id` | protegida | Detalhe da fatura (análise, divisão, compartilhar, exportar) |
| `/dashboard/pessoas` | protegida | Pessoas da divisão |
| `/f/:token` | **pública** | Fatura compartilhada — a pessoa marca os itens dela |

---

## Destaques da tela de fatura (`/dashboard/faturas/:id`)

- **Filtro por pessoa** e recálculo dos totais ao vivo.
- **Estornos:** cada estorno pode ser incluído/excluído do total líquido.
- **Compartilhar:** gera um link único por pessoa (copiar/revogar) para ela marcar
  os itens dela sem precisar de conta.
- **Exportar Excel:** gera um `.xlsx` (resumo + transações) respeitando o filtro
  por pessoa aplicado na tela.
