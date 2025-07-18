# PantheonSandbox - Deployment Guide

## 🚀 Deployment su Replit

### Configurazione Ambiente

1. **Variabili Ambiente (Secrets)**
```bash
# Database (già configurato)
DATABASE_URL=postgresql://...

# AI API Keys 
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
PERPLEXITY_API_KEY=pplx-...

# Security
JWT_SECRET=your-ultra-secure-jwt-secret-key
ENCRYPTION_KEY=your-32-character-encryption-key

# Environment
NODE_ENV=production
PORT=5001
```

2. **Database Setup**
```bash
# Push schema to database
npm run db:push

# Verify database connection
npm run db:studio
```

### Build & Deploy

1. **Build Application**
```bash
npm run build
```

2. **Start Production Server**
```bash
npm start
```

### Replit Specific Configuration

#### .replit
```toml
[nix]
channel = "stable-24.05"

[deployment]
run = ["npm", "start"]
deploymentTarget = "cloudrun"
ignorePorts = false

[[ports]]
localPort = 5001
externalPort = 80
```

#### Dockerfile (se necessario)
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY public ./public

EXPOSE 5001

CMD ["npm", "start"]
```

## 🔧 Configurazione Post-Deploy

### 1. Verifica Health Check
```bash
curl https://your-repl-url.replit.app/health
```

### 2. Test Autenticazione
```bash
curl -X POST https://your-repl-url.replit.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@pantheon.dev",
    "password": "SecurePassword123!",
    "role": "admin"
  }'
```

### 3. Verifica AI Services
```bash
curl https://your-repl-url.replit.app/api/ai/personalities
```

## 🔒 Security Checklist Pre-Deploy

- [ ] JWT_SECRET configurato (minimo 32 caratteri)
- [ ] ENCRYPTION_KEY configurato (esattamente 32 caratteri)
- [ ] DATABASE_URL sicuro e accessibile
- [ ] API Keys AI providers valide
- [ ] CORS configurato per dominio produzione
- [ ] Rate limiting attivo
- [ ] Helmet security headers attivi
- [ ] Audit logging funzionante

## 📊 Monitoring Post-Deploy

### Health Monitoring
```bash
# Check system health
curl https://your-repl-url.replit.app/health

# System info (admin only)
curl https://your-repl-url.replit.app/api/system/info \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Security events (admin only)  
curl https://your-repl-url.replit.app/api/security/events \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Database Monitoring
```bash
# Check database connection
npm run db:studio

# Monitor active sessions
# Check via admin dashboard quando implementato
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
```bash
# Verify DATABASE_URL format
echo $DATABASE_URL

# Test direct connection
npm run db:push
```

2. **AI API Errors**
```bash
# Check API keys
curl -H "Authorization: Bearer $ANTHROPIC_API_KEY" \
  https://api.anthropic.com/v1/messages

curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```

3. **JWT/Auth Issues**
```bash
# Verify JWT secret length
node -e "console.log(process.env.JWT_SECRET.length)"

# Test token generation
curl -X POST https://your-repl-url.replit.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password"}'
```

### Log Analysis
```bash
# Security logs
tail -f logs/security.log

# Application logs  
tail -f logs/application.log

# Error logs
tail -f logs/error.log
```

## 📈 Performance Optimization

### Production Settings
```javascript
// Environment variables
NODE_ENV=production
PORT=5001

// Database connection pooling
DATABASE_POOL_SIZE=10
DATABASE_TIMEOUT=30000

// Rate limiting
RATE_LIMIT_WINDOW=900000  // 15 minutes
RATE_LIMIT_MAX=100        // requests per window
```

### Scaling Considerations
- **Database**: PostgreSQL con connection pooling
- **Memory**: Minimo 512MB per istanza
- **CPU**: 1 vCPU sufficiente per start
- **Storage**: 10GB per logs e cache
- **Network**: CDN per assets statici

## 🔄 Update Strategy

### Rolling Updates
1. Build nuova versione
2. Test in ambiente staging
3. Deploy con zero-downtime
4. Monitor health checks
5. Rollback se necessario

### Database Migrations
```bash
# Create migration
npm run db:migrate

# Apply migration
npm run db:push

# Verify schema
npm run db:studio
```

## 🛡️ Security Maintenance

### Regular Tasks
- [ ] Rotate JWT secrets (ogni 30 giorni)
- [ ] Update API keys se richiesto
- [ ] Review security logs (settimanale)
- [ ] Update dependencies (mensile)
- [ ] Backup database (giornaliero)

### Emergency Procedures
- Disable compromised API keys
- Revoke all sessions se breach
- Enable maintenance mode
- Investigate security logs
- Report incident se necessario

---

**Deploy verificato e testato**  
*Pronto per produzione enterprise secondo standard Manus*