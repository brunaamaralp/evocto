
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  CheckCircle, 
  Sparkles,
  Users,
  BarChart3,
  Zap,
  Shield,
  Clock,
  Star
} from 'lucide-react';
import { User } from '@/api/entities';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import OnboardingMascot from '@/components/onboarding/OnboardingMascot';
import NaviBrandLockup from '@/components/NaviBrandLockup';
import { BRAND } from '@/lib/brandAssets';

export default function WelcomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const checkExistingAuth = useCallback(async () => {
    try {
      const user = await User.me();
      if (user) {
        navigate('/dashboard');
      }
    } catch (error) {
      // Não autenticado - continuar na welcome page
    }
  }, [navigate]); // Add navigate to dependency array

  useEffect(() => {
    // Verificar se já está logado
    checkExistingAuth();
  }, [checkExistingAuth]); // Add checkExistingAuth to dependency array

  const handleLogin = async () => {
    navigate('/login');
  };

  const features = [
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Briefings com IA",
      description: "Organize briefings, escopos e aprendizados com apoio de IA para o time"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Portal do Cliente",
      description: "Clientes acompanham entregas, aprovações e status em tempo real"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Operação automatizada",
      description: "Ciclos, tarefas e aprovações fluem sem perder o time no operacional"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Governança do time",
      description: "Histórico, políticas e contexto do cliente centralizados e seguros"
    }
  ];

  const testimonials = [
    {
      name: "Maria Silva",
      role: "Head de Marketing",
      comment: "Saímos do caos de planilhas. Briefings, aprovações e entregas no mesmo lugar.",
      rating: 5
    },
    {
      name: "João Santos",
      role: "Diretor de Agência",
      comment: "O portal do cliente cortou idas e vindas. O time foca em criar, não em cobrar status.",
      rating: 5
    }
  ];

  const benefits = [
    "✨ Configure sua operação de marketing em minutos",
    "🚀 Briefings, escopos e relatórios com apoio de IA",
    "📊 Clientes aprovam entregas pelo celular",
    "⚡ Menos tempo em follow-up, mais tempo em criação",
    "🎯 Um hub para time, clientes e aprendizados"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F2FC] via-white to-[#EDE9FB]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-[#E8E5F5]/70 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center" aria-label={BRAND.name}>
                <NaviBrandLockup height={32} />
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                <Link to="/create-account">Criar Conta</Link>
              </Button>
              <Button onClick={handleLogin} disabled={isLoading}>
                {isLoading ? 'Conectando...' : 'Entrar'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 lg:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <Badge className="bg-[#EDE9FB] text-[#6C47D8] hover:bg-[#EDE9FB] px-4 py-1 border-0">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Para times e agências de marketing
                  </Badge>
                  
                  <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                    <span className="text-[#18162A]">Orquestre seu</span>
                    <br />
                    <span className="bg-gradient-to-r from-[#6C47D8] to-[#9B6BC9] bg-clip-text text-transparent">
                      time de marketing
                    </span>
                    <br />
                    <span className="text-[#18162A]">com IA</span>
                  </h1>
                  
                  <p className="text-xl text-[#7A7595] leading-relaxed max-w-lg">
                    A plataforma que <strong>organiza briefings e entregas</strong>, acelera aprovações
                    e dá aos clientes uma <strong>visão clara</strong> do que o time está produzindo.
                  </p>
                </div>

                <div className="space-y-3">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3 text-[#4A4068]">
                      <div className="w-2 h-2 bg-[#6C47D8] rounded-full"></div>
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    size="lg" 
                    className="px-8 py-3"
                    asChild
                  >
                    <Link to="/create-account">
                      Começar Gratuitamente
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={handleLogin}
                    disabled={isLoading}
                    className="px-8 py-3"
                  >
                    {isLoading ? 'Conectando...' : 'Já tenho conta'}
                  </Button>
                </div>

                <div className="flex items-center gap-6 pt-4">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-8 h-8 bg-[#6C47D8] rounded-full border-2 border-white"></div>
                      ))}
                    </div>
                    <span className="text-sm text-[#7A7595]">+500 profissionais de marketing</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                    <span className="text-sm text-[#7A7595] ml-1">4.9/5</span>
                  </div>
                </div>
              </div>

              {/* Mascote */}
              <div className="flex justify-center lg:justify-end">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-400/20 to-purple-400/20 rounded-full blur-3xl scale-150" />
                  <div className="relative p-4">
                    <OnboardingMascot
                      expression="excited"
                      size="large"
                      showSpeechBubble={true}
                      speechText="Vamos organizar seu marketing!"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-[#18162A] mb-4">
                Por que times de marketing escolhem a Evocto?
              </h2>
              <p className="text-xl text-[#7A7595] max-w-3xl mx-auto">
                Do briefing à aprovação: um sistema para agências e times in-house operarem com clareza
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="border-transparent shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-[#EDE9FB] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#6C47D8]">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-[#18162A] mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-[#7A7595]">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-[#18162A] mb-4">
                O que dizem líderes de marketing
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="border-transparent shadow-[var(--shadow-card)] bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-8">
                    <div className="flex items-center mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-[#4A4068] mb-4 italic">
                      "{testimonial.comment}"
                    </p>
                    <div>
                      <div className="font-semibold text-[#18162A]">{testimonial.name}</div>
                      <div className="text-sm text-[#7A7595]">{testimonial.role}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="py-20 bg-gradient-to-r from-[#6C47D8] to-[#9B6BC9]">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              Pronto para alinhar time, clientes e entregas?
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Junte-se a times de marketing que já saíram do operacional caótico com a Evocto
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-[#6C47D8] hover:bg-[#F5F2FC] px-8 py-3"
                asChild
              >
                <Link to="/create-account">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Começar Gratuitamente
                </Link>
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="border-white text-white hover:bg-white/10 px-8 py-3"
                onClick={handleLogin}
              >
                Fazer Login
              </Button>
            </div>
            
            <p className="text-sm text-white/70 mt-4">
              Sem cartão de crédito • Setup em 5 minutos • Suporte premium incluso
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#18162A] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <NaviBrandLockup height={28} />
          </div>
          <p className="text-[#7A7595] mb-4">
            Operação de marketing mais clara para times, agências e clientes
          </p>
          <div className="flex justify-center gap-8 text-sm text-[#7A7595]">
            <Link to="/terms-of-service" className="hover:text-white transition-colors">
              Termos de Uso
            </Link>
            <Link to="/privacy-policy" className="hover:text-white transition-colors">
              Privacidade
            </Link>
            <span>© 2024 Evocto. Todos os direitos reservados.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
