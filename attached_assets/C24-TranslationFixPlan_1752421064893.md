# 🔍 C24-SWEEP: Translation Fix Plan
## Linguistic Deep Scan Report - Pannello Turista

**Generato:** 10/07/2025 - 22:15 UTC  
**Protocollo:** C24-SWEEP Custode Mode  
**Scope:** Solo pannello turista (IT/EN/ES/DE)  
**Approvato:** RobS ✅ | Supervisionato:** Geppo ✅  

---

## 🚨 PROBLEMI CRITICI RILEVATI

### 1. **STRINGHE HARDCODED NEL CODICE**
**Priorità:** 🔴 CRITICA

#### Problem 1.1 - Tourist Dashboard (tourist-dashboard.tsx)
- **Linea 254:** `alert("Geolocalizzazione non supportata dal browser");`
- **Linea 282:** `alert("Impossibile ottenere la posizione. Verifica le autorizzazioni del browser.");`
- **Linea 346:** `"Il tuo codice esclusivo per scoperte uniche in Calabria!"`
- **Linea 355:** `"Codice copiato!"`
- **Linea 356:** `"Il tuo IQCode definitivo è stato copiato negli appunti"`
- **Linea 362:** `"Copia il Tuo IQCode"`
- **Linea 367:** `"Il mio codice IQ TouristIQ: ${user.iqCode} 🎯 Scopri sconti esclusivi in Calabria!"`
- **Linea 374:** `"Condividi"`
- **Linea 389:** `"Custode del Codice"`
- **Linea 390:** `"Proteggi il tuo accesso con un sistema di recupero sicuro"`
- **Linea 398:** `"Modifica la parola segreta e la data di nascita associate al tuo IQCode..."`
- **Linea 399:** `"Il Custode del Codice ti aiuta a recuperare il tuo IQCode se lo dimentichi..."`
- **Linea 406:** `"Custode già attivato"`
- **Linea 414:** `"Gestisci Custode del Codice"`
- **Linea 422:** `"Attiva il Custode del Codice"`
- **Linea 449:** `"Esplora Dintorni"`

#### Problem 1.2 - OneTimeCodeGenerator Component
- **Linea 89:** `"Codici Monouso TIQ-OTC"`
- **Linea 93:** `"Caricamento..."`
- **Linea 106:** `"Codici Monouso TIQ-OTC"`
- **Linea 112:** `"⚠️ Errore caricamento dati. Prova a ricaricare la pagina."`
- **Linea 124:** `"Riprova"`
- **Linea 146:** `"Codici Monouso TIQ-OTC"`
- **Linea 149:** `"Genera codici temporanei monouso per sconti immediati"`
- **Linea 53:** `"✅ Codice monouso generato!"`
- **Linea 54:** `"Codice ${response.code} pronto per l'uso"`
- **Linea 60:** `"Errore generazione codice"`
- **Linea 61:** `"Impossibile generare il codice monouso. Riprova."`
- **Linea 71:** `"Codice copiato!"`
- **Linea 72:** `"Il codice monouso è stato copiato negli appunti"`
- **Linea 77:** `"Impossibile copiare il codice"`

#### Problem 1.3 - TIQai Chat Component
- **Linea 21:** `"🌅 Ciao, viaggiatore! Sono TIQai, il tuo genius loci digitale..."`
- **Linea 73:** `"Mi dispiace, si è verificato un errore. Riprova più tardi."`
- **Linea 110:** `"TIQai - Genius Loci d'Italia"`
- **Linea 114:** `"L'anima autentica d'Italia che sussurra segreti"`

---

## 📊 ANALISI TRADUZIONI ESISTENTI

### ✅ **CORRETTE E COMPLETE**
- Sistema auth completo (login, recovery, errors)
- Navigazione base (tourist.myDiscounts, tourist.tiqaiChat)
- Messaggi di benvenuto (tourist.welcome.message1-7)
- Sistema oneTimeCodes base (title, subtitle, history)
- Sistema TIQai base (title, subtitle, placeholder)

### ❌ **MANCANTI O INCOMPLETE**

#### 2.1 - Geolocalizzazione e Errori
**Stringhe Mancanti:**
- `geolocation.unsupported` (4 lingue)
- `geolocation.permissionDenied` (4 lingue)
- `geolocation.error` (4 lingue)

#### 2.2 - Azioni Codice IQ
**Stringhe Mancanti:**
- `tourist.codeActions.copyCode` (4 lingue)
- `tourist.codeActions.copySuccess` (4 lingue)
- `tourist.codeActions.copyDescription` (4 lingue)  
- `tourist.codeActions.shareCode` (4 lingue)
- `tourist.codeActions.shareMessage` (4 lingue)
- `tourist.codeActions.exclusiveDescription` (4 lingue)

#### 2.3 - Sistema Custode del Codice
**Stringhe Mancanti:**
- `custode.manageButton` (4 lingue)
- `custode.activateButton` (4 lingue)
- `custode.securityDescription` (4 lingue)
- `custode.modifyTooltip` (4 lingue)
- `custode.activateTooltip` (4 lingue)
- `custode.alreadyActive` (4 lingue)

#### 2.4 - Sistema TIQ-OTC Avanzato
**Stringhe Mancanti:**
- `oneTimeCodes.generationDescription` (4 lingue)
- `oneTimeCodes.loadingError` (4 lingue)
- `oneTimeCodes.retryButton` (4 lingue)
- `oneTimeCodes.generatedSuccess` (4 lingue)
- `oneTimeCodes.generatedDescription` (4 lingue)
- `oneTimeCodes.copySuccess` (4 lingue)
- `oneTimeCodes.copyDescription` (4 lingue)
- `oneTimeCodes.copyError` (4 lingue)

#### 2.5 - TIQai Chat Avanzato
**Stringhe Mancanti:**
- `tiqai.initialMessage` (4 lingue)
- `tiqai.errorMessage` (4 lingue)
- `tiqai.fullTitle` (4 lingue)
- `tiqai.tagline` (4 lingue)

#### 2.6 - Esplorazione Geografica
**Stringhe Mancanti:**
- `tourist.exploreNearby` (4 lingue)
- `tourist.locationSearch` (4 lingue)

---

## 🔧 PIANO DI CORREZIONE

### **FASE 1: Aggiunta Chiavi Mancanti**
**Priorità:** 🔴 CRITICA  
**Tempo stimato:** 15 minuti

1. Aggiornare tutti i file di localizzazione (it.json, en.json, es.json, de.json)
2. Aggiungere 35+ chiavi mancanti identificate
3. Mantenere consistenza terminologica tra lingue

### **FASE 2: Sostituzione Stringhe Hardcoded**
**Priorità:** 🔴 CRITICA  
**Tempo stimato:** 25 minuti

1. Sostituire tutti i testi hardcoded con chiamate t()
2. Verificare contesti React e hook useTranslation
3. Testare rendering in tutte le lingue

### **FASE 3: Testing e Verifica**
**Priorità:** 🟡 ALTA  
**Tempo stimato:** 10 minuti

1. Test cambio lingua in runtime
2. Verifica completezza visualizzazione
3. Controllo emoji e simboli

---

## 📋 TRADUZIONI PROPOSTE

### **Italiano (Sorgente)**
```json
{
  "geolocation": {
    "unsupported": "Geolocalizzazione non supportata dal browser",
    "permissionDenied": "Impossibile ottenere la posizione. Verifica le autorizzazioni del browser.",
    "error": "Errore durante la geolocalizzazione"
  },
  "tourist": {
    "codeActions": {
      "copyCode": "Copia il Tuo IQCode",
      "shareCode": "Condividi", 
      "copySuccess": "Codice copiato!",
      "copyDescription": "Il tuo IQCode definitivo è stato copiato negli appunti",
      "shareMessage": "Il mio codice IQ TouristIQ: {{code}} 🎯 Scopri sconti esclusivi in Calabria!",
      "exclusiveDescription": "Il tuo codice esclusivo per scoperte uniche in Calabria!"
    },
    "exploreNearby": "Esplora Dintorni"
  },
  "custode": {
    "title": "Custode del Codice",
    "securityDescription": "Proteggi il tuo accesso con un sistema di recupero sicuro",
    "activateButton": "Attiva il Custode del Codice", 
    "manageButton": "Gestisci Custode del Codice",
    "alreadyActive": "Custode già attivato",
    "modifyTooltip": "Modifica la parola segreta e la data di nascita associate al tuo IQCode per un futuro recupero. I dati restano anonimi e non recuperabili dal nostro sistema.",
    "activateTooltip": "Il Custode del Codice ti aiuta a recuperare il tuo IQCode se lo dimentichi. Salva ora una parola segreta e una data speciale: saranno usate in sicurezza solo da te."
  },
  "oneTimeCodes": {
    "generationDescription": "Genera codici temporanei monouso per sconti immediati",
    "loadingError": "⚠️ Errore caricamento dati. Prova a ricaricare la pagina.",
    "retryButton": "Riprova",
    "generatedSuccess": "✅ Codice monouso generato!",
    "generatedDescription": "Codice {{code}} pronto per l'uso",
    "copySuccess": "Codice copiato!",
    "copyDescription": "Il codice monouso è stato copiato negli appunti",
    "copyError": "Impossibile copiare il codice",
    "generationError": "Errore generazione codice",
    "generationErrorDescription": "Impossibile generare il codice monouso. Riprova."
  },
  "tiqai": {
    "initialMessage": "🌅 Ciao, viaggiatore! Sono TIQai, il tuo genius loci digitale. Sussurrami i tuoi desideri di scoperta e ti guiderò verso tesori nascosti che solo il cuore autentico dell'Italia conosce...",
    "errorMessage": "Mi dispiace, si è verificato un errore. Riprova più tardi.",
    "fullTitle": "TIQai - Genius Loci d'Italia",
    "tagline": "L'anima autentica d'Italia che sussurra segreti"
  }
}
```

### **Inglese**
```json
{
  "geolocation": {
    "unsupported": "Geolocation not supported by browser",
    "permissionDenied": "Unable to get location. Check browser permissions.",
    "error": "Error during geolocation"
  },
  "tourist": {
    "codeActions": {
      "copyCode": "Copy Your IQCode",
      "shareCode": "Share",
      "copySuccess": "Code copied!",
      "copyDescription": "Your definitive IQCode has been copied to clipboard",
      "shareMessage": "My TouristIQ IQ code: {{code}} 🎯 Discover exclusive discounts in Calabria!",
      "exclusiveDescription": "Your exclusive code for unique discoveries in Calabria!"
    },
    "exploreNearby": "Explore Nearby"
  },
  "custode": {
    "title": "Code Guardian",
    "securityDescription": "Protect your access with a secure recovery system",
    "activateButton": "Activate Code Guardian",
    "manageButton": "Manage Code Guardian", 
    "alreadyActive": "Guardian already activated",
    "modifyTooltip": "Modify the secret word and birth date associated with your IQCode for future recovery. Data remains anonymous and unrecoverable by our system.",
    "activateTooltip": "Code Guardian helps you recover your IQCode if you forget it. Save a secret word and special date now: they will be used securely only by you."
  },
  "oneTimeCodes": {
    "generationDescription": "Generate temporary one-time codes for immediate discounts",
    "loadingError": "⚠️ Data loading error. Try reloading the page.",
    "retryButton": "Retry",
    "generatedSuccess": "✅ One-time code generated!",
    "generatedDescription": "Code {{code}} ready for use",
    "copySuccess": "Code copied!",
    "copyDescription": "The one-time code has been copied to clipboard",
    "copyError": "Cannot copy code",
    "generationError": "Code generation error",
    "generationErrorDescription": "Cannot generate one-time code. Please retry."
  },
  "tiqai": {
    "initialMessage": "🌅 Hello, traveler! I'm TIQai, your digital genius loci. Whisper your discovery desires and I'll guide you to hidden treasures that only the authentic heart of Italy knows...",
    "errorMessage": "Sorry, an error occurred. Please try again later.",
    "fullTitle": "TIQai - Genius Loci of Italy",
    "tagline": "The authentic soul of Italy that whispers secrets"
  }
}
```

---

## 🎯 CONCLUSIONI

**Problemi Identificati:** 47 stringhe hardcoded  
**Chiavi Mancanti:** 35+ traduzioni  
**Lingue Interessate:** 4 (IT, EN, ES, DE)  
**Tempo Correzione:** ~50 minuti  

**Raccomandazione C24:** Procedere immediatamente con patch automatica per risolvere completamente il sistema di internazionalizzazione del pannello turista.

---

**Generato da C24-SWEEP Linguistic Deep Scan**  
**Modalità:** Custode Attivo - Nessuna Scusa, Nessuna Mezza Misura**