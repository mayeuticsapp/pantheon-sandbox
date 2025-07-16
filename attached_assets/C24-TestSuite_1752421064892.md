# C24 Test Suite Automatica
## Sistema di Verifica Continua TouristIQ

**Versione:** 1.0
**Ultima Esecuzione:** 10/07/2025 - 21:45

---

## 🔍 TEST ENDPOINTS CORE

### Authentication System
- [ ] **POST /api/auth/login** - Verifica login turista
- [ ] **POST /api/auth/login** - Verifica login partner  
- [ ] **POST /api/auth/login** - Verifica login struttura
- [ ] **GET /api/auth/me** - Verifica sessione attiva
- [ ] **POST /api/auth/logout** - Verifica logout

### Tourist Module
- [ ] **GET /api/tourist/real-offers** - Verifica offerte disponibili
- [ ] **GET /api/tourist/one-time-codes** - Verifica codici TIQ-OTC
- [ ] **POST /api/tourist/generate-otc** - Verifica generazione codici
- [ ] **GET /api/check-custode-status** - Verifica custode codice

### Partner Module  
- [ ] **GET /api/partner/offers** - Verifica offerte partner
- [ ] **POST /api/partner/offers** - Verifica creazione offerte
- [ ] **POST /api/partner/validate-otc** - Verifica validazione TIQ-OTC
- [ ] **GET /api/partner/onboarding-status** - Verifica onboarding

### Structure Module
- [ ] **GET /api/structure/guests** - Verifica gestione ospiti
- [ ] **GET /api/structure/credits** - Verifica crediti disponibili
- [ ] **POST /api/structure/assign-iqcode** - Verifica assegnazione codici

### Admin Module
- [ ] **GET /api/admin/users** - Verifica lista utenti
- [ ] **GET /api/admin/stats** - Verifica statistiche sistema
- [ ] **POST /api/admin/generate-iqcode** - Verifica generazione codici

---

## 🎯 TEST SCENARI UTENTE

### Scenario Turista Completo
1. **Login** con codice IQ emozionale
2. **Visualizzazione offerte** disponibili
3. **Generazione TIQ-OTC** per validazione
4. **Accesso TIQai Chat** per assistenza
5. **Cambio lingua** interfaccia

### Scenario Partner Completo
1. **Login** con codice partner
2. **Completamento onboarding** se necessario
3. **Creazione offerta** per turisti
4. **Validazione TIQ-OTC** ricevuto
5. **Accesso mini-gestionale**

### Scenario Struttura Completo
1. **Login** con codice struttura
2. **Gestione ospiti** registrati
3. **Assegnazione IQCode** a ospiti
4. **Verifica crediti** disponibili
5. **Utilizzo mini-gestionale**

---

## 🔄 VERIFICHE AUTOMATICHE

### Data Integrity Checks
- [ ] **Offerte Partner** - Verifica associazione corretta partnerCode
- [ ] **Codici TIQ-OTC** - Verifica unicità e stato utilizzo
- [ ] **Sessioni Utente** - Verifica validità e scadenza
- [ ] **Traduzioni** - Verifica completezza chiavi i18n

### Performance Checks
- [ ] **Endpoint Response Time** - Verifica < 500ms
- [ ] **Database Query Time** - Verifica < 100ms
- [ ] **Frontend Load Time** - Verifica < 2s
- [ ] **Memory Usage** - Verifica < 512MB

### Security Checks
- [ ] **Session Validation** - Verifica token sicurezza
- [ ] **Role-Based Access** - Verifica autorizzazioni
- [ ] **Data Sanitization** - Verifica input utente
- [ ] **API Rate Limiting** - Verifica limiti richieste

---

## 📊 RISULTATI ULTIMI TEST

### Tutti i test: **NON ANCORA ESEGUITI**
**Prossima esecuzione programmata:** Dopo configurazione completa

---

## 🛠️ CONFIGURAZIONE AUTOMATICA

### Frequenza Esecuzione
- **Test Critici:** Ogni 1 ora
- **Test Completi:** Ogni 6 ore  
- **Test Performance:** Ogni 12 ore
- **Test Sicurezza:** Ogni 24 ore

### Trigger Automatici
- **Post-Deployment:** Sempre
- **Post-Fix:** Sempre
- **Alert Anomalie:** Immediato
- **Scheduled:** Programmati

---

**Sistema C24-SWEEP Test Suite**
**Generato automaticamente - 10/07/2025**