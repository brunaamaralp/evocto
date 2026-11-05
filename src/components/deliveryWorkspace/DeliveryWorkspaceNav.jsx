import { DELIVERY_WORKSPACE_NAV_ITEMS } from '@/lib/deliveryWorkspaceTabs';

export default function DeliveryWorkspaceNav({
  activeSection,
  onSectionChange,
  className = '',
}) {
  const items = DELIVERY_WORKSPACE_NAV_ITEMS;
  const label = 'Serviço';

  return (
    <nav
      className={`delivery-workspace-nav${className ? ` ${className}` : ''}`}
      aria-label="Seções do serviço"
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
