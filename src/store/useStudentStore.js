/**
 * Bridge: "students" do Nave = Clients do Evocto com cobrança habilitada.
 */
import { create } from 'zustand';
import { Client } from '@/api/entities';
import {
  clientToFinancePerson,
  isClientBillingEnabled,
  studentUpdatesToClientPatch,
} from '@/lib/financeDomain';
import { useLeadStore } from './useLeadStore';

export const STUDENTS_PAGE_SIZE = 500;

function emptyRosterState() {
  return {
    students: [],
    studentsById: Object.create(null),
    studentIds: [],
    studentsTotal: 0,
    studentsHasMore: false,
    lastFetchOpts: null,
    loadedForAcademyId: null,
  };
}

function indexStudents(list) {
  const students = Array.isArray(list) ? list : [];
  const studentsById = Object.create(null);
  const studentIds = [];
  for (const s of students) {
    const id = String(s?.id || '').trim();
    if (!id) continue;
    studentsById[id] = s;
    studentIds.push(id);
  }
  return { students, studentsById, studentIds };
}

export const useStudentStore = create((set, get) => ({
  ...emptyRosterState(),
  loading: false,
  loadingMore: false,
  error: null,

  resetForAcademyChange() {
    set({ ...emptyRosterState(), loading: false, loadingMore: false, error: null });
  },

  markStudentsFullyLoaded() {
    set({ studentsHasMore: false });
  },

  appendStudentsPage(items) {
    const incoming = Array.isArray(items) ? items : [];
    if (!incoming.length) {
      set({ studentsHasMore: false, loadingMore: false });
      return;
    }
    const byId = { ...get().studentsById };
    const ids = [...get().studentIds];
    const students = [...get().students];
    const seen = new Set(ids);
    for (const s of incoming) {
      const id = String(s?.id || '').trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      byId[id] = s;
      ids.push(id);
      students.push(s);
    }
    set({
      students,
      studentsById: byId,
      studentIds: ids,
      studentsTotal: Math.max(get().studentsTotal || 0, students.length),
      studentsHasMore: false,
      loadingMore: false,
    });
  },

  async fetchStudents(opts = {}) {
    const academyId = useLeadStore.getState().academyId;
    if (!academyId) {
      set({ ...emptyRosterState(), loading: false, error: null });
      return [];
    }

    const reset = opts.reset !== false;
    if (
      !reset &&
      get().loadedForAcademyId === academyId &&
      get().students.length
    ) {
      return get().students;
    }

    set({ loading: true, error: null, lastFetchOpts: { ...opts, reset } });
    try {
      const rows = await Client.filter({ agencyId: academyId }, '-updated_date', STUDENTS_PAGE_SIZE);
      const students = (Array.isArray(rows) ? rows : [])
        .filter(isClientBillingEnabled)
        .map(clientToFinancePerson)
        .filter(Boolean);
      const indexed = indexStudents(students);
      set({
        ...indexed,
        studentsTotal: students.length,
        studentsHasMore: false,
        loading: false,
        loadedForAcademyId: academyId,
      });
      return students;
    } catch (err) {
      console.warn('[useStudentStore] falha ao carregar clients', err);
      set({
        loading: false,
        error: err?.message || 'Erro ao carregar clientes',
        ...emptyRosterState(),
      });
      return [];
    }
  },

  async fetchMoreStudents() {
    set({ studentsHasMore: false, loadingMore: false });
    return get().students;
  },

  async ensureAllStudentsLoaded(force = false) {
    return get().fetchStudents({ reset: Boolean(force) });
  },

  async updateStudent(id, updates = {}) {
    const sid = String(id || '').trim();
    if (!sid) throw new Error('student_id_required');
    const patch = studentUpdatesToClientPatch(updates);
    if (!Object.keys(patch).length) {
      return get().studentsById?.[sid] || null;
    }
    const updated = await Client.update(sid, patch);
    const person = clientToFinancePerson(updated);
    if (!person || !isClientBillingEnabled(updated)) {
      // Cobrança desligada: remove do roster de "alunos"
      const students = get().students.filter((s) => s.id !== sid);
      const indexed = indexStudents(students);
      set({
        ...indexed,
        studentsTotal: students.length,
        studentsHasMore: false,
      });
      return person;
    }
    const byId = { ...get().studentsById, [sid]: person };
    const students = get().students.some((s) => s.id === sid)
      ? get().students.map((s) => (s.id === sid ? person : s))
      : [person, ...get().students];
    set({
      students,
      studentsById: byId,
      studentIds: students.map((s) => s.id),
      studentsTotal: students.length,
    });
    return person;
  },

  getStudents() {
    return get().students || [];
  },
}));

export async function ensureAllStudentsLoaded(force) {
  return useStudentStore.getState().ensureAllStudentsLoaded(force);
}

export default useStudentStore;
