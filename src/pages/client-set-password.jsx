import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, LogIn } from 'lucide-react';

/**
 * Fluxo legado de definir senha do cliente.
 * A criação real de conta cliente usa senha temporária → /client-login.
 * Se houver token de ativação, encaminha para /client-activation.
 */
export default function ClientSetPassword() {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token') || '';
  const activationHref = token
    ? `/client-activation?token=${encodeURIComponent(token)}`
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <KeyRound className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Acesso ao portal</CardTitle>
              <p className="text-sm text-gray-600 mt-0.5">
                Use a senha enviada pela sua agência ou redefina em seguida.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {activationHref ? (
            <Button asChild className="w-full">
              <Link to={activationHref}>Ativar conta com este link</Link>
            </Button>
          ) : null}
          <Button asChild className="w-full" variant={activationHref ? 'outline' : 'default'}>
            <Link to="/client-login">
              <LogIn className="mr-2 h-4 w-4" />
              Entrar no portal do cliente
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/password-reset">Esqueci minha senha</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
