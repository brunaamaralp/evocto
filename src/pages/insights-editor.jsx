import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Insights, Job, Brief } from '@/api/entities';
import { InvokeLLM } from '@/api/integrations';
import { useSession } from '@/components/auth/SessionManager';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import InsightsCards from '../components/insights/InsightsCards';

const insightsSchema = {
    type: "object",
    properties: {
        persona: { type: "string" },
        dores: { type: "array", items: { type: "string" } },
        objecoes: { type: "array", items: { "type": "string" } },
        tom_de_voz: { type: "string" },
        claims_de_risco: { type: "array", items: { "type": "string" } },
        confidence_score: { type: "number" }
    },
    required: ["persona", "dores", "tom_de_voz", "confidence_score"]
};

export default function InsightsEditor() {
    const { id } = useParams();
    const [insight, setInsight] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const { agency } = useSession();

    const processInsightJob = useCallback(async (job) => {
        if (isProcessing) return;
        setIsProcessing(true);
        
        try {
            await Job.update(job.id, { status: 'processing', lastAttemptAt: new Date().toISOString() });
            
            const brief = await Brief.get(job.payload.briefId);
            const briefContent = { ...brief };
            delete briefContent.id; // clean up for prompt

            const prompt = `Baseado no seguinte briefing, gere os insights de marketing:\n\n${JSON.stringify(briefContent, null, 2)}`;
            
            const result = await InvokeLLM({
                prompt: prompt,
                response_json_schema: insightsSchema
            });

            await Insights.update(id, { ...result, status: 'ready' });
            await Job.update(job.id, { status: 'completed', result: result, completedAt: new Date().toISOString() });
            
            setInsight(prev => ({ ...prev, ...result, status: 'ready' }));

        } catch (e) {
            const attempts = (job.attempts || 0) + 1;
            const newStatus = attempts >= (job.maxAttempts || 5) ? 'dead_letter' : 'failed';
            
            const backoff = 1000 * (2 ** attempts); // Exponential backoff
            const nextAttempt = new Date(Date.now() + backoff);

            const errorUpdate = { message: e.message, stack: e.stack };

            await Job.update(job.id, { 
                status: newStatus, 
                error: errorUpdate, 
                attempts: attempts,
                processAt: nextAttempt.toISOString()
            });
            await Insights.update(id, { status: 'failed', last_error: e.message });
            
            setError(e.message);
            setInsight(prev => ({ ...prev, status: 'failed', last_error: e.message }));
        } finally {
            setIsProcessing(false);
        }
    }, [id, isProcessing]);

    useEffect(() => {
        if (!id) return;
        
        const loadData = async () => {
            setLoading(true);
            try {
                const insightData = await Insights.get(id);
                setInsight(insightData);

                if (insightData.status === 'generating') {
                    const [job] = await Job.filter({ 'payload.insightId': id, status: { '$in': ['queued', 'failed'] } });
                    
                    if (job && new Date(job.processAt) <= new Date()) {
                        await processInsightJob(job);
                    }
                }
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        loadData();
        const interval = setInterval(loadData, 15000); // Poll for updates
        return () => clearInterval(interval);

    }, [id, processInsightJob]);

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }
    
    if (error && !insight) {
        return <div className="text-red-500">Erro ao carregar insights: {error}</div>;
    }

    if (!insight) {
        return <div>Insight não encontrado.</div>;
    }

    if (insight.status === 'generating') {
        return (
            <Card className="text-center p-8">
                <CardHeader>
                    <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-600 mb-4" />
                    <CardTitle>Gerando Insights...</CardTitle>
                    <CardDescription>Aguarde um momento. Nossa IA está analisando o briefing.</CardDescription>
                </CardHeader>
            </Card>
        );
    }
    
    if (insight.status === 'failed') {
        return (
             <Card className="text-center p-8 border-red-200 bg-red-50">
                <CardHeader>
                    <CardTitle className="text-red-800">Falha na Geração</CardTitle>
                    <CardDescription className="text-red-700">Ocorreu um erro: {insight.last_error}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => window.location.reload()}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Tentar Novamente
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Insights Gerados</h1>
            <InsightsCards insight={insight} />
            {/* Add editing capabilities here in a real scenario */}
        </div>
    );
}