import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  GripVertical,
  Trash2,
  Plus
} from "lucide-react";
import { Droppable, Draggable } from '@hello-pangea/dnd';

function ScopeColumn({ type, items, provided, onUpdateItem, onDeleteItem, onAddItem }) {
  const [newItemText, setNewItemText] = useState('');

  const handleAddItem = () => {
    if (newItemText.trim()) {
      onAddItem(type, newItemText.trim());
      setNewItemText('');
    }
  };

  return (
    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3 min-h-[100px] flex-grow flex flex-col">
      <div className="flex-grow space-y-3">
        {items.map((item, index) => (
          <Draggable key={item.id} draggableId={String(item.id)} index={item.order}>
            {(draggableProvided) => (
              <div
                ref={draggableProvided.innerRef}
                {...draggableProvided.draggableProps}
                className="flex items-center gap-2 p-2 bg-slate-50 border rounded-lg focus-within:ring-2 focus-within:ring-blue-500"
              >
                <button
                  {...draggableProvided.dragHandleProps}
                  className="p-1 cursor-grab"
                  aria-label="Arrastar item"
                >
                  <GripVertical className="w-5 h-5 text-slate-400 flex-shrink-0" />
                </button>
                <Textarea
                  defaultValue={item.description}
                  onBlur={(e) => onUpdateItem(item.id, e.target.value)}
                  className="flex-grow resize-none border-0 shadow-none focus-visible:ring-0 p-1"
                  rows={2}
                  aria-label={`Item de escopo: ${item.description}`}
                />
                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => onDeleteItem(item.id)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </Draggable>
        ))}
        {provided.placeholder}
      </div>
      <div className="mt-auto pt-2 flex gap-2">
        <Input 
          placeholder="Adicionar novo item..." 
          value={newItemText} 
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
        />
        <Button onClick={handleAddItem} size="icon">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function ScopeCards({ scopeItems, onUpdateItem, onAddItem, onDeleteItem }) {
  const inScopeItems = scopeItems.filter(i => i.type === 'in_scope').sort((a, b) => a.order - b.order);
  const outOfScopeItems = scopeItems.filter(i => i.type === 'out_of_scope').sort((a, b) => a.order - b.order);

  return (
    <Card className="border-0 shadow-xl" data-tutorial="scope-columns">
      <CardHeader className="p-4 border-b">
        <CardTitle className="text-2xl font-bold text-slate-900">Definição de Escopo</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-4 bg-green-50/50 rounded-lg border border-green-200 flex flex-col">
            <h3 className="font-bold text-green-800 mb-2" id="in-scope-heading">✔️ Incluído no Escopo ({inScopeItems.length})</h3>
            <Droppable droppableId="in_scope">
              {(provided) => (
                <ScopeColumn
                  type="in_scope"
                  items={inScopeItems}
                  provided={provided}
                  onUpdateItem={onUpdateItem}
                  onAddItem={onAddItem}
                  onDeleteItem={onDeleteItem}
                />
              )}
            </Droppable>
          </div>

          <div className="p-4 bg-red-50/50 rounded-lg border border-red-200 flex flex-col">
            <h3 className="font-bold text-red-800 mb-2" id="out-of-scope-heading">🚫 Fora do Escopo ({outOfScopeItems.length})</h3>
            <Droppable droppableId="out_of_scope">
              {(provided) => (
                <ScopeColumn
                  type="out_of_scope"
                  items={outOfScopeItems}
                  provided={provided}
                  onUpdateItem={onUpdateItem}
                  onAddItem={onAddItem}
                  onDeleteItem={onDeleteItem}
                />
              )}
            </Droppable>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}