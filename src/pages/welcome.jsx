import { useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileText, RefreshCw, CheckCircle2 } from 'lucide-react';
import { User } from '@/api/entities';
import { Link, useNavigate } from 'react-router-dom';
import NaviBrandLockup from '@/components/NaviBrandLockup';
import EvoctoMascot from '@/components/brand/EvoctoMascot';
import { BRAND } from '@/lib/brandAssets';
import { trialMarketing } from '@/lib/trialCopy';

const HERO = {
  title: 'O hub operacional do seu marketing',
  subtitle:
    'Transforme cada entrega em aprendizado, alinhando briefing, aprovação e evolução estratégica com o cliente.',
};

const FLOW_STEPS = [
  {
    icon: FileText,
    title: 'Briefing',
    description: 'Contexto do cliente e escopo no mesmo lugar, prontos para o time executar.',
  },
  {
    icon: RefreshCw,
    title: 'Ciclo',
    description: 'Tarefas, entregáveis e status fluem sem planilhas paralelas.',
  },
  {
    icon: CheckCircle2,
    title: 'Aprovação',
    description: 'Cliente aprova com link seguro e fica o rastro do que foi combinado.',
  },
];

const PILLARS = [
  {
    heading: 'Planejamento descentralizado',
    problem:
      'Cada pessoa do time tem seu método. Planos ficam em planilhas isoladas, sem visão global.',
    solution:
      'Centralize planos de ação. A IA sugere estratégias com base no histórico, com menos retrabalho.',
  },
  {
    heading: 'Conhecimento perdido',
    problem:
      'Insights de campanha ficam na cabeça de alguém ou em relatórios esquecidos.',
    solution:
      'Capture cada insight na biblioteca. A IA ajuda a categorizar aprendizados para os próximos ciclos.',
  },
  {
    heading: 'Aprovações lentas por e-mail',
    problem:
      'Versões conflitantes e sem registro claro do que foi acordado com o cliente.',
    solution:
      'Fluxo de aprovação auditável: o cliente aprova com um clique e o acordo fica registrado.',
  },
];

const GAINS = [
  {
    title: 'Visão 360° do cliente',
    description: 'Clientes, serviços, status e saúde da operação em um só lugar.',
  },
  {
    title: 'Serviços padronizados',
    description: 'Modelos com entregáveis e tarefas pré-definidos para consistência do time.',
  },
  {
    title: 'Planejamento inteligente',
    description: 'IA analisa histórico e conhecimento para acelerar o próximo ciclo.',
  },
];

export default function WelcomePage() {
  const navigate = useNavigate();

  const checkExistingAuth = useCallback(async () => {
    try {
      const user = await User.me();
      if (user) navigate('/dashboard');
    } catch {
      // Não autenticado — permanece na landing
    }
  }, [navigate]);

  useEffect(() => {
    checkExistingAuth();
  }, [checkExistingAuth]);

  return (
    <div className="min-h-screen bg-[var(--color-content-bg,#fff)] text-[var(--color-text-heading,#18162A)]">
      <header className="sticky top-0 z-50 border-b border-[var(--color-border,#E8E5F5)] bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center" aria-label={BRAND.name}>
            <NaviBrandLockup height={36} />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" asChild className="text-[var(--color-sidebar-text,#7A7595)]">
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/create-account">{trialMarketing.ctaPrimary}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero — marca, 1 headline, 1 frase, CTAs, 1 âncora visual */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(34,201,138,0.08),transparent_50%),radial-gradient(ellipse_at_90%_10%,rgba(108,71,216,0.07),transparent_45%)]"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:py-24">
            <div className="space-y-8">
              <div className="space-y-5">
                <NaviBrandLockup height={52} />
                <h1 className="max-w-xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.25rem]">
                  {HERO.title}
                </h1>
                <p className="max-w-lg text-lg leading-relaxed text-[var(--color-sidebar-text,#7A7595)]">
                  {HERO.subtitle}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button size="lg" className="px-7" asChild>
                  <Link to="/create-account">
                    {trialMarketing.ctaPrimary}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="px-7" asChild>
                  <Link to="/login">Já tenho conta</Link>
                </Button>
              </div>

              <p className="text-sm text-[var(--color-sidebar-text,#7A7595)]">
                {trialMarketing.heroHint}
              </p>
            </div>

            <div className="flex justify-center lg:justify-end">
              <EvoctoMascot size="xl" className="max-w-full" alt={`${BRAND.name} — mascote`} />
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section className="border-t border-[var(--color-border,#E8E5F5)] bg-[#F5F5F7] py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Do briefing à aprovação, em um fluxo
              </h2>
              <p className="mt-3 text-lg text-[var(--color-sidebar-text,#7A7595)]">
                Três etapas que o time e o cliente acompanham juntos — sem e-mail infinito.
              </p>
            </div>

            <ol className="grid gap-10 md:grid-cols-3">
              {FLOW_STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li key={step.title} className="relative">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-text-heading,#18162A)] text-sm font-semibold text-white">
                        {index + 1}
                      </span>
                      <Icon
                        className="h-5 w-5 text-[var(--color-primary,#6C47D8)]"
                        aria-hidden
                      />
                    </div>
                    <h3 className="text-xl font-semibold">{step.title}</h3>
                    <p className="mt-2 text-[var(--color-sidebar-text,#7A7595)] leading-relaxed">
                      {step.description}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Pilares problema → solução */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-14 max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                3 pilares para organizar a operação
              </h2>
              <p className="mt-3 text-lg text-[var(--color-sidebar-text,#7A7595)]">
                Problemas reais de agência e time in-house — e como o {BRAND.name} responde.
              </p>
            </div>

            <div className="space-y-12">
              {PILLARS.map((pillar) => (
                <article
                  key={pillar.heading}
                  className="grid gap-6 border-t border-[var(--color-border,#E8E5F5)] pt-10 md:grid-cols-2 md:gap-12"
                >
                  <div>
                    <h3 className="text-xl font-semibold">{pillar.heading}</h3>
                    <p className="mt-3 leading-relaxed text-[var(--color-sidebar-text,#7A7595)]">
                      {pillar.problem}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-accent-dark,#085041)]">
                      Com {BRAND.name}
                    </p>
                    <p className="mt-2 leading-relaxed text-[var(--color-text-heading,#18162A)]">
                      {pillar.solution}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Ganhos — lista aberta, sem cards */}
        <section className="border-t border-[var(--color-border,#E8E5F5)] py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-10 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              O que sua agência ganha
            </h2>
            <ul className="grid gap-8 sm:grid-cols-3">
              {GAINS.map((gain) => (
                <li key={gain.title}>
                  <h3 className="text-lg font-semibold">{gain.title}</h3>
                  <p className="mt-2 text-[var(--color-sidebar-text,#7A7595)] leading-relaxed">
                    {gain.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA final */}
        <section className="bg-[var(--color-sidebar-bg,#13111F)] py-20 text-white">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Seu time para de apagar incêndios
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
              {trialMarketing.finalSub}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="bg-white px-8 text-[var(--color-primary,#6C47D8)] hover:bg-white/90"
                asChild
              >
                <Link to="/create-account">{trialMarketing.finalCta}</Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white/30 bg-transparent px-8 text-white hover:bg-white/10 hover:text-white"
                asChild
              >
                <Link to="/login">Fazer login</Link>
              </Button>
            </div>
            <p className="mt-5 text-sm text-white/55">{trialMarketing.midHint}</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[var(--color-sidebar-bg,#13111F)] py-10 text-center text-sm text-[var(--color-sidebar-text,#7A7595)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 sm:px-6 lg:px-8">
          <NaviBrandLockup variant="dark" height={28} />
          <p>Operação de marketing mais clara para times, agências e clientes</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link to="/terms-of-service" className="hover:text-white transition-colors">
              Termos de Uso
            </Link>
            <Link to="/privacy-policy" className="hover:text-white transition-colors">
              Privacidade
            </Link>
            <span>© {new Date().getFullYear()} {BRAND.name}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
