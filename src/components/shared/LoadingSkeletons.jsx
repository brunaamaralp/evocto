import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Skeleton base
export function Skeleton({ className = "", ...props }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      {...props}
    />
  );
}

// Skeleton para KPI Card
export function KPISkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-20" />
      </CardContent>
    </Card>
  );
}

// Skeleton para Dashboard de KPIs
export function KPIDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <KPISkeleton key={i} />
        ))}
      </div>

      {/* Chart Area */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// Skeleton para Upload de Arquivos
export function FileUploadSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-8">
          <div className="flex flex-col items-center space-y-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        {/* File List */}
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8" />
                <div>
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Skeleton para Tabela
export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-4">
      {/* Table Header */}
      <div className="grid grid-cols-4 gap-4 pb-2 border-b">
        {[...Array(columns)].map((_, i) => (
          <Skeleton key={i} className="h-4 w-24" />
        ))}
      </div>

      {/* Table Rows */}
      {[...Array(rows)].map((_, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-4 gap-4 py-2">
          {[...Array(columns)].map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Skeleton para Formulário
export function FormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form Fields */}
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}

        {/* Buttons */}
        <div className="flex gap-3">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

// Skeleton para Lista de Aprendizados
export function LearningsSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Skeleton para Dashboard Executivo
export function ExecutiveDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-56" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Resumo Executivo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Grid de Análises */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}