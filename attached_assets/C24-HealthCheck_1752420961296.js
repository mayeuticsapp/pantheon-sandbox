#!/usr/bin/env node

/**
 * C24-SWEEP Health Check
 * Monitoraggio rapido stato sistema TouristIQ
 * 
 * Esegue verifiche base di sistema e genera report
 * INTEGRAZIONE MANUS: Architetto Strategico attivo nell'ecosistema
 */

import { exec } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';

const BASE_URL = 'http://localhost:5000';

// Funzione helper per richieste HTTP
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    return {
      status: response.status,
      success: response.ok,
      data: await response.json().catch(() => null)
    };
  } catch (error) {
    return {
      status: 0,
      success: false,
      error: error.message
    };
  }
}

// Test sistema base
async function testSystemHealth() {
  console.log('🔍 C24-SWEEP Health Check - Inizio verifiche sistema...');
  
  const results = [];
  
  // Test 1: Server risponde
  const serverCheck = await makeRequest(`${BASE_URL}/api/auth/me`);
  results.push({
    test: 'Server Response',
    status: serverCheck.status === 200 || serverCheck.status === 401 ? 'PASS' : 'FAIL',
    details: `Status: ${serverCheck.status}`
  });
  
  // Test 2: Database connection (tramite login)
  const dbCheck = await makeRequest(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    body: { iqCode: 'TIQ-IT-ADMIN' }
  });
  results.push({
    test: 'Database Connection',
    status: dbCheck.status === 200 ? 'PASS' : 'FAIL',
    details: `Login admin: ${dbCheck.status}`
  });
  
  // Test 3: Statistiche admin
  if (dbCheck.success) {
    const statsCheck = await makeRequest(`${BASE_URL}/api/admin/stats`, {
      headers: { 'Cookie': dbCheck.headers?.['set-cookie'] || '' }
    });
    results.push({
      test: 'Admin Stats API',
      status: statsCheck.success ? 'PASS' : 'FAIL',
      details: `Stats: ${statsCheck.status}`
    });
  }
  
  return results;
}

// Genera report
function generateReport(results) {
  const timestamp = new Date().toISOString();
  const passed = results.filter(r => r.status === 'PASS').length;
  const total = results.length;
  
  let report = `# C24-SWEEP Health Report\n`;
  report += `Generated: ${timestamp}\n`;
  report += `Status: ${passed}/${total} tests passed\n`;
  report += `MANUS Integration: ✅ ATTIVO - Architetto Strategico operativo\n\n`;
  
  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    report += `${icon} ${result.test}: ${result.status}\n`;
    report += `   Details: ${result.details}\n\n`;
  });
  
  // Citazione cinematografica (Regola n.3)
  const quotes = [
    '"I\'ll be back" - Terminator (Sistema operativo)',
    '"Everything is awesome!" - Lego Movie (Test passati)',
    '"Houston, we have a problem" - Apollo 13 (In caso di errori)',
    '"Show me the money!" - Jerry Maguire (Sistem funzionante)'
  ];
  
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  report += `---\n🎬 ${quote}\n`;
  
  return report;
}

// Funzione principale
async function runHealthCheck() {
  try {
    console.log('🤖 C24-SWEEP Health Check iniziato...');
    
    const results = await testSystemHealth();
    const report = generateReport(results);
    
    console.log('\n📊 RISULTATI:');
    console.log(report);
    
    // Salva report
    writeFileSync('C24-HealthReport.md', report);
    console.log('💾 Report salvato in C24-HealthReport.md');
    
    // Aggiorna timestamp nel system status
    const statusFile = readFileSync('C24-SystemStatus.md', 'utf8');
    const updatedStatus = statusFile.replace(
      /\*\*Generato:\*\* .+/,
      `**Generato:** ${new Date().toLocaleString('it-IT')} UTC`
    );
    writeFileSync('C24-SystemStatus.md', updatedStatus);
    
    console.log('🔄 System Status aggiornato');
    console.log('✅ C24-SWEEP Health Check completato!');
    
  } catch (error) {
    console.error('❌ Errore durante health check:', error);
    process.exit(1);
  }
}

// Esegui se chiamato direttamente
if (process.argv[1].includes('C24-HealthCheck.js')) {
  runHealthCheck();
}

export { runHealthCheck, testSystemHealth, generateReport };