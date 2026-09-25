import { Link } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';

import { Button } from '../components/ui/Button.js';
import { EmptyState } from '../components/ui/EmptyState.js';

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-sand-50">
      <EmptyState
        icon={MapPinOff}
        title="Página não encontrada"
        description="O link acessado não existe ou foi movido."
      >
        <Link to="/">
          <Button variant="secondary">Voltar ao início</Button>
        </Link>
      </EmptyState>
    </div>
  );
}
