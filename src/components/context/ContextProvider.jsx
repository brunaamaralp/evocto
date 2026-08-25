import React, { createContext, useContext, useState } from 'react';
import { customerPath } from '@/components/utils/navigation.jsx';

const ContextContext = createContext({});

export const useAppContext = () => useContext(ContextContext);

export function ContextProvider({ children }) {
  const [ribbonContext, setRibbonContext] = useState(null);

  const buildRibbonContext = (customer, service, cycle) => {
    if (!customer) {
      setRibbonContext(null);
      return;
    }

    const contextData = {
      customer: { id: customer.id, name: customer.name },
      service: service ? { id: service.id, name: service.name } : null,
      cycle: cycle ? { id: cycle.id, label: cycle.cyclePeriod || 'N/A' } : null,
      links: {
        customer: customerPath(customer.id),
        service: service ? `/services?id=${service.id}&customerId=${customer.id}` : null,
        cycle: service && cycle ? `/cycle-plan?id=${cycle.id}` : null,
      },
    };
    setRibbonContext(contextData);
  };
  
  const clearRibbonContext = () => {
    setRibbonContext(null);
  };

  const value = {
    ribbonContext,
    buildRibbonContext,
    clearRibbonContext,
  };

  return (
    <ContextContext.Provider value={value}>
      {children}
    </ContextContext.Provider>
  );
}