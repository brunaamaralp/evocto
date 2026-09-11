/**
 * Soft UI rail: dark brand (global) vs teal (cliente).
 * Hierarquia cliente: Operação (hub/lente) → Planejamento → Cliente.
 * serviceId no hub é lente, não troca para shell de serviço.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/components/i18n/I18nProvider';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CheckSquare,
  BookOpen,
  Settings,
  FileText,
  FolderOpen,
  ArrowLeft,
  ChevronLeft,
  TrendingUp,
  Wallet,
  Lightbulb,
  Target,
  Menu,
  Megaphone,
  Sparkles,
  CalendarDays,
} from 'lucide-react';
import { Client } from '@/api/entities';
import { CLIENT_CONTEXT, GLOBAL_SHELL } from '@/lib/clientContextTheme';
import NaviBrandLockup from '@/components/NaviBrandLockup';
import { BRAND } from '@/lib/brandAssets';
import { createPageUrl } from '@/utils';
import { buildClientTasksHref } from '@/lib/taskScope';
import { buildAnnualPlanHref, buildBrainstormHref } from '@/lib/planoAnualHub';
import { buildCampaignWorkspaceTasksPath } from '@/lib/campaignWorkspaceHref';
import { buildDeliveryWorkspacePath } from '@/lib/deliveryWorkspaceTabs';

/** Páginas onde serviceId significa workspace de serviço (não lente do hub). */
const SERVICE_SHELL_PAGES = new Set([
  'service-detail',
  'service-deliverables',
  'delivery-workspace',
  'service-instance-editor',
  'service-editor',
  'service-policies',
]);

function buildClientHubHref(clientId, serviceId = null) {
  let path = `client-detail?clientId=${clientId}`;
  if (serviceId) path += `&serviceId=${encodeURIComponent(serviceId)}`;
  return createPageUrl(path);
}

export default function ContextualSidebar({
  currentPage,
  clientId,
  serviceId,
  briefingId = null,
  isOpen,
  onClose,
}) {
  useTranslation();
  const [client, setClient] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const useServiceShell =
    Boolean(serviceId) &&
    (SERVICE_SHELL_PAGES.has(currentPage) || !clientId);

  const isClientMode = Boolean(clientId) && !useServiceShell;
  const theme = isClientMode ? CLIENT_CONTEXT : GLOBAL_SHELL;

  useEffect(() => {
    if (!clientId) {
      setClient(null);
      return;
    }
    let cancelled = false;
    Client.get(clientId)
      .then((data) => {
        if (!cancelled) setClient(data);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const getNavigationItems = () => {
    if (isClientMode && clientId) {
      const items = [
        {
          type: 'link',
          label: 'Voltar para Clientes',
          icon: ArrowLeft,
          href: createPageUrl('clients'),
          isBack: true,
        },
        { type: 'section', label: 'Operação' },
        {
          type: 'link',
          label: 'Visão Geral',
          icon: LayoutDashboard,
          href: buildClientHubHref(clientId, serviceId),
          isActive:
            currentPage === 'client' || currentPage === 'client-detail',
        },
        {
          type: 'link',
          label: 'Tarefas',
          icon: CheckSquare,
          href: createPageUrl(
            buildClientTasksHref({
              clientId,
              serviceId: serviceId || null,
            })
          ),
          isActive: currentPage === 'client-tasks' && !briefingId,
        },
      ];

      // S1: sem Ficha / Tarefas da unidade — campanha opera no Workspace
      if (currentPage === 'client-unit') {
        items.push({
          type: 'link',
          label: 'Unidade atual',
          icon: Target,
          href: `${createPageUrl('client-unit')}${typeof window !== 'undefined' ? window.location.search : ''}`,
          nested: true,
          isActive: true,
        });
      }

      items.push(
        { type: 'section', label: 'Planejamento' },
        {
          type: 'link',
          label: 'Plano anual',
          icon: CalendarDays,
          href: buildAnnualPlanHref(clientId),
          isActive: currentPage === 'briefing-campanha-anual',
        },
        {
          type: 'link',
          label: 'Brainstorm',
          icon: Sparkles,
          href: buildBrainstormHref(clientId, {
            serviceId: serviceId || null,
          }),
          isActive:
            currentPage === 'client-brainstorm' || currentPage === 'brainstorm',
        },
        {
          type: 'link',
          label: 'Planejamento & briefs',
          icon: FileText,
          href: createPageUrl(`client-briefing?clientId=${clientId}`),
          isActive: currentPage === 'client-briefing' && !briefingId,
        },
        { type: 'section', label: 'Cliente' },
        {
          type: 'link',
          label: 'Documentos',
          icon: FolderOpen,
          href: createPageUrl(`client-documents?clientId=${clientId}`),
          isActive: currentPage === 'client-documents',
        },
        {
          type: 'link',
          label: 'Financeiro',
          icon: Wallet,
          href: createPageUrl(`client-financeiro?clientId=${clientId}`),
          isActive: currentPage === 'client-financeiro',
        },
        {
          type: 'link',
          label: 'Aprendizados',
          icon: Lightbulb,
          href: createPageUrl(`client-learnings?clientId=${clientId}`),
          isActive: currentPage === 'client-learnings' || currentPage === 'client-evolution',
        },
        {
          type: 'link',
          label: 'Relatórios',
          icon: TrendingUp,
          href: createPageUrl(`custom-reports?clientId=${clientId}`),
          isActive: currentPage === 'custom-reports',
        },
        {
          type: 'link',
          label: 'Serviços',
          icon: Target,
          href: createPageUrl(`client-services?clientId=${clientId}`),
          isActive: currentPage === 'client-services',
          nested: false,
        }
      );

      return items;
    }

    if (useServiceShell && serviceId) {
      const workspaceHref = briefingId
        ? buildCampaignWorkspaceTasksPath({
            serviceId,
            clientId,
            campaignId: briefingId,
          })
        : buildDeliveryWorkspacePath(serviceId, 'tasks', {
            clientId: clientId || undefined,
          });

      return [
        {
          type: 'link',
          label: 'Voltar para Cliente',
          icon: ArrowLeft,
          href: clientId
            ? buildClientHubHref(clientId, serviceId)
            : createPageUrl('clients'),
          isBack: true,
        },
        {
          type: 'link',
          label: 'Workspace',
          icon: Megaphone,
          href: workspaceHref,
          isActive: currentPage === 'delivery-workspace',
        },
        {
          type: 'link',
          label: 'Tarefas',
          icon: CheckSquare,
          href: clientId
            ? createPageUrl(
                buildClientTasksHref({
                  clientId,
                })
              )
            : createPageUrl('tasks-manager'),
          isActive: currentPage === 'client-tasks' && !briefingId,
        },
      ];
    }

    return [
      {
        type: 'link',
        label: 'Dashboard',
        icon: LayoutDashboard,
        href: createPageUrl('dashboard'),
        isActive: currentPage === 'dashboard',
      },
      {
        type: 'link',
        label: 'Clientes',
        icon: Users,
        href: createPageUrl('clients'),
        isActive: currentPage === 'clients',
      },
      {
        type: 'link',
        label: 'Tarefas',
        icon: CheckSquare,
        href: createPageUrl('tasks-manager'),
        isActive: currentPage === 'tasks-manager',
      },
      {
        type: 'link',
        label: 'Biblioteca',
        icon: BookOpen,
        href: createPageUrl('library'),
        isActive: currentPage === 'library',
      },
      {
        type: 'link',
        label: 'Relatórios',
        icon: TrendingUp,
        href: createPageUrl('custom-reports'),
        isActive: currentPage === 'custom-reports',
      },
      {
        type: 'link',
        label: 'Financeiro',
        icon: Wallet,
        href: createPageUrl('financeiro'),
        isActive: currentPage === 'financeiro',
      },
      {
        type: 'link',
        label: 'Templates',
        icon: Briefcase,
        href: createPageUrl('services'),
        isActive: currentPage === 'services',
      },
    ];
  };

  const navigationItems = getNavigationItems();
  const widthClass = collapsed ? 'w-[72px]' : 'w-[240px]';

  return (
    <aside
      className={`flex flex-col transition-all duration-300 m-3 mr-0 rounded-[20px] overflow-hidden ${widthClass} ${
        isOpen ? 'fixed inset-y-3 left-3 z-50 lg:relative lg:inset-auto' : 'hidden lg:flex'
      } ${theme.sidebarBg} border ${theme.sidebarBorder}`}
    >
      <div className={`p-4 border-b ${theme.sidebarBorder}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'}`}>
          {isClientMode ? (
            <>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-teal-600">
                <span className="text-white font-bold text-sm">
                  {client?.name?.[0] || 'C'}
                </span>
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <h2 className={`font-semibold truncate text-sm ${theme.sidebarText}`}>
                    {client?.name || 'Cliente'}
                  </h2>
                  <p className={`text-xs truncate ${theme.sidebarMuted}`}>
                    {client?.sector || 'Cliente'}
                  </p>
                </div>
              )}
            </>
          ) : (
            <Link
              to={createPageUrl('dashboard')}
              className={`flex items-center min-w-0 ${collapsed ? '' : 'w-full'}`}
              aria-label={BRAND.name}
              onClick={onClose}
            >
              {collapsed ? (
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                  <NaviBrandLockup variant="mark" height={22} className="brightness-0 invert" />
                </span>
              ) : (
                <NaviBrandLockup variant="dark" height={26} className="max-w-[168px]" />
              )}
            </Link>
          )}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navigationItems.map((item, index) => {
          if (item.type === 'section') {
            if (collapsed) {
              return (
                <div
                  key={`section-${item.label}-${index}`}
                  className={`my-2 mx-2 border-t ${theme.sidebarBorder}`}
                  aria-hidden
                />
              );
            }
            return (
              <div
                key={`section-${item.label}-${index}`}
                className={`px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider ${theme.sidebarMuted}`}
              >
                {item.label}
              </div>
            );
          }

          const ItemIcon = item.icon;
          const isBack = item.isBack;
          const nested = Boolean(item.nested);

          return (
            <Link
              key={`${item.href}-${index}`}
              to={item.href}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl text-sm transition-colors duration-200 ${
                nested && !collapsed ? 'pl-8 pr-3 py-2' : 'px-3 py-2.5'
              } ${collapsed ? 'justify-center' : ''} ${
                item.isActive
                  ? theme.sidebarActive
                  : `${theme.sidebarMuted} ${theme.sidebarHover}`
              }`}
            >
              <ItemIcon
                className={`stroke-[1.5] shrink-0 ${
                  nested ? 'w-4 h-4' : 'w-[18px] h-[18px]'
                } ${
                  item.isActive && !isClientMode ? GLOBAL_SHELL.sidebarIconActive : ''
                }`}
              />
              {!collapsed && (
                <span className={isBack || nested ? 'text-xs' : 'font-medium'}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={`p-3 border-t ${theme.sidebarBorder} space-y-1`}>
        <Link
          to={
            isClientMode && clientId
              ? createPageUrl(`client-settings?clientId=${clientId}`)
              : createPageUrl('settings')
          }
          title={collapsed ? 'Configurações' : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
            collapsed ? 'justify-center' : ''
          } ${theme.sidebarMuted} ${theme.sidebarHover}`}
        >
          <Settings className="w-[18px] h-[18px] stroke-[1.5]" />
          {!collapsed && <span className="font-medium">Configurações</span>}
        </Link>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={`hidden lg:flex w-full items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
            collapsed ? 'justify-center' : ''
          } ${theme.sidebarHover} ${theme.sidebarMuted}`}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <ChevronLeft
            className={`w-4 h-4 stroke-[1.5] transition-transform ${collapsed ? 'rotate-180' : ''}`}
          />
          {!collapsed && <span className="text-xs">Recolher</span>}
        </button>

        <button
          type="button"
          className={`lg:hidden flex w-full items-center gap-3 px-3 py-2 rounded-xl ${theme.sidebarHover} ${theme.sidebarMuted}`}
          onClick={onClose}
        >
          <Menu className="w-4 h-4" />
          {!collapsed && <span className="text-xs">Fechar</span>}
        </button>
      </div>
    </aside>
  );
}
