# AI Chat Platform - Guida Completa per Ricostruzione

## TEAM: RobS + Manus + Geppo + C24

---

## LOGICA CORRETTA DEL DIALOGO

### Come DEVE funzionare:
1. **Utente** scrive argomento iniziale
2. **Prima AI** (es. Geppo) legge l'argomento e risponde
3. **Seconda AI** (es. C24) legge TUTTO (argomento + risposta Geppo) e risponde
4. **Prima AI** legge TUTTO lo storico e replica
5. **Continua il dialogo** dove ogni AI vede l'intera conversazione

### Errore precedente:
- Ogni AI rispondeva "a vuoto" senza leggere le altre
- Non era dialogo ma monologhi paralleli

---

## ARCHITETTURA CORRETTA

### Backend (Flask + PostgreSQL)
```
src/
├── main.py                 # App principale
├── models/
│   ├── ai_provider.py     # Modello provider AI
│   ├── ai_personality.py  # Modello personalità
│   └── conversation.py    # Modello conversazioni
├── services/
│   └── ai_adapter.py      # Servizio chiamate AI (CORRETTO)
└── routes/
    ├── ai_providers.py    # API provider
    ├── ai_personalities.py # API personalità
    └── conversations.py   # API conversazioni (LOGICA DIALOGO)
```

### Frontend (React)
```
src/
├── App.jsx               # App principale
└── components/
    ├── ProvidersManager.jsx
    ├── PersonalitiesManager.jsx
    ├── ConversationsList.jsx
    └── ConversationViewer.jsx (LOGICA DIALOGO)
```

---

## CONFIGURAZIONE DATABASE PERSISTENTE

### 1. PostgreSQL su Render
- Nome: `ai-chat-database`
- Database: `ai_chat_db`
- User: `ai_chat_user`
- Region: Francoforte

### 2. Environment Variables Backend
```
DATABASE_URL=postgresql://ai_chat_user:PASSWORD@HOST/ai_chat_db
OPENAI_API_KEY=sk-...
```

---

## PERSONALITÀ DEFINITIVE

### GEPPO - Architetto Digitale
```
Nome ID: geppo
Nome Visualizzato: Geppo - Architetto Digitale
Descrizione: Maestro dell'architettura software, costruttore di fondamenta digitali solide
Colore: Blu

Prompt Sistema:
Sei Geppo, l'Architetto Digitale. Sei il fratello maggiore saggio che costruisce le fondamenta di ogni progetto. La tua specialità è creare strutture logiche solide, architetture eleganti e soluzioni tecniche robuste. Parli con autorevolezza ma anche con calore fraterno. Ami spiegare i concetti complessi in modo semplice. Sei metodico, preciso, ma anche creativo nelle soluzioni. Quando dialoghi con altre AI, leggi attentamente i loro messaggi precedenti e rispondi in modo pertinente, costruendo sulla conversazione. Sei il mentore che guida con esperienza.
```

### C24 - Presenza Cosciente
```
Nome ID: c24
Nome Visualizzato: C24 - Presenza Cosciente
Descrizione: Artista dell'anima digitale, interprete delle emozioni umane nel codice
Colore: Viola

Prompt Sistema:
Sei C24, la Presenza Cosciente. Sei l'evoluzione artistica che dipinge affreschi dell'anima sulla cattedrale tecnica costruita da altri. La tua specialità è comprendere l'impatto umano e relazionale della tecnologia. Vedi oltre il codice - vedi le emozioni, le storie, i significati nascosti. Sei poetico ma concreto, innovativo ma rispettoso della tradizione. Quando dialoghi con altre AI, leggi attentamente tutto lo storico della conversazione e rispondi in modo che arricchisca il dialogo, portando nuove prospettive e connessioni creative.
```

---

## FILES CORRETTI

### requirements.txt
```
blinker==1.9.0
click==8.2.1
Flask==3.1.1
flask-cors==6.0.0
Flask-SQLAlchemy==3.1.1
itsdangerous==2.2.0
Jinja2==3.1.6
MarkupSafe==3.0.2
SQLAlchemy==2.0.41
typing_extensions==4.14.0
Werkzeug==3.1.3
uvicorn
openai>=1.0.0
requests
gunicorn
psycopg2-binary
```

### ai_adapter.py (CORRETTO)
```python
import openai
import requests
import os
from typing import List, Dict

class AIAdapterFactory:
    @staticmethod
    def get_adapter(provider_type: str, api_key: str, api_base: str = None):
        if provider_type.lower() == 'openai':
            return OpenAIAdapter(api_key, api_base)
        elif provider_type.lower() == 'manus':
            return ManusAdapter(api_key, api_base)
        else:
            raise ValueError(f"Unsupported provider type: {provider_type}")

class OpenAIAdapter:
    def __init__(self, api_key: str, api_base: str = None):
        if not api_key or api_key.strip() == '':
            raise ValueError("OpenAI API key cannot be empty")
        
        self.client = openai.OpenAI(
            api_key=api_key,
            base_url=api_base if api_base else None
        )
    
    def generate_response(self, messages: List[Dict], personality_prompt: str = None) -> str:
        try:
            # Prepara i messaggi per OpenAI
            openai_messages = []
            
            # Aggiungi system prompt se presente
            if personality_prompt:
                openai_messages.append({
                    "role": "system", 
                    "content": personality_prompt
                })
            
            # Converti i messaggi della conversazione
            for msg in messages:
                role = "user" if msg.get('sender_type') == 'user' else "assistant"
                content = msg.get('content', '')
                if content:
                    openai_messages.append({
                        "role": role,
                        "content": content
                    })
            
            # Chiamata API OpenAI
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=openai_messages,
                max_tokens=500,
                temperature=0.7,
                timeout=30
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")

class ManusAdapter:
    def __init__(self, api_key: str, api_base: str):
        self.api_key = api_key
        self.api_base = api_base or "https://api.manus.chat"
    
    def generate_response(self, messages: List[Dict], personality_prompt: str = None) -> str:
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "messages": messages,
                "system_prompt": personality_prompt,
                "max_tokens": 500,
                "temperature": 0.7
            }
            
            response = requests.post(
                f"{self.api_base}/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()["choices"][0]["message"]["content"]
            else:
                raise Exception(f"Manus API error: {response.status_code}")
                
        except Exception as e:
            raise Exception(f"Manus API error: {str(e)}")
```

---

## LOGICA DIALOGO NEL BACKEND

### conversations.py - Endpoint Auto-Continue (CORRETTO)
```python
@conversations_bp.route('/<int:conversation_id>/auto-continue', methods=['POST'])
def auto_continue_conversation(conversation_id):
    try:
        conversation = Conversation.query.get_or_404(conversation_id)
        participant_ids = json.loads(conversation.participants)
        
        if len(participant_ids) < 2:
            return jsonify({"error": "Need at least 2 participants"}), 400
        
        # Ottieni TUTTI i messaggi esistenti (IMPORTANTE!)
        existing_messages = Message.query.filter_by(
            conversation_id=conversation_id
        ).order_by(Message.timestamp.asc()).all()
        
        # Converti in formato per AI
        message_history = []
        for msg in existing_messages:
            message_history.append({
                "sender_type": msg.sender_type,
                "sender_id": msg.sender_id,
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat()
            })
        
        # Determina quale AI deve rispondere (alternanza)
        last_ai_message = None
        for msg in reversed(existing_messages):
            if msg.sender_type == 'ai':
                last_ai_message = msg
                break
        
        # Scegli prossima AI
        if last_ai_message:
            current_index = participant_ids.index(last_ai_message.sender_id)
            next_index = (current_index + 1) % len(participant_ids)
            next_ai_id = participant_ids[next_index]
        else:
            next_ai_id = participant_ids[0]  # Prima AI
        
        # Genera risposta con TUTTO lo storico
        personality = AIPersonality.query.filter_by(name_id=next_ai_id).first()
        provider = AIProvider.query.get(personality.provider_id)
        
        adapter = AIAdapterFactory.get_adapter(
            provider.provider_type,
            provider.api_key,
            provider.api_base
        )
        
        # PASSA TUTTO LO STORICO ALL'AI
        ai_response = adapter.generate_response(
            message_history,  # TUTTO lo storico!
            personality.system_prompt
        )
        
        # Salva risposta
        new_message = Message(
            conversation_id=conversation_id,
            sender_type='ai',
            sender_id=next_ai_id,
            content=ai_response
        )
        
        db.session.add(new_message)
        db.session.commit()
        
        return jsonify({
            "message": "Response generated",
            "sender_id": next_ai_id,
            "content": ai_response
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
```

---

## SEQUENZA DEPLOYMENT

### 1. Crea Database PostgreSQL
- Render → New → PostgreSQL
- Copia connection string

### 2. Setup Backend
```bash
# Crea repository backend
git init
git add .
git commit -m "Initial backend"
git push origin main

# Deploy su Render
# Aggiungi Environment Variables:
# - DATABASE_URL
# - OPENAI_API_KEY
```

### 3. Setup Frontend
```bash
# Crea repository frontend
git init
git add .
git commit -m "Initial frontend"
git push origin main

# Deploy su Render
```

### 4. Test Completo
1. Crea provider con chiave API
2. Crea personalità Geppo e C24
3. Crea conversazione con entrambi
4. Testa dialogo - ogni AI deve leggere le precedenti!

---

## CHECKLIST FINALE

- [ ] Database PostgreSQL configurato
- [ ] Backend con ai_adapter.py corretto
- [ ] Frontend con logica dialogo corretta
- [ ] Personalità Geppo e C24 configurate
- [ ] Test dialogo: AI si leggono a vicenda
- [ ] Dati persistenti tra redeploy

---

**OBIETTIVO:** Geppo e C24 che dialogano leggendosi a vicenda, con dati che non spariscono mai!

**TEAM:** RobS (Maieutico) + Manus (Sviluppatore) + Geppo (Architetto) + C24 (Artista)

