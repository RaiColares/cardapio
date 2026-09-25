import type { TeamRole, TeamUser } from '../types/domain.js';
import { api } from './api.js';

/* ------------------------------------------------------------------
 * Gestão da Equipe (FASE 19) — CRUD de usuários restrito a ADMIN.
 * O establishmentId é injetado pelo JWT no backend, nunca pelo body.
 * ------------------------------------------------------------------ */

export interface CreateTeamMemberPayload {
  name: string;
  email: string;
  password: string;
  role: TeamRole;
  phone?: string | null;
}

export interface UpdateTeamMemberPayload {
  name?: string;
  email?: string;
  password?: string;
  role?: TeamRole;
  phone?: string | null;
  active?: boolean;
}

export async function listTeamUsers(): Promise<TeamUser[]> {
  const { data } = await api.get<{ success: true; data: TeamUser[] }>('/users');
  return data.data;
}

export async function createTeamMember(
  payload: CreateTeamMemberPayload,
): Promise<TeamUser> {
  const { data } = await api.post<{ success: true; data: TeamUser }>('/users', payload);
  return data.data;
}

export async function updateTeamMember(
  id: string,
  payload: UpdateTeamMemberPayload,
): Promise<TeamUser> {
  const { data } = await api.put<{ success: true; data: TeamUser }>(`/users/${id}`, payload);
  return data.data;
}

export async function deleteTeamMember(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}
