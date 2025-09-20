import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton de loading para o dashboard
 */
export default function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-28" />
            </div>
          </div>
        </div>

        {/* Cards de KPIs Skeleton */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="w-5 h-5" />
            <Skeleton className="h-5 w-32" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-8 h-8 rounded-lg" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-5 w-20" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-2 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Gráficos Skeleton */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="w-5 h-5" />
            <Skeleton className="h-5 w-48" />
          </div>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-5 h-5" />
                  <Skeleton className="h-5 w-40" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>

        {/* Metas Skeleton */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="w-5 h-5" />
            <Skeleton className="h-5 w-40" />
          </div>
          
          <div className="space-y-4">
            {[...Array(2)].map((_, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-lg" />
                      <div>
                        <Skeleton className="h-5 w-32 mb-1" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-24" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Insights Skeleton */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="w-5 h-5" />
            <Skeleton className="h-5 w-48" />
          </div>
          
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-6 h-6 rounded-full mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <div className="flex gap-1">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer Skeleton */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <Skeleton className="h-4 w-full max-w-md mx-auto" />
        </div>
      </div>
    </div>
  );
}

