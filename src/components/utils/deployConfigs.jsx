/**
 * Configurações de Deploy para SPA Routing
 * Este arquivo contém as configurações necessárias para diferentes platafornas
 */

export const NGINX_CONFIG = `
# === PATCH NGINX PARA SPA ROUTING ===
# Adicione este bloco ao seu nginx.conf existente

server {
    # ... configurações existentes ...

    # PRESERVE /api/* routes - não reescrever
    location /api/ {
        # Pass through to API backend (Base44)
        proxy_pass https://base44.app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA FALLBACK - reescrever tudo para index.html
    location / {
        try_files $uri $uri/ /index.html;
        
        # Headers para SPA
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
        
        # CORS se necessário
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Authorization";
    }

    # Assets estáticos com cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
}

# === TESTES DE SMOKE ===
# Para testar, execute:
# curl -I http://yourdomain.com/public-briefing/test123
# curl -I http://yourdomain.com/api/health
`;

export const VERCEL_CONFIG = `
{
  "name": "evocto-spa",
  "version": 2,
  "builds": [
    {
      "src": "build/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "comment": "PRESERVE: API routes - não reescrever",
      "src": "/api/(.*)",
      "dest": "https://base44.app/api/$1",
      "headers": {
        "X-Forwarded-Host": "$host"
      }
    },
    {
      "comment": "STATIC: Assets com cache",
      "src": "/static/(.*)",
      "dest": "/static/$1",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    },
    {
      "comment": "SPA FALLBACK: Todas outras rotas para index.html",
      "src": "/(.*)",
      "dest": "/index.html",
      "headers": {
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    }
  ],
  "functions": {
    "src/functions/*.js": {
      "runtime": "nodejs18.x"
    }
  }
}
`;

export const NETLIFY_CONFIG = `
# === PATCH _redirects PARA SPA ROUTING ===
# Adicione ao arquivo _redirects existente ou crie novo

# PRESERVE: API routes - proxy para Base44
/api/*  https://base44.app/api/:splat  200!

# STATIC: Assets (opcional - Netlify já otimiza)
/static/*  /static/:splat  200

# SPA FALLBACK: Todas outras rotas para index.html  
/*    /index.html   200

# === HEADERS para SPA ===
# Arquivo: _headers (criar se não existir)

/*
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

/index.html
  Cache-Control: no-cache, no-store, must-revalidate

/static/*
  Cache-Control: public, max-age=31536000, immutable

# === TESTES NETLIFY ===
# netlify.toml (adicionar ao existente)

[build]
  # ... configurações existentes ...
  
[build.environment]
  # Variáveis de teste
  REACT_APP_SPA_ROUTING_TEST = "enabled"

[[redirects]]
  # API preservation test
  from = "/api/*"
  to = "https://base44.app/api/:splat"
  status = 200
  force = true

[[redirects]]  
  # SPA fallback test
  from = "/*"
  to = "/index.html"
  status = 200
`;

export const CLOUDFRONT_CONFIG = `
{
  "comment": "SPA Routing para Evocto - PATCH CloudFront",
  "behaviors": [
    {
      "comment": "PRESERVE: API routes",
      "pathPattern": "/api/*",
      "targetOriginId": "base44-api",
      "viewerProtocolPolicy": "redirect-to-https",
      "cachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
      "compress": true
    },
    {
      "comment": "STATIC: Assets com cache longo",
      "pathPattern": "/static/*",
      "targetOriginId": "s3-static-assets", 
      "viewerProtocolPolicy": "redirect-to-https",
      "cachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
      "compress": true
    },
    {
      "comment": "SPA FALLBACK: Default behavior",
      "pathPattern": "*",
      "targetOriginId": "s3-spa-app",
      "viewerProtocolPolicy": "redirect-to-https",
      "cachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
      "compress": true,
      "customErrorResponses": [
        {
          "errorCode": 404,
          "responseCode": 200,
          "responsePagePath": "/index.html",
          "errorCachingMinTTL": 300
        },
        {
          "errorCode": 403,
          "responseCode": 200, 
          "responsePagePath": "/index.html",
          "errorCachingMinTTL": 300
        }
      ]
    }
  ]
}
`;