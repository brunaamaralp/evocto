import { DELIVERY_WORKSPACE_NAV_ITEMS } from '@/lib/deliveryWorkspaceTabs';
import { CAMPAIGN_WORKSPACE_TABS } from '@/lib/campaignWorkspaceHref';

export default function DeliveryWorkspaceNav({
  activeSection,
  onSectionChange,
  mode = 'service',
  className = '',
}) {
  const isCampaign = mode === 'campaign';
  const items = isCampaign ? CAMPAIGN_WORKSPACE_TABS : DELIVERY_WORKSPACE_NAV_ITEMS;
  const label = isCampaign ? 'Campanha' : 'Entrega';

  return (
    <nav
      className={`delivery-workspace-nav${className ? ` ${className}` : ''}`}
      aria-label={isCampaign ? 'Seções da campanha' : 'Seções da entrega'}
    >
      <p className="delivery-workspace-nav__label">{label}</p>
      <ul className="delivery-workspace-nav__list">
        {items.map(({ id, label: itemLabel }) => {
          const active = activeSection === id;
          return (
            <li key={id}>
              <button
                type="button"
                className={`delivery-workspace-nav__item${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => onSectionChange(id)}
              >
                {itemLabel}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
