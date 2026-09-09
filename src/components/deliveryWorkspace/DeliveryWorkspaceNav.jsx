import React from 'react';
import { DELIVERY_WORKSPACE_NAV_ITEMS } from '@/lib/deliveryWorkspaceTabs';

export default function DeliveryWorkspaceNav({
  activeSection,
  onSectionChange,
  className = '',
}) {
  return (
    <nav
      className={`delivery-workspace-nav${className ? ` ${className}` : ''}`}
      aria-label="Seções da entrega"
    >
      <p className="delivery-workspace-nav__label">Entrega</p>
      <ul className="delivery-workspace-nav__list">
        {DELIVERY_WORKSPACE_NAV_ITEMS.map(({ id, label }) => {
          const active = activeSection === id;
          return (
            <li key={id}>
              <button
                type="button"
                className={`delivery-workspace-nav__item${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => onSectionChange(id)}
              >
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
