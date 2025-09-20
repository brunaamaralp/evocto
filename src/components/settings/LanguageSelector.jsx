import React from 'react';
import { useTranslation } from '@/components/i18n/I18nProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, Check } from 'lucide-react';
import { toast } from 'sonner';

const languages = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' }
];

export default function LanguageSelector() {
  const { t, currentLanguage, changeLanguage, loading } = useTranslation();

  const handleLanguageChange = async (languageCode) => {
    try {
      await changeLanguage(languageCode);
      toast.success(
        languageCode === 'en' 
          ? 'Language changed to English' 
          : 'Idioma alterado para Português'
      );
    } catch (error) {
      toast.error(
        currentLanguage === 'en' 
          ? 'Failed to change language' 
          : 'Falha ao alterar idioma'
      );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            <div className="space-y-1">
              <div className="h-5 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-4 bg-slate-200 rounded animate-pulse" />
                  <div className="space-y-1">
                    <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                    <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
                  </div>
                </div>
                <div className="w-16 h-8 bg-slate-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-slate-600" />
          <div>
            <CardTitle>{t('pages.settings.language')}</CardTitle>
            <CardDescription>{t('pages.settings.interfaceLanguage')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {languages.map((language) => (
            <div
              key={language.code}
              className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
                currentLanguage === language.code
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{language.flag}</span>
                <div>
                  <p className="font-medium text-slate-900">{language.name}</p>
                  <p className="text-sm text-slate-500">{language.nativeName}</p>
                </div>
              </div>
              
              {currentLanguage === language.code ? (
                <div className="flex items-center gap-2 text-blue-600">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {currentLanguage === 'en' ? 'Selected' : 'Selecionado'}
                  </span>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLanguageChange(language.code)}
                  disabled={loading}
                >
                  {currentLanguage === 'en' ? 'Select' : 'Selecionar'}
                </Button>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-600">
            {t('common.info')}: {currentLanguage === 'en' 
              ? 'Your language preference will be saved and applied across all sessions.' 
              : 'Sua preferência de idioma será salva e aplicada em todas as sessões.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}