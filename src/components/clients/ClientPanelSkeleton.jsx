import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const ClientPanelSkeleton = ({ message = "Carregando painel do cliente..." }) => (
  <div className="animate-pulse">
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex items-start space-x-4">
          <div className="h-16 w-16 rounded-xl bg-slate-200"></div>
          <div className="flex-1 space-y-2">
            <div className="h-7 w-1/2 rounded bg-slate-200"></div>
            <div className="h-5 w-1/3 rounded bg-slate-200"></div>
            <div className="h-4 w-3/4 rounded bg-slate-200"></div>
          </div>
        </div>
      </CardContent>
    </Card>

    <div className="flex space-x-6 border-b mb-6">
      <div className="h-8 w-24 bg-slate-200 rounded-t-md"></div>
      <div className="h-8 w-24 bg-slate-200 rounded-t-md"></div>
      <div className="h-8 w-24 bg-slate-200 rounded-t-md"></div>
    </div>

    <Card>
      <CardHeader>
        <div className="h-6 w-1/4 bg-slate-200 rounded"></div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-12 w-full bg-slate-100 rounded-lg"></div>
        <div className="h-12 w-full bg-slate-100 rounded-lg"></div>
        <div className="h-12 w-full bg-slate-100 rounded-lg"></div>
      </CardContent>
    </Card>
    
    <div className="text-center mt-4 text-sm text-slate-500">{message}</div>
  </div>
);

export default ClientPanelSkeleton;