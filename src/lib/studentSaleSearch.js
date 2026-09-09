/**
 * Busca clientes (bridge do searchStudentsForSale do Nave) para lançamentos / vendas.
 */
import { Client } from '@/api/entities';
import { clientToFinancePerson } from '@/lib/financeDomain';
import { useStudentStore } from '@/store/useStudentStore';

function normalize(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function digits(s) {
  return String(s || '').replace(/\D/g, '');
}

/**
 * @param {string} academyId
 * @param {string} rawQuery
 * @param {{ limit?: number }} [opts]
 */
export async function searchStudentsForSale(academyId, rawQuery, { limit = 8 } = {}) {
  const aid = String(academyId || '').trim();
  const q = String(rawQuery || '').trim();
  if (!aid || q.length < 2) return [];

  const qNorm = normalize(q);
  const qDigits = digits(q);

  let roster = useStudentStore.getState().students || [];
  if (!roster.length || useStudentStore.getState().loadedForAcademyId !== aid) {
    roster = await useStudentStore.getState().ensureAllStudentsLoaded(true);
  }

  let hits = (roster || []).filter((p) => {
    const name = normalize(p.name || p.full_name);
    const phone = digits(p.phone);
    const email = normalize(p.email);
    if (name.includes(qNorm)) return true;
    if (email.includes(qNorm)) return true;
    if (qDigits.length >= 2 && phone.includes(qDigits)) return true;
    return false;
  });

  if (!hits.length) {
    try {
      const rows = await Client.filter({ agencyId: aid }, '-updated_date', 200);
      hits = (Array.isArray(rows) ? rows : [])
        .map(clientToFinancePerson)
        .filter(Boolean)
        .filter((p) => {
          const name = normalize(p.name);
          const phone = digits(p.phone);
          const email = normalize(p.email);
          return (
            name.includes(qNorm) ||
            email.includes(qNorm) ||
            (qDigits.length >= 2 && phone.includes(qDigits))
          );
        });
    } catch {
      hits = [];
    }
  }

  return hits.slice(0, Math.min(Math.max(1, limit), 24));
}

export default searchStudentsForSale;
