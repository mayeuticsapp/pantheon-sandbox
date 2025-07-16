# Codice Completo TouristIQ - File Principali

## 1. server/index.ts
```typescript
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { setupRoutes } from './routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Setup API routes
setupRoutes(app);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist/client')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/client/index.html'));
  });
} else {
  // Development mode with Vite
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  
  app.use(vite.ssrFixStacktrace);
  app.use(vite.middlewares);
}

app.listen(port, '0.0.0.0', () => {
  console.log(`[express] serving on port ${port}`);
});
```

## 2. client/src/App.tsx
```typescript
import { Router, Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import LoginPage from '@/pages/login';
import HomePage from '@/pages/home';
import AdminDashboard from '@/pages/admin-dashboard';
import TouristDashboard from '@/pages/tourist-dashboard';
import StructureDashboard from '@/pages/structure-dashboard';
import PartnerDashboard from '@/pages/partner-dashboard';
import AdminUsers from '@/pages/admin-users';
import AdminIqcodes from '@/pages/admin-iqcodes';
import AdminAssignIqcodes from '@/pages/admin-assign-iqcodes';
import AdminStats from '@/pages/admin-stats';
import AdminSettings from '@/pages/admin-settings';
import AdminManageRecharges from '@/pages/admin-manage-recharges';
import { apiRequest } from '@/lib/queryClient';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: ({ queryKey }) => apiRequest(queryKey[0] as string),
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-background">
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/login" component={LoginPage} />
            <Route path="/admin" component={AdminDashboard} />
            <Route path="/admin/users" component={AdminUsers} />
            <Route path="/admin/iqcodes" component={AdminIqcodes} />
            <Route path="/admin/assign-iqcodes" component={AdminAssignIqcodes} />
            <Route path="/admin/stats" component={AdminStats} />
            <Route path="/admin/settings" component={AdminSettings} />
            <Route path="/admin/manage-recharges" component={AdminManageRecharges} />
            <Route path="/tourist/:id" component={TouristDashboard} />
            <Route path="/structure/:id" component={StructureDashboard} />
            <Route path="/partner/:id" component={PartnerDashboard} />
            <Route>
              <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-gray-600">Pagina non trovata</p>
                </div>
              </div>
            </Route>
          </Switch>
        </div>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
```

## 3. client/src/lib/queryClient.ts
```typescript
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(endpoint, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export { QueryClient } from '@tanstack/react-query';
```

## 4. Passaggi per Importare su Replit

### Opzione A: Importare da Repository Git

1. **Crea il repository Git:**
   ```bash
   # Sul computer locale
   git init
   git add .
   git commit -m "Initial TouristIQ setup"
   git remote add origin https://github.com/TUO_USERNAME/touristiq.git
   git push -u origin main
   ```

2. **Su Replit:**
   - Vai su replit.com
   - Clicca "Create Repl"
   - Seleziona "Import from GitHub"
   - Inserisci: `https://github.com/TUO_USERNAME/touristiq`
   - Clicca "Import from GitHub"

### Opzione B: Creare Manualmente su Replit

1. **Crea nuovo Repl:**
   - Vai su replit.com
   - Clicca "Create Repl"
   - Seleziona "Node.js"
   - Nome: "TouristIQ"

2. **Copia i file:**
   - Crea la struttura cartelle come nella guida
   - Copia tutti i file dal documento precedente
   - Incolla il codice nei rispettivi file

### Configurazione Essenziale

1. **Aggiungi PostgreSQL:**
   - Vai su "Tools" → "Database"
   - Seleziona "PostgreSQL"
   - Clicca "Add Database"

2. **File .env:**
   ```env
   DATABASE_URL=postgresql://[dal_database_replit]
   OPENAI_API_KEY=sk-[tua_chiave_openai]
   NODE_ENV=development
   ```

3. **Workflow Configuration (.replit):**
   ```toml
   modules = ["nodejs-20", "postgresql-16"]
   run = "npm run dev"

   [nix]
   channel = "stable-24_05"

   [deployment]
   run = ["sh", "-c", "npm run build && npm start"]

   [[ports]]
   localPort = 5000
   externalPort = 80
   ```

4. **Installa dipendenze:**
   ```bash
   npm install
   ```

5. **Configura database:**
   ```bash
   npm run db:push
   ```

6. **Inserisci dati di test (SQL):**
   ```sql
   -- Admin
   INSERT INTO iq_codes (code, role, is_active, internal_note) 
   VALUES ('TIQ-IT-ADMIN', 'admin', true, '{"credits_remaining": 1000, "credits_used": 0}');

   -- Strutture
   INSERT INTO iq_codes (code, role, is_active, internal_note) 
   VALUES 
   ('TIQ-VV-STT-9576', 'structure', true, '{"businessName": "Resort Capo Vaticano", "approved": true}'),
   ('TIQ-RC-STT-4334', 'structure', true, '{"businessName": "Grand Hotel Reggio", "approved": true}');

   -- Partner
   INSERT INTO iq_codes (code, role, is_active, internal_note) 
   VALUES 
   ('TIQ-VV-PRT-2250', 'partner', true, '{"businessName": "Ristorante Il Borgo", "completed": true}'),
   ('TIQ-RC-PRT-5842', 'partner', true, '{"businessName": "Boutique Calabria", "completed": true}');

   -- Turisti
   INSERT INTO iq_codes (code, role, is_active, guest_name) 
   VALUES 
   ('TIQ-IT-MARE', 'tourist', true, 'Mario Rossi'),
   ('TIQ-IT-SOLE', 'tourist', true, 'Anna Bianchi');

   -- Offerte
   INSERT INTO partner_offers (partner_code, partner_name, title, description, discount_percentage) 
   VALUES 
   ('TIQ-VV-PRT-2250', 'Ristorante Il Borgo', 'Menu Degustazione', 'Menu tipico calabrese con prodotti locali', 15),
   ('TIQ-RC-PRT-5842', 'Boutique Calabria', 'Abbigliamento Estivo', 'Collezione primavera/estate moda calabrese', 20);
   ```

7. **Avvia l'applicazione:**
   ```bash
   npm run dev
   ```

### Credenziali di Test

- **Admin:** `TIQ-IT-ADMIN`
- **Struttura:** `TIQ-VV-STT-9576` o `TIQ-RC-STT-4334`
- **Partner:** `TIQ-VV-PRT-2250` o `TIQ-RC-PRT-5842`
- **Turista:** `TIQ-IT-MARE` o `TIQ-IT-SOLE`

### Funzionalità Principali

1. **Sistema di autenticazione basato su IQCode**
2. **Dashboard personalizzate per ogni ruolo**
3. **Sistema di validazione partner-turista**
4. **Gestione offerte partner**
5. **Mini-gestionale contabile**
6. **Sistema di ricariche SumUp**
7. **Generazione PDF reports**
8. **Chat TIQai (richiede OPENAI_API_KEY)**

### Risoluzione Problemi Comuni

1. **Database non si connette:**
   - Verifica DATABASE_URL in .env
   - Controlla che PostgreSQL sia attivo in Replit

2. **Errori di build:**
   - Esegui `npm install` per reinstallare dipendenze
   - Verifica che Node.js sia versione 20+

3. **Sessioni non funzionano:**
   - Controlla che i cookie siano abilitati
   - Verifica che il dominio sia corretto

4. **API non risponde:**
   - Controlla i log del server
   - Verifica che tutte le dipendenze siano installate

Questa guida ti permette di ricreare completamente TouristIQ su qualsiasi account Replit con tutte le funzionalità operative e i dati di test necessari per iniziare immediatamente.