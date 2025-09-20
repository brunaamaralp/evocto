import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertTriangle, 
  Download, 
  RefreshCw, 
  Globe,
  FileText,
  Loader2
} from 'lucide-react';
import { auditTranslations } from '@/api/functions/auditTranslations';
import { toast } from 'sonner';

export default function TranslationAuditor() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const runAudit = async () => {
    setLoading(true);
    try {
      const response = await auditTranslations({ verbose: true });
      setResults(response.data);
      
      if (response.data.status === 'passed') {
        toast.success('Translation audit passed!');
      } else {
        toast.warning('Translation issues found');
      }
    } catch (error) {
      toast.error('Failed to run translation audit');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    try {
      const response = await auditTranslations({ format: 'markdown' });
      const blob = new Blob([response.data], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `translation-audit-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <AlertTriangle className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            <CardTitle>Translation Audit</CardTitle>
          </div>
          <div className="flex gap-2">
            {results && (
              <Button onClick={downloadReport} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
            )}
            <Button onClick={runAudit} disabled={loading} size="sm">
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Run Audit
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!results && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Click "Run Audit" to check translation consistency</p>
          </div>
        )}

        {results && (
          <>
            {/* Status Overview */}
            <div className="flex items-center gap-4">
              <Badge className={getStatusColor(results.status)}>
                {getStatusIcon(results.status)}
                <span className="ml-2">
                  {results.status === 'passed' ? 'All Good' : 'Issues Found'}
                </span>
              </Badge>
              
              <div className="flex gap-4 text-sm text-gray-600">
                <span>Total: {results.summary.total}</span>
                <span>Valid: {results.summary.valid}</span>
                <span>Errors: {results.summary.errors}</span>
              </div>
            </div>

            {/* Error Summary */}
            {results.status === 'failed' && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <div className="space-y-1">
                    {results.issues.missingInPortuguese > 0 && (
                      <div>• {results.issues.missingInPortuguese} keys missing in Portuguese</div>
                    )}
                    {results.issues.missingInEnglish > 0 && (
                      <div>• {results.issues.missingInEnglish} keys missing in English</div>
                    )}
                    {results.issues.emptyInEnglish > 0 && (
                      <div>• {results.issues.emptyInEnglish} empty values in English</div>
                    )}
                    {results.issues.emptyInPortuguese > 0 && (
                      <div>• {results.issues.emptyInPortuguese} empty values in Portuguese</div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Success Message */}
            {results.status === 'passed' && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  All {results.summary.total} translation keys are consistent across both languages!
                </AlertDescription>
              </Alert>
            )}

            {/* Details */}
            {results.details && results.status === 'failed' && (
              <div className="space-y-4">
                {results.details.missingInPt?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-700 mb-2">Missing in Portuguese:</h4>
                    <div className="bg-red-50 p-3 rounded max-h-40 overflow-y-auto">
                      {results.details.missingInPt.slice(0, 10).map((key, index) => (
                        <div key={index} className="text-sm font-mono text-red-800">
                          ❌ {key}
                        </div>
                      ))}
                      {results.details.missingInPt.length > 10 && (
                        <div className="text-sm text-red-600 mt-2">
                          ... and {results.details.missingInPt.length - 10} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {results.details.missingInEn?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-700 mb-2">Missing in English:</h4>
                    <div className="bg-red-50 p-3 rounded max-h-40 overflow-y-auto">
                      {results.details.missingInEn.slice(0, 10).map((key, index) => (
                        <div key={index} className="text-sm font-mono text-red-800">
                          ❌ {key}
                        </div>
                      ))}
                      {results.details.missingInEn.length > 10 && (
                        <div className="text-sm text-red-600 mt-2">
                          ... and {results.details.missingInEn.length - 10} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sample Valid Keys */}
            {results.valid?.length > 0 && (
              <div>
                <h4 className="font-medium text-green-700 mb-2">Valid Keys (sample):</h4>
                <div className="bg-green-50 p-3 rounded">
                  {results.valid.map((key, index) => (
                    <div key={index} className="text-sm font-mono text-green-800">
                      ✅ {key}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}