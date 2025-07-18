// Test diretto API PantheonSandbox per DeCalabria
import http from 'http';

const buildData = JSON.stringify({
  workspaceId: 'ws-decalabria-test',
  projectName: 'decalabria-website',
  description: 'Sito web professionale per chiosco DeCalabria al Borough Market di Londra, specializzato in autentico cibo calabrese',
  requirements: [
    'Homepage elegante con storia del chiosco',
    'Menu dettagliato piatti calabresi autentici', 
    'Sezione location Borough Market con mappa',
    'Galleria fotografica piatti appetitosi',
    'Contatti e orari apertura chiari',
    'Design responsive mobile-first',
    'Palette colori mediterranea calabrese',
    'SEO ottimizzato per ricerche Londra food'
  ]
});

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/builder/build',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer demo-token',
    'Content-Length': Buffer.byteLength(buildData)
  }
};

console.log('🚀 Avviando costruzione sito DeCalabria con AI Team...\n');
console.log('📋 Richiesta:', JSON.parse(buildData));

const req = http.request(options, (res) => {
  console.log(`\n📡 Status: ${res.statusCode}`);
  console.log('📨 Headers:', res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (res.statusCode === 201) {
        console.log('\n✅ Build avviato con successo!');
        console.log('🆔 Task ID:', response.taskId);
        console.log('👥 AI Team:', response.assignedAI?.join(', ') || 'Assegnazione in corso');
        console.log('📊 Status:', response.status);
        console.log('🔄 Current Step:', response.currentStep);
        console.log('⏰ Started:', response.startedAt);
        
        // Start monitoring
        monitorProgress(response.taskId);
        
      } else {
        console.log('\n❌ Errore avvio build:');
        console.log(JSON.stringify(response, null, 2));
      }
      
    } catch (error) {
      console.log('\n❌ Errore parsing response:', error.message);
      console.log('Raw data:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Errore richiesta:', error.message);
});

req.write(buildData);
req.end();

function monitorProgress(taskId) {
  console.log('\n📊 Avvio monitoraggio progresso...\n');
  
  const checkProgress = () => {
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: `/api/builder/tasks/${taskId}`,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer demo-token'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      
      res.on('end', () => {
        try {
          const status = JSON.parse(data);
          const timestamp = new Date().toLocaleTimeString();
          
          console.log(`[${timestamp}] 📋 Status: ${status.status}`);
          console.log(`[${timestamp}] 🔄 Step: ${status.currentStep}`);
          console.log(`[${timestamp}] 📁 Files: ${status.progress?.filesCreated || 0}`);
          console.log(`[${timestamp}] 👥 Team: ${status.progress?.assignedAI?.join(', ') || 'Working'}`);
          
          if (status.recentLog && status.recentLog.length > 0) {
            console.log(`[${timestamp}] 📝 Recent Activity:`);
            status.recentLog.forEach(log => {
              const icon = log.success ? '✅' : '❌';
              console.log(`  ${icon} ${log.aiId}: ${log.action}`);
            });
          }
          
          console.log('─'.repeat(50));
          
          if (status.status === 'completed') {
            console.log('\n🎉 SITO DECALABRIA COMPLETATO!');
            showDownloadInfo(taskId);
          } else if (status.status === 'failed') {
            console.log('\n❌ Build fallito');
          } else {
            // Continue monitoring
            setTimeout(checkProgress, 8000); // Check every 8 seconds
          }
          
        } catch (error) {
          console.log(`❌ Errore status: ${error.message}`);
          setTimeout(checkProgress, 10000);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Errore monitoraggio: ${error.message}`);
      setTimeout(checkProgress, 10000);
    });

    req.end();
  };

  // Start monitoring after 3 seconds
  setTimeout(checkProgress, 3000);
}

function showDownloadInfo(taskId) {
  console.log(`\n📦 Per scaricare il sito DeCalabria completo:
  
  curl -H "Authorization: Bearer demo-token" \\
       "http://localhost:5001/api/builder/tasks/${taskId}/download" \\
       -o decalabria-website.zip
       
  🌐 Il sito sarà pronto per essere caricato online!`);
}