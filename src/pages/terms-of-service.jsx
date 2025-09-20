import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Termos de Serviço</CardTitle>
        </CardHeader>
        <CardContent className="prose max-w-none">
          <h2>1. Termos</h2>
          <p>Ao acessar ao site InsightFlow, concorda em cumprir estes termos de serviço, todas as leis e regulamentos aplicáveis ​​e concorda que é responsável pelo cumprimento de todas as leis locais aplicáveis. Se você não concordar com algum desses termos, está proibido de usar ou acessar este site. Os materiais contidos neste site são protegidos pelas leis de direitos autorais e marcas comerciais aplicáveis.</p>
          
          <h2>2. Uso de Licença</h2>
          <p>É concedida permissão para baixar temporariamente uma cópia dos materiais (informações ou software) no site InsightFlow , apenas para visualização transitória pessoal e não comercial. Esta é a concessão de uma licença, não uma transferência de título e, sob esta licença, você não pode: </p>
          <ol>
            <li>modificar ou copiar os materiais;</li>
            <li>usar os materiais para qualquer finalidade comercial ou para exibição pública (comercial ou não comercial);</li>
            <li>tentar descompilar ou fazer engenharia reversa de qualquer software contido no site InsightFlow;</li>
            <li>remover quaisquer direitos autorais ou outras notações de propriedade dos materiais; ou</li>
            <li>transferir os materiais para outra pessoa ou 'espelhe' os materiais em qualquer outro servidor.</li>
          </ol>
          <p>Esta licença será automaticamente rescindida se você violar alguma dessas restrições e poderá ser rescindida por InsightFlow a qualquer momento. Ao encerrar a visualização desses materiais ou após o término desta licença, você deve apagar todos os materiais baixados em sua posse, seja em formato eletrónico ou impresso.</p>
          
          <h2>3. Isenção de responsabilidade</h2>
          <ol>
            <li>Os materiais no site da InsightFlow são fornecidos 'como estão'. InsightFlow não oferece garantias, expressas ou implícitas, e, por este meio, isenta e nega todas as outras garantias, incluindo, sem limitação, garantias implícitas ou condições de comercialização, adequação a um fim específico ou não violação de propriedade intelectual ou outra violação de direitos.</li>
            <li>Além disso, o InsightFlow não garante ou faz qualquer representação relativa à precisão, aos resultados prováveis ​​ou à confiabilidade do uso dos materiais em seu site ou de outra forma relacionado a esses materiais ou em sites vinculados a este site.</li>
          </ol>

          {/* Adicionar mais seções conforme necessário */}
        </CardContent>
      </Card>
    </div>
  );
}