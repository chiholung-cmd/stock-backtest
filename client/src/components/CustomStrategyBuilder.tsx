import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Code } from "lucide-react";

interface CustomStrategy {
  name: string;
  description: string;
  params: Record<string, { label: string; value: number; min: number; max: number }>;
  code?: string;
}

interface CustomStrategyBuilderProps {
  onStrategyCreate?: (strategy: CustomStrategy) => void;
}

export function CustomStrategyBuilder({ onStrategyCreate }: CustomStrategyBuilderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [strategy, setStrategy] = useState<CustomStrategy>({
    name: "",
    description: "",
    params: {},
    code: "",
  });
  const [paramName, setParamName] = useState("");
  const [paramLabel, setParamLabel] = useState("");
  const [paramMin, setParamMin] = useState<number>(0);
  const [paramMax, setParamMax] = useState<number>(100);
  const [paramValue, setParamValue] = useState<number>(50);

  const handleAddParam = () => {
    if (!paramName.trim()) return;
    
    setStrategy(prev => ({
      ...prev,
      params: {
        ...prev.params,
        [paramName]: {
          label: paramLabel || paramName,
          value: paramValue,
          min: paramMin,
          max: paramMax,
        }
      }
    }));
    
    setParamName("");
    setParamLabel("");
    setParamMin(0);
    setParamMax(100);
    setParamValue(50);
  };

  const handleRemoveParam = (key: string) => {
    setStrategy(prev => {
      const newParams = { ...prev.params };
      delete newParams[key];
      return { ...prev, params: newParams };
    });
  };

  const handleCreate = () => {
    if (!strategy.name.trim()) return;
    onStrategyCreate?.(strategy);
    setStrategy({ name: "", description: "", params: {}, code: "" });
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="w-full gap-2"
      >
        <Code size={16} />
        自定義策略
      </Button>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          策略名稱
        </label>
        <Input
          placeholder="例如：我的組合策略"
          value={strategy.name}
          onChange={(e) => setStrategy(prev => ({ ...prev, name: e.target.value }))}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          策略描述
        </label>
        <Textarea
          placeholder="描述您的策略邏輯..."
          value={strategy.description}
          onChange={(e) => setStrategy(prev => ({ ...prev, description: e.target.value }))}
          className="min-h-20"
        />
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-semibold text-slate-700">
          策略參數
        </label>
        
        {Object.entries(strategy.params).map(([key, param]) => (
          <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-900">{param.label}</div>
              <div className="text-xs text-slate-500">
                {key}: {param.min} ~ {param.max} (預設: {param.value})
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleRemoveParam(key)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ))}

        <div className="space-y-2 p-3 bg-slate-50 rounded-lg">
          <Input
            placeholder="參數名稱（英文）"
            value={paramName}
            onChange={(e) => setParamName(e.target.value)}
          />
          <Input
            placeholder="參數標籤（中文）"
            value={paramLabel}
            onChange={(e) => setParamLabel(e.target.value)}
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="number"
              placeholder="最小值"
              value={String(paramMin)}
              onChange={(e) => setParamMin(Number(e.target.value))}
            />
            <Input
              type="number"
              placeholder="最大值"
              value={String(paramMax)}
              onChange={(e) => setParamMax(Number(e.target.value))}
            />
            <Input
              type="number"
              placeholder="預設值"
              value={String(paramValue)}
              onChange={(e) => setParamValue(Number(e.target.value))}
            />
          </div>
          <Button
            onClick={handleAddParam}
            variant="outline"
            className="w-full gap-2"
          >
            <Plus size={14} />
            新增參數
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleCreate}
          disabled={!strategy.name.trim()}
          className="flex-1 bg-teal-600 hover:bg-teal-700"
        >
          建立策略
        </Button>
        <Button
          onClick={() => setIsOpen(false)}
          variant="outline"
          className="flex-1"
        >
          取消
        </Button>
      </div>
    </Card>
  );
}
