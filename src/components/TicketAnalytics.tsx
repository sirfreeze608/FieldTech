import React from 'react';
import { useTickets } from '../hooks/useTickets';
import { useStore } from '../store/useStore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart2 } from 'lucide-react';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';

export function TicketAnalytics() {
  const { user } = useStore();
  const { tickets } = useTickets(undefined, user?.orgCode);

  const data = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayTickets = tickets.filter(t => {
      const ticketDate = t.createdAt?.toDate();
      return ticketDate && isSameDay(ticketDate, date);
    });

    return {
      name: format(date, 'MMM dd'),
      count: dayTickets.length,
    };
  });

  return (
    <section className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100 h-full">
      <div className="flex items-center gap-2 mb-6">
        <BarChart2 className="h-5 w-5 text-neutral-900" />
        <h2 className="text-lg font-bold">Ticket Volume (7 Days)</h2>
      </div>

      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1a1a1a" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#1a1a1a" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#A3A3A3', fontWeight: 600 }}
              dy={10}
            />
            <YAxis 
              hide 
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="count" 
              stroke="#1a1a1a" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorCount)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
