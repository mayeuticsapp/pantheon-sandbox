// Test script per avviare build collaborativo DeCalabria
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5001/api';

// Simulate authenticated user (in production would use real JWT)
const headers = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer test-token' // Mock per test
};

async function testDeCalabriaBuild() {
  console.log('🚀 Avviando build collaborativo sito DeCalabria...\n');

  // Step 1: Start collaborative build
  const buildRequest = {
    workspaceId: 'workspace-decalabria-2025',
    projectName: 'decalabria-website',
    description: 'Sito web per chiosco DeCalabria al Borough Market di Londra, specializzato in cibo calabrese autentico',
    requirements: [
      'Homepage accogliente con storia del chiosco',
      'Menu completo con piatti calabresi tradizionali',
      'Sezione location con info Borough Market',
      'Galleria foto dei piatti',
      'Contatti e orari apertura',
      'Design responsive mobile-first',
      'Colori e atmosfera mediterranea',
      'SEO ottimizzato per ricerche locali Londra'
    ]
  };

  console.log('📋 Richiesta build:', JSON.stringify(buildRequest, null, 2));

  try {
    const response = await fetch(`${API_BASE}/builder/build`, {
      method: 'POST',
      headers,
      body: JSON.stringify(buildRequest)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('\n✅ Build avviato con successo!');
      console.log('Task ID:', result.taskId);
      console.log('AI Team:', result.assignedAI.join(', '));
      console.log('Status:', result.status);
      console.log('Current Step:', result.currentStep);
      
      // Monitor build progress
      await monitorBuildProgress(result.taskId);
      
    } else {
      const error = await response.json();
      console.error('❌ Errore avvio build:', error);
    }

  } catch (error) {
    console.error('❌ Errore connessione:', error.message);
  }
}

async function monitorBuildProgress(taskId) {
  console.log('\n📊 Monitoraggio progresso build...\n');
  
  let completed = false;
  let attempts = 0;
  const maxAttempts = 60; // 5 minuti max
  
  while (!completed && attempts < maxAttempts) {
    try {
      const response = await fetch(`${API_BASE}/builder/tasks/${taskId}`, {
        headers
      });
      
      if (response.ok) {
        const status = await response.json();
        
        console.log(`[${new Date().toLocaleTimeString()}] Status: ${status.status} | Step: ${status.currentStep}`);
        console.log(`Files: ${status.progress.filesCreated} | AI: ${status.progress.assignedAI.join(', ')}`);
        
        // Show recent log entries
        if (status.recentLog && status.recentLog.length > 0) {
          console.log('Recent Activity:');
          status.recentLog.forEach(log => {
            const icon = log.success ? '✅' : '❌';
            console.log(`  ${icon} ${log.aiId}: ${log.action} - ${log.details}`);
          });
        }
        
        if (status.status === 'completed') {
          completed = true;
          console.log('\n🎉 Build completato con successo!');
          await downloadProject(taskId);
        } else if (status.status === 'failed') {
          console.log('\n❌ Build fallito');
          completed = true;
        }
        
        console.log('─'.repeat(60));
        
      } else {
        console.log('❌ Errore nel recupero status');
      }
      
    } catch (error) {
      console.log('❌ Errore monitoraggio:', error.message);
    }
    
    attempts++;
    if (!completed) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    }
  }
  
  if (!completed) {
    console.log('\n⏱️ Timeout monitoraggio - controlla manualmente il progresso');
  }
}

async function downloadProject(taskId) {
  console.log('\n📦 Preparando download progetto...');
  
  try {
    // Get project files list first
    const filesResponse = await fetch(`${API_BASE}/builder/tasks/${taskId}/files`, {
      headers
    });
    
    if (filesResponse.ok) {
      const filesData = await filesResponse.json();
      console.log(`\n📁 Progetto completato: ${filesData.totalFiles} file generati`);
      console.log('File creati:');
      
      filesData.files.forEach(file => {
        console.log(`  📄 ${file.path} (${file.size} chars) - by ${file.createdBy}`);
      });
      
      console.log(`\n🔗 Per scaricare il progetto completo:
      curl -H "Authorization: Bearer test-token" \\
           "${API_BASE}/builder/tasks/${taskId}/download" \\
           -o decalabria-website.zip`);
      
    } else {
      console.log('❌ Errore nel recupero lista file');
    }
    
  } catch (error) {
    console.log('❌ Errore preparazione download:', error.message);
  }
}

// Avvia il test
testDeCalabriaBuild();