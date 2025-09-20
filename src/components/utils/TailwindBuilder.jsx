// Utilitário para construção de CSS Tailwind otimizado
// Este componente gerencia a transição do CDN para CSS compilado

import React, { useState, useEffect } from 'react';

export function TailwindBuilder() {
  const [cssStatus, setCssStatus] = useState('loading');
  const [useCompiledCSS, setUseCompiledCSS] = useState(false);

  useEffect(() => {
    checkCSSAvailability();
  }, []);

  const checkCSSAvailability = async () => {
    try {
      // Verificar se existe CSS compilado
      const response = await fetch('/assets/tailwind.css', { method: 'HEAD' });
      
      if (response.ok) {
        setUseCompiledCSS(true);
        setCssStatus('compiled');
        console.log('✅ Using compiled Tailwind CSS');
      } else {
        throw new Error('Compiled CSS not found');
      }
    } catch (error) {
      // Fallback para CDN
      setUseCompiledCSS(false);
      setCssStatus('cdn');
      console.log('⚠️ Using Tailwind CDN (development mode)');
      loadCDNFallback();
    }
  };

  const loadCDNFallback = () => {
    if (document.querySelector('script[src*="tailwindcss.com"]')) {
      return; // CDN já carregado
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.tailwindcss.com';
    script.async = true;
    script.onload = () => {
      if (window.tailwind) {
        window.tailwind.config = getTailwindConfig();
        setCssStatus('cdn-loaded');
      }
    };
    script.onerror = () => {
      setCssStatus('error');
      console.error('❌ Failed to load Tailwind CSS');
    };
    document.head.appendChild(script);
  };

  const getTailwindConfig = () => ({
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          evocto: {
            50: '#eff6ff',
            100: '#dbeafe', 
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6',
            600: '#2563eb',
            700: '#1d4ed8',  
            800: '#1e40af',
            900: '#1e3a8a',
          },
          purple: {
            50: '#faf5ff',
            100: '#f3e8ff',
            200: '#e9d5ff', 
            300: '#d8b4fe',
            400: '#c084fc',
            500: '#a855f7',
            600: '#9333ea',
            700: '#7c3aed',
            800: '#6b21a8',
            900: '#581c87',
          }
        },
        fontFamily: {
          sans: ['Inter', 'system-ui', 'sans-serif'],
        },
        spacing: {
          '18': '4.5rem',
          '88': '22rem',
        },
        animation: {
          'fade-in': 'fadeIn 0.5s ease-in-out',
          'slide-up': 'slideUp 0.3s ease-out',
          'pulse-slow': 'pulse 3s infinite',
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
          },
          slideUp: {
            '0%': { transform: 'translateY(10px)', opacity: '0' },
            '100%': { transform: 'translateY(0)', opacity: '1' },
          }
        },
        backgroundImage: {
          'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
          'evocto-gradient': 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
          'evocto-gradient-hover': 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
        },
        boxShadow: {
          'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
          'soft-lg': '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        }
      },
    }
  });

  // Status indicator para desenvolvimento
  if (cssStatus === 'loading') {
    return (
      <div style={{ 
        position: 'fixed', 
        top: 10, 
        right: 10, 
        background: '#f59e0b', 
        color: 'white', 
        padding: '4px 8px', 
        borderRadius: '4px', 
        fontSize: '12px',
        zIndex: 9999
      }}>
        🎨 Loading CSS...
      </div>
    );
  }

  if (cssStatus === 'error') {
    return (
      <div style={{ 
        position: 'fixed', 
        top: 10, 
        right: 10, 
        background: '#dc2626', 
        color: 'white', 
        padding: '4px 8px', 
        borderRadius: '4px', 
        fontSize: '12px',
        zIndex: 9999
      }}>
        ❌ CSS Error
      </div>
    );
  }

  // Em desenvolvimento, mostrar status
  if (window.location.hostname === 'localhost') {
    return (
      <div style={{ 
        position: 'fixed', 
        top: 10, 
        right: 10, 
        background: useCompiledCSS ? '#16a34a' : '#f59e0b', 
        color: 'white', 
        padding: '4px 8px', 
        borderRadius: '4px', 
        fontSize: '12px',
        zIndex: 9999
      }}>
        {useCompiledCSS ? '✅ Compiled CSS' : '⚠️ CDN CSS'}
      </div>
    );
  }

  return null;
}

// Hook para verificar status do CSS
export function useTailwindStatus() {
  const [status, setStatus] = useState('unknown');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/assets/tailwind.css', { method: 'HEAD' });
        setStatus(response.ok ? 'compiled' : 'cdn');
      } catch {
        setStatus('cdn');
      }
    };

    checkStatus();
  }, []);

  return status;
}

export default TailwindBuilder;