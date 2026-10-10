import type { EstablishmentSettings } from '../types/domain.js';
import { api } from './api.js';

/* ------------------------------------------------------------------
 * Onboarding SaaS (FASE 25) — POST /auth/register (público)
 * O contrato mapeia estritamente o registerSchema do backend.
 * ------------------------------------------------------------------ */

export interface RegisterEstablishmentPayload {
  establishmentName: string;
  slug: string;
  ownerName: string;
  email: string;
  password: string;
}

export interface RegisterEstablishmentResult {
  message: string;
}

/**
 * Cria o restaurante e o usuário proprietário (ADMIN) atomicamente.
 * Responde com mensagem de sucesso; o fluxo segue para /auth/login.
 */
export async function registerEstablishment(
  payload: RegisterEstablishmentPayload,
): Promise<RegisterEstablishmentResult> {
  const { data } = await api.post<{ success: true; data: RegisterEstablishmentResult }>(
    '/auth/register',
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
