import type { ApiCategory, ApiProduct } from '../types/domain.js';
import { api } from './api.js';

/* ------------------------------------------------------------------
 * Categorias
 * ------------------------------------------------------------------ */

export interface CategoryPayload {
  name: string;
  description?: string | null;
  icon?: string | null;
  imageUrl?: string | null;
  displayOrder?: number | null;
  active?: boolean;
}

export async function listCategories(): Promise<ApiCategory[]> {
  const { data } = await api.get<{ success: true; data: ApiCategory[] }>('/categories', {
    params: { orderBy: 'displayOrder', order: 'asc' },
  });
  return data.data;
}

export async function createCategory(payload: CategoryPayload): Promise<ApiCategory> {
  const { data } = await api.post<{ success: true; data: ApiCategory }>('/categories', payload);
  return data.data;
}

export async function updateCategory(
  id: string,
  payload: CategoryPayload,
): Promise<ApiCategory> {
  const { data } = await api.put<{ success: true; data: ApiCategory }>(
    `/categories/${id}`,
    payload,
  );
  return data.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/categories/${id}`);
}

/* ------------------------------------------------------------------
 * Produtos
 * ------------------------------------------------------------------ */

export interface ProductCategoryOption {
  id: string;
  name: string;
  active: boolean;
}

export interface ProductPayload {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  categoryId: string;
  price: number;
  promotionalPrice?: number | null;
  preparationTime?: number | null;
  ingredients?: string | null;
  allergens?: string | null;
  displayOrder?: number | null;
  featured?: boolean;
  active?: boolean;
  available?: boolean;
}

export async function listProducts(): Promise<ApiProduct[]> {
  const { data } = await api.get<{ success: true; data: ApiProduct[] }>('/products');
  return data.data;
}

export async function createProduct(payload: ProductPayload): Promise<ApiProduct> {
  const { data } = await api.post<{ success: true; data: ApiProduct }>('/products', payload);
  return data.data;
}

export async function updateProduct(
  id: string,
  payload: ProductPayload,
): Promise<ApiProduct> {
  const { data } = await api.put<{ success: true; data: ApiProduct }>(
    `/products/${id}`,
    payload,
  );
  return data.data;
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}

export async function setProductAvailability(
  id: string,
  available: boolean,
): Promise<ApiProduct> {
  const { data } = await api.patch<{ success: true; data: ApiProduct }>(
    `/products/${id}/availability`,
    { available },
  );
  return data.data;
}
