import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  BellRing,
  MousePointerClick,
  PackageSearch,
  Palette,
  PanelsTopLeft,
  TextCursorInput,
  Type,
} from 'lucide-react';

import { CategoryCard } from '../../components/menu/CategoryCard.js';
import { ProductCard } from '../../components/menu/ProductCard.js';
import { Alert } from '../../components/ui/Alert.js';
import { Avatar } from '../../components/ui/Avatar.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Drawer } from '../../components/ui/Drawer.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { Input } from '../../components/ui/Input.js';
import { Loading } from '../../components/ui/Loading.js';
import { Modal } from '../../components/ui/Modal.js';
import { Select } from '../../components/ui/Select.js';
import { Skeleton } from '../../components/ui/Skeleton.js';
import { OrderStatusBadge, TableStatusBadge } from '../../components/ui/StatusBadge.js';
import { Table, TBody, TD, TH, THead, TRow } from '../../components/ui/Table.js';
import { Tabs } from '../../components/ui/Tabs.js';
import { useToast } from '../../components/ui/Toast.js';
import type { Order, Product, TableStatus } from '../../types/domain.js';

const sampleOrders: Order[] = [
  { id: 'o1', orderNumber: 102, tableLabel: 'Mesa 12', status: 'PENDING', itemsCount: 3, total: 86.7, createdAt: '19:42' },
  { id: 'o2', orderNumber: 101, tableLabel: 'Mesa 04', status: 'PREPARING', itemsCount: 2, total: 45.8, createdAt: '19:38' },
  { id: 'o3', orderNumber: 98, tableLabel: 'Mesa 07', status: 'READY', itemsCount: 5, total: 132.4, createdAt: '19:12' },
];

const allTableStatuses: TableStatus[] = [
  'AVAILABLE',
  'OCCUPIED',
  'NEW_ORDER',
  'PREPARING',
  'READY',
  'BILL_REQUESTED',
];

/**
 * Conteúdo de demonstração EXCLUSIVO desta galeria (rota /dev/design-system).
 *
 * A galeria renderiza pequenos e médios com uso real, portanto precisa de
 * conteúdo de amostra para exibir os componentes. Nenhum dado falsificado
 * vive fora daqui: o sistema (cardápio, pedidos, dashboard) consome
 * exclusivamente a API real.
 */
const sampleCategories = [
  { id: 'cat-pratos', name: 'Pratos Quentes', displayOrder: 1 },
  { id: 'cat-bebidas', name: 'Bebidas', displayOrder: 2 },
  { id: 'cat-tira-gostos', name: 'Tira-Gostos', displayOrder: 3 },
  { id: 'cat-cervejas', name: 'Cervejas', displayOrder: 4 },
];

const sampleProducts: Product[] = [
  {
    id: 'p-001',
    categoryId: 'cat-pratos',
    name: 'Hambúrguer Artesanal',
    description: 'Pão brioche, blend 160g, queijo e molho da casa.',
    price: 32.9,
    featured: true,
    available: 'available',
    displayOrder: 1,
  },
  {
    id: 'p-002',
    categoryId: 'cat-tira-gostos',
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
    categoryId: 'cat-bebidas',
    name: 'Caipirinha de Limão',
    description: 'Limão, açúcar e cachaça artesanal.',
    price: 18.9,
    featured: true,
    available: 'available',
    displayOrder: 4,
  },
];

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: typeof Palette;
  children: ReactNode;
}) {
  return (
    <h2 className="mt-10 flex items-center gap-2 font-display text-xl text-stone-900">
      <Icon className="size-5 text-primary-700" aria-hidden="true" />
      {children}
    </h2>
  );
}

/**
 * Showcase do design system — rota de desenvolvimento (/dev/design-system).
 * Garante uso real de todos os primitivos e serve de validação visual.
 */
export function DesignSystemPage() {
  const { showToast } = useToast();
  const [tabValue, setTabValue] = useState('tab1');
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerBottom, setDrawerBottom] = useState(false);
  const [drawerRight, setDrawerRight] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-2">
        <Badge variant="primary">Somente desenvolvimento</Badge>
        <h1 className="mt-2 font-display text-2xl text-stone-900">Design System</h1>
        <p className="mt-1 text-sm text-stone-500">
          Identidade “Premium + Tropical + Moderno + Clean” — tokens, componentes e estados.
        </p>
      </header>

      {/* Cores */}
      <SectionTitle icon={Palette}>Cores</SectionTitle>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { name: 'Primária (verde)', scale: ['50','100','200','300','400','500','600','700','800','900','950'], prefix: 'c-primary' },
          { name: 'Areia (base)', scale: ['50','100','200','300','400','500'], prefix: 'c-sand' },
          { name: 'Aqua (acentos)', scale: ['50','100','200','300','400','500','600','700','800','900','950'], prefix: 'c-aqua' },
        ].map((group) => (
          <Card key={group.name} padded={false} className="p-3">
            <p className="mb-2 text-sm font-semibold text-stone-700">{group.name}</p>
            <div className="flex flex-wrap gap-1.5">
              {group.scale.map((step) => (
                <span
                  key={step}
                  title={`--${group.prefix}-${step}`}
                  className="size-7 rounded-lg border border-stone-200"
                  style={{ backgroundColor: `var(--${group.prefix}-${step})` }}
                />
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Tipografia */}
      <SectionTitle icon={Type}>Tipografia</SectionTitle>
      <Card className="mt-4 space-y-3">
        <p className="font-display text-2xl text-stone-900">Fraunces — Display & Títulos</p>
        <p className="font-sans text-lg text-stone-800">Plus Jakarta Sans — Corpo e interface</p>
        <p className="font-sans text-sm text-stone-500">Informação auxiliar e descrições curtas</p>
        <p className="font-sans text-xs font-semibold uppercase tracking-wide text-stone-400">Rótulos</p>
      </Card>

      {/* Botões */}
      <SectionTitle icon={MousePointerClick}>Botões</SectionTitle>
      <Card className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="primary">Primário</Button>
        <Button variant="secondary">Secundário</Button>
        <Button variant="ghost">Fantasma</Button>
        <Button variant="danger">Perigo</Button>
        <Button variant="primary" loading>
          Enviando
        </Button>
        <Button variant="primary" disabled>
          Desabilitado
        </Button>
        <Button variant="primary" size="sm">
          Pequeno
        </Button>
        <Button variant="primary" size="lg">
          Grande
        </Button>
      </Card>

      {/* Formulário */}
      <SectionTitle icon={TextCursorInput}>Formulário</SectionTitle>
      <Card className="mt-4 space-y-4">
        <Input name="nome" label="Nome" placeholder="Digite o nome" hint="Texto auxiliar" />
        <Input name="busca" label="Busca" placeholder="Ex.: hambúrguer" error="Campo obrigatório." />
        <Select
          name="area"
          label="Área"
          options={[
            { value: 'piscina', label: 'Piscina' },
            { value: 'restaurante', label: 'Restaurante' },
            { value: 'rio', label: 'Área do Rio' },
          ]}
        />
      </Card>

      {/* Badges e status */}
      <SectionTitle icon={BellRing}>Badges e status</SectionTitle>
      <Card className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="neutral">Neutro</Badge>
        <Badge variant="primary">Primário</Badge>
        <Badge variant="success">Sucesso</Badge>
        <Badge variant="warning">Atenção</Badge>
        <Badge variant="danger">Erro</Badge>
        <Badge variant="info">Info</Badge>
        <Badge variant="outline">Contorno</Badge>
      </Card>
      <Card className="mt-3 flex flex-wrap items-center gap-2">
        <OrderStatusBadge status="PENDING" />
        <OrderStatusBadge status="CONFIRMED" />
        <OrderStatusBadge status="PREPARING" />
        <OrderStatusBadge status="READY" />
        <OrderStatusBadge status="DELIVERED" />
        <OrderStatusBadge status="CANCELLED" />
      </Card>
      <Card className="mt-3 flex flex-wrap items-center gap-2">
        {allTableStatuses.map((status) => (
          <TableStatusBadge key={status} status={status} />
        ))}
      </Card>

      {/* Alertas */}
      <SectionTitle icon={BellRing}>Alertas</SectionTitle>
      <div className="mt-4 space-y-3">
        <Alert variant="info" title="Informação">
          Pedido confirmado pelo estabelecimento.
        </Alert>
        <Alert variant="success" title="Sucesso">
          Pedido enviado com sucesso.
        </Alert>
        <Alert variant="warning" title="Atenção">
          Pode haver demora no preparo.
        </Alert>
        <Alert variant="danger" title="Erro">
          Não foi possível enviar. Tente novamente.
        </Alert>
      </div>

      {/* Cards, avatares e estados */}
      <SectionTitle icon={PanelsTopLeft}>Cards, avatares e estados</SectionTitle>
      <Card className="mt-4 flex flex-wrap items-center gap-3">
        <Avatar name="Ana Souza" size="sm" />
        <Avatar name="Carlos Lima" />
        <Avatar name="Maria Oliveira" size="lg" />
        <Avatar name="Sem Foto" size="md" />
      </Card>
      <Card className="mt-3 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-20 w-20" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <Loading label="Carregando cardápio…" />
        <EmptyState
          icon={PackageSearch}
          title="Nada por aqui"
          description="Nenhum item encontrado para o filtro atual."
        />
      </Card>

      {/* Abas */}
      <SectionTitle icon={PanelsTopLeft}>Abas</SectionTitle>
      <Card className="mt-4">
        <Tabs
          ariaLabel="Exemplo de abas"
          value={tabValue}
          onChange={setTabValue}
          items={[
            { value: 'tab1', label: 'Resumo' },
            { value: 'tab2', label: 'Itens' },
            { value: 'tab3', label: 'Conta' },
          ]}
        />
        <p className="mt-3 text-sm text-stone-600">
          Aba ativa: <strong>{tabValue}</strong> (conteúdo renderizado pelo chamador).
        </p>
      </Card>

      {/* Tabela */}
      <SectionTitle icon={PanelsTopLeft}>Tabela</SectionTitle>
      <Card padded={false} className="mt-4">
        <Table aria-label="Pedidos de exemplo">
          <THead>
            <TRow>
              <TH>Pedido</TH>
              <TH>Mesa</TH>
              <TH>Itens</TH>
              <TH>Status</TH>
              <TH>Total</TH>
            </TRow>
          </THead>
          <TBody>
            {sampleOrders.map((order) => (
              <TRow key={order.id}>
                <TD className="font-semibold">#{order.orderNumber}</TD>
                <TD>{order.tableLabel}</TD>
                <TD>{order.itemsCount}</TD>
                <TD>
                  <OrderStatusBadge status={order.status} />
                </TD>
                <TD>{order.total.toFixed(2)}</TD>
              </TRow>
            ))}
          </TBody>
        </Table>
      </Card>

      {/* Modais e drawers */}
      <SectionTitle icon={PanelsTopLeft}>Modais e drawers</SectionTitle>
      <Card className="mt-4 flex flex-wrap gap-3">
        <Button onClick={() => setModalOpen(true)}>Abrir modal</Button>
        <Button variant="secondary" onClick={() => setDrawerBottom(true)}>
          Bottom sheet
        </Button>
        <Button variant="secondary" onClick={() => setDrawerRight(true)}>
          Drawer lateral
        </Button>
      </Card>

      {/* Menu: categorias e produtos */}
      <SectionTitle icon={PanelsTopLeft}>Cardápio</SectionTitle>
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {sampleCategories.map((category) => (
          <CategoryCard
            key={category.id}
            name={category.name}
            selected={selectedCategory === category.name}
            onClick={() => setSelectedCategory(category.name)}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {sampleProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAdd={(p) => showToast('success', `${p.name} adicionado (visual).`)}
          />
        ))}
      </div>

      {/* Modais/drawers/feedback */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Solicitar conta"
        footer={
          <Button fullWidth onClick={() => setModalOpen(false)}>
            Confirmar
          </Button>
        }
      >
        <p className="text-sm text-stone-600">
          Confira seus pedidos antes de solicitar o fechamento da mesa.
        </p>
      </Modal>

      <Drawer
        open={drawerBottom}
        onClose={() => setDrawerBottom(false)}
        title="Detalhes do produto"
        placement="bottom"
      >
        <p className="text-sm text-stone-600">
          Bottom sheet — padrão de detalhes de produto no mobile.
        </p>
      </Drawer>

      <Drawer
        open={drawerRight}
        onClose={() => setDrawerRight(false)}
        title="Carrinho"
        placement="right"
      >
        <p className="text-sm text-stone-600">
          Drawer lateral — padrão para o carrinho em telas maiores.
        </p>
      </Drawer>
    </div>
  );
}
