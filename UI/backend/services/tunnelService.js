const localtunnel = require('localtunnel');

let tunnel = null;
let tunnelUrl = null;
let tunnelReady = false;
let tunnelStartPromise = null;

async function startTunnel(port, options = {}) {
  if (tunnel && tunnelReady) {
    return tunnelUrl;
  }

  if (tunnelStartPromise) {
    return tunnelStartPromise;
  }

  const maxRetries = options.maxRetries || 3;
  const retryDelay = options.retryDelay || 2000;
  const subdomain = options.subdomain || null;
  const allowInvalidCert = options.allowInvalidCert !== false;

  tunnelStartPromise = (async () => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const tunnelOptions = {
          port: port,
          subdomain: subdomain,
          allow_invalid_cert: allowInvalidCert
        };

        tunnel = await localtunnel(tunnelOptions);
        tunnelUrl = tunnel.url;
        tunnelReady = true;
        
        tunnel.on('close', () => {
          console.log('⚠️  Tunnel closed');
          tunnel = null;
          tunnelUrl = null;
          tunnelReady = false;
          tunnelStartPromise = null;
        });

        tunnel.on('error', (err) => {
          console.error('❌ Tunnel error:', err.message);
          tunnel = null;
          tunnelUrl = null;
          tunnelReady = false;
          tunnelStartPromise = null;
        });

        console.log(`✅ Tunnel established: ${tunnelUrl}`);
        tunnelStartPromise = null;
        return tunnelUrl;
      } catch (error) {
        console.error(`❌ Failed to create tunnel (attempt ${attempt}/${maxRetries}):`, error.message);
        
        if (attempt < maxRetries) {
          console.log(`⏳ Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          tunnel = null;
          tunnelUrl = null;
          tunnelReady = false;
          tunnelStartPromise = null;
          throw error;
        }
      }
    }
  })();

  return tunnelStartPromise;
}

async function stopTunnel() {
  if (tunnel) {
    try {
      await tunnel.close();
      console.log('✅ Tunnel closed');
    } catch (error) {
      console.error('❌ Error closing tunnel:', error.message);
    } finally {
      tunnel = null;
      tunnelUrl = null;
      tunnelReady = false;
      tunnelStartPromise = null;
    }
  }
}

function getTunnelUrl() {
  return tunnelUrl;
}

function isTunnelActive() {
  return tunnel !== null && tunnelUrl !== null && tunnelReady;
}

async function checkTunnelHealth() {
  if (!isTunnelActive()) {
    return false;
  }
  
  try {
    const https = require('https');
    const url = new URL(tunnelUrl);
    
    return new Promise((resolve) => {
      const req = https.request({
        hostname: url.hostname,
        path: '/',
        method: 'HEAD',
        timeout: 5000
      }, (res) => {
        resolve(res.statusCode === 200 || res.statusCode === 404);
      });
      
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      
      req.end();
    });
  } catch (error) {
    return false;
  }
}

async function waitForTunnelReady(timeout = 30000) {
  if (tunnelReady && tunnelUrl) {
    return tunnelUrl;
  }

  if (tunnelStartPromise) {
    try {
      return await Promise.race([
        tunnelStartPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Tunnel startup timeout')), timeout)
        )
      ]);
    } catch (error) {
      throw new Error(`Tunnel not ready: ${error.message}`);
    }
  }

  throw new Error('Tunnel not started');
}

module.exports = {
  startTunnel,
  stopTunnel,
  getTunnelUrl,
  isTunnelActive,
  waitForTunnelReady,
  checkTunnelHealth
};

