import { useMemo, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceDot, ComposedChart, Scatter
} from "recharts";

interface Trade {
  date: string;
  action: string;
  price: number;
  amount: number;
  pnl: number | null;
  balance: number;
}

interface EquityPoint {
  date: string;
  value: number;
  buyHoldValue?: number;
}

interface EnhancedEquityChartProps {
  data: EquityPoint[];
  trades: Trade[];
  currency: string;
}

interface ChartDataPoint extends EquityPoint {
  tradeAction?: string;
  tradePrice?: number;
  tradeAmount?: number;
  tradePnl?: number | null;
}

export function EnhancedEquityChart({ data, trades, currency }: EnhancedEquityChartProps) {
  const [hoveredTrade, setHoveredTrade] = useState<Trade | null>(null);

  // 合併圖表數據與交易信息
  const chartData = useMemo(() => {
    const tradeMap = new Map<string, Trade[]>();
    trades.forEach(trade => {
      if (!tradeMap.has(trade.date)) {
        tradeMap.set(trade.date, []);
      }
      tradeMap.get(trade.date)!.push(trade);
    });

    return data.map(point => {
      const dayTrades = tradeMap.get(point.date) || [];
      const buyTrade = dayTrades.find(t => t.action === "BUY");
      const sellTrade = dayTrades.find(t => t.action === "SELL");

      return {
        ...point,
        buyTrade,
        sellTrade,
      };
    });
  }, [data, trades]);

  // 自定義 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    const isBuy = data.buyTrade;
    const isSell = data.sellTrade;
    const trade = data.buyTrade || data.sellTrade;

    return (
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-3 min-w-max">
        <p className="text-xs font-bold text-slate-600 mb-2">{data.date}</p>
        
        {/* 淨值 */}
        <div className="mb-2">
          <p className="text-xs text-slate-500">淨值</p>
          <p className="text-sm font-black text-teal-600">{currency} {data.value.toFixed(2)}</p>
        </div>

        {/* 買入持有 */}
        {data.buyHoldValue && (
          <div className="mb-2 pb-2 border-b border-slate-100">
            <p className="text-xs text-slate-500">買入持有</p>
            <p className="text-sm font-black text-slate-400">{currency} {data.buyHoldValue.toFixed(2)}</p>
          </div>
        )}

        {/* 交易信息 */}
        {trade && (
          <div className={`rounded p-2 ${isBuy ? 'bg-teal-50' : 'bg-rose-50'}`}>
            <p className={`text-xs font-bold ${isBuy ? 'text-teal-700' : 'text-rose-700'}`}>
              {isBuy ? '🟢 買入' : '🔴 賣出'}
            </p>
            <div className="text-xs text-slate-600 mt-1 space-y-0.5">
              <p>價格: {currency} {trade.price.toFixed(2)}</p>
              <p>數量: {trade.amount.toFixed(2)}</p>
              {trade.pnl !== null && (
                <p className={`font-bold ${trade.pnl >= 0 ? 'text-teal-600' : 'text-rose-600'}`}>
                  損益: {currency} {trade.pnl.toFixed(2)}
                </p>
              )}
              <p>餘額: {currency} {trade.balance.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={450}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0d9488" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
          <XAxis dataKey="date" hide />
          <YAxis hide domain={['auto', 'auto']} />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* 主策略曲線 */}
          <Area 
            type="monotone" 
            dataKey="value" 
            name="AI 策略" 
            stroke="#0d9488" 
            strokeWidth={2} 
            fillOpacity={1} 
            fill="url(#colorValue)" 
          />
          
          {/* 買入持有曲線 */}
          <Area 
            type="monotone" 
            dataKey="buyHoldValue" 
            name="買入持有" 
            stroke="#94a3b8" 
            strokeWidth={2} 
            strokeDasharray="5 5" 
            fill="none" 
          />
          
          {/* 買入點 */}
          <Scatter 
            name="買入點" 
            data={chartData.filter(d => d.buyTrade)} 
            fill="#10b981" 
            shape="circle"
          >
            {chartData.map((entry, index) => 
              entry.buyTrade ? (
                <ReferenceDot
                  key={`buy-${index}`}
                  x={entry.date}
                  y={entry.value}
                  r={6}
                  fill="#10b981"
                  stroke="#fff"
                  strokeWidth={2}
                  onClick={() => setHoveredTrade(entry.buyTrade!)}
                  style={{ cursor: 'pointer' }}
                >
                  <text
                    x={0}
                    y={-12}
                    textAnchor="middle"
                    fill="#10b981"
                    fontSize={11}
                    fontWeight="bold"
                  >
                    B
                  </text>
                </ReferenceDot>
              ) : null
            )}
          </Scatter>
          
          {/* 賣出點 */}
          <Scatter 
            name="賣出點" 
            data={chartData.filter(d => d.sellTrade)} 
            fill="#ef4444" 
            shape="circle"
          >
            {chartData.map((entry, index) => 
              entry.sellTrade ? (
                <ReferenceDot
                  key={`sell-${index}`}
                  x={entry.date}
                  y={entry.value}
                  r={6}
                  fill="#ef4444"
                  stroke="#fff"
                  strokeWidth={2}
                  onClick={() => setHoveredTrade(entry.sellTrade!)}
                  style={{ cursor: 'pointer' }}
                >
                  <text
                    x={0}
                    y={-12}
                    textAnchor="middle"
                    fill="#ef4444"
                    fontSize={11}
                    fontWeight="bold"
                  >
                    S
                  </text>
                </ReferenceDot>
              ) : null
            )}
          </Scatter>
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* 圖例 */}
      <div className="flex gap-6 mt-4 text-xs font-bold text-slate-600 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-teal-600"></div>
          <span>AI 策略</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-1 bg-slate-400" style={{ borderRadius: '1px' }}></div>
          <span>買入持有</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>買入點</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>賣出點</span>
        </div>
      </div>
    </div>
  );
}
