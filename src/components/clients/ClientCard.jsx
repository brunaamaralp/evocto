import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Mail, 
  Eye, 
  Edit3,
  Phone
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function ClientCard({ client, onEdit }) {
  const getStatusBadge = () => {
    if (client.status === 'ativo') {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
          Ativo
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200">
        Inativo
      </Badge>
    );
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-blue-200 bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                {client.name}
              </h3>
              {getStatusBadge()}
            </div>
            {client.legal_name && client.legal_name !== client.name && (
              <p className="text-sm text-gray-500">
                {client.legal_name}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit && onEdit(client)}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-gray-400 hover:text-gray-600"
          >
            <Edit3 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        {/* Informações de Contato */}
        <div className="space-y-2">
          {client.email && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
          
          {client.phone && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{client.phone}</span>
            </div>
          )}
          
          {client.sector && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span>{client.sector}</span>
            </div>
          )}
        </div>

        {/* Botão de Ação */}
        <div className="flex justify-end pt-2">
          <Link to={createPageUrl('client') + `?clientId=${client.id}`}>
            <Button 
              variant="outline" 
              size="sm" 
              className="group-hover:bg-blue-50 group-hover:border-blue-300 group-hover:text-blue-600 transition-all"
            >
              <Eye className="w-4 h-4 mr-2" />
              Ver detalhes
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}