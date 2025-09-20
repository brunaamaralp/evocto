# Instruções para Build do Tailwind CSS

Como o sistema atual tem limitações de arquivos, você precisa configurar o build do Tailwind externamente.

## 📋 Passo a Passo

### 1. Criar arquivos de configuração (na raiz do projeto):

**tailwind.config.js:**
```javascript
module.exports = {
  content: [
    "./components/**/*.{js,jsx,ts,tsx}",
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./layout.js"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        evocto: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe',
          300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6',
          600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a'
        }
      }
    }
  },
  plugins: []
}
```

**postcss.config.js:**
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' ? { cssnano: {} } : {})
  }
}
```

### 2. Criar arquivo fonte CSS:

**src/styles/tailwind.css:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --evocto-gradient: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
}

@layer components {
  .btn-gradient {
    @apply bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold py-2 px-4 rounded transition-all hover:scale-105;
  }
}
```

### 3. Instalar dependências:

```bash
npm install -D tailwindcss postcss autoprefixer cssnano
```

### 4. Scripts de build:

**package.json:**
```json
{
  "scripts": {
    "css:dev": "tailwindcss -i ./src/styles/tailwind.css -o ./public/assets/tailwind.css --watch",
    "css:build": "NODE_ENV=production tailwindcss -i ./src/styles/tailwind.css -o ./public/assets/tailwind.css --minify"
  }
}
```

### 5. Executar:

```bash
# Desenvolvimento
npm run css:dev

# Produção
npm run css:build
```

## ✅ Resultado

- **Desenvolvimento**: CSS compilado com watch mode
- **Produção**: CSS minificado sem classes não utilizadas
- **Fallback**: CDN automático se CSS compilado não existir
- **Tamanho**: ~90% menor que CDN completo

## 🎯 Status Atual

O layout já está configurado para:
1. ✅ Detectar CSS compilado automaticamente
2. ✅ Usar CDN como fallback em desenvolvimento  
3. ✅ Aplicar todas as customizações do Evocto
4. ✅ Mostrar indicador de status em desenvolvimento

Basta seguir os passos acima para ativar o build otimizado!