/**
 * DADOS FICTÍCIOS ISOLADOS — APENAS PARA DEMONSTRAÇÃO VISUAL.
 *
 * Serão substituídos pela API real na fase de integração.
 * NUNCA usar como fonte de verdade financeira ou de disponibilidade.
 */

import type { Category, Establishment, Product, TableInfo } from '../types/domain.js';

export const mockEstablishment: Establishment = {
  id: 'est-001',
  name: 'Balneário Costa Verde',
  slug: 'balneario-demo',
  description: 'Comida de praia, drinks e boa companhia.',
};

export const mockTable: TableInfo = {
  id: 'table-012',
  number: '12',
  areaName: 'Piscina',
};

export const mockCategories: Category[] = [
  { id: 'cat-all', name: 'Todos', displayOrder: 0 },
  { id: 'cat-refeicoes', name: 'Refeições', displayOrder: 1 },
  { id: 'cat-porcoes', name: 'Porções', displayOrder: 2 },
  { id: 'cat-tira-gostos', name: 'Tira-Gostos', displayOrder: 3 },
  { id: 'cat-bebidas', name: 'Bebidas', displayOrder: 4 },
  { id: 'cat-cervejas', name: 'Cervejas', displayOrder: 5 },
  { id: 'cat-drinks', name: 'Drinks', displayOrder: 6 },
  { id: 'cat-sobremesas', name: 'Sobremesas', displayOrder: 7 },
];

export const mockProducts: Product[] = [
  {
    id: 'p-001',
    categoryId: 'cat-refeicoes',
    name: 'Hambúrguer Artesanal',
    description: 'Pão brioche, blend 160g, queijo e molho da casa.',
    price: 32.9,
    featured: true,
    available: 'available',
    displayOrder: 1,
  },
  {
    id: 'p-002',
    categoryId: 'cat-porcoes',
    name: 'Porção de Batata',
    description: 'Batatas rústicas com alecrim e parmesão.',
    price: 24.9,
    promotionalPrice: 19.9,
    available: 'available',
    displayOrder: 2,
  },
  {
    id: 'p-003',
    categoryId: 'cat-cervejas',
    name: 'Cerveja Long Neck',
    description: 'Gelada, 355ml.',
    price: 9.9,
    available: 'unavailable',
    displayOrder: 3,
  },
  {
    id: 'p-004',
    categoryId: 'cat-drinks',
    name: 'Caipirinha de Limão',
    description: 'Limão, açúcar e cachaça artesanal.',
    price: 18.9,
    featured: true,
    available: 'available',
    displayOrder: 4,
  },
];
