import type { EstablishmentSettings } from '../types/domain.js';
import { api } from './api.js';

/* ------------------------------------------------------------------
 * Onboarding SaaS (FASE 19) — POST /establishments/register (público)
 * ------------------------------------------------------------------ */

export interface RegisterEstablishmentPayload {
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
}

export interface RegisterEstablishmentResult {
  establishment: {
    id: string;
    name: string;
    slug: string;
    status: string;
    createdAt: string;
  };
  owner: {
    id: string;
    name: string;
    email: string;
    role: string;
    active: boolean;
    createdAt: string;
  };
}

/** Cria o restaurante e o usuário proprietário (ADMIN) atomicamente. */
export async function registerEstablishment(
  payload: RegisterEstablishmentPayload,
): Promise<RegisterEstablishmentResult> {
  const { data } = await api.post<{ success: true; data: RegisterEstablishmentResult }>(
    '/establishments/register',
    payload,
  );
  return data.data;
}

/* ------------------------------------------------------------------
 * Configurações do estabelecimento (GET/PUT /establishments/me)
 * O tenant vem do JWT injetado pelo interceptor — nunca enviado no body.
 * ------------------------------------------------------------------ */

export interface UpdateEstablishmentSettingsPayload {
  name?: string;
  logoUrl?: string | null;
  serviceFeeEnabled?: boolean;
  serviceFeeRate?: number;
  /** FASE 24 — métodos de pagamento aceites (CASH | CARD | PIX). */
  acceptedPaymentMethods?: string[];
}

export async function getEstablishmentSettings(): Promise<EstablishmentSettings> {
  const { data } = await api.get<{ success: true; data: EstablishmentSettings }>(
    '/establishments/me',
  );
  return data.data;
}

export async function updateEstablishmentSettings(
  payload: UpdateEstablishmentSettingsPayload,
): Promise<EstablishmentSettings> {
  const { data } = await api.put<{ success: true; data: EstablishmentSettings }>(
    '/establishments/me',
    payload,
  );
  return data.data;
}
