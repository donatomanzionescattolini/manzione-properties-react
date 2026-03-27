import { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, isSameDay, parseISO, differenceInDays } from 'date-fns';
import { useDataStore } from '../../store/dataStore';
import { PageHeader } from '../../components/layout/PageHeader';
import { Wrench, DollarSign, Calendar as CalendarIcon, FileWarning } from 'lucide-react';

export function CalendarPage() {
  const { maintenanceRequests, tenants, properties } = useDataStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Aggregate events
  const getEventsForDate = (date: Date) => {
    const events: { id: string; type: string; title: string; color: string; icon: React.ReactNode; link?: string }[] = [];

    // Maintenance requested / updated
    maintenanceRequests.forEach((req) => {
      const d = new Date(req.submittedDate);
      if (isSameDay(d, date) && req.status !== 'completed' && req.status !== 'cancelled') {
        const daysOpen = differenceInDays(new Date(), d);
        const isOverdue = daysOpen > 3;
        events.push({
          id: `m-${req.id}`,
          type: 'maintenance',
          title: `[${req.priority.toUpperCase()}] ${req.title} ${isOverdue ? '(OVERDUE)' : ''}`,
          color: req.priority === 'emergency' || isOverdue ? 'text-red-600 font-bold' : 'text-orange-500',
          icon: <Wrench size={14} />
        });
      }
    });

    // Rents Due (Rent is usually due on a specific day of the month)
    // We will check if the current date day matches any active tenant's property rent_due_day
    properties.forEach((prop) => {
      if (prop.rentDueDay === date.getDate()) {
        const propTenants = tenants.filter(t => t.propertyId === prop.id && t.status === 'active');
        propTenants.forEach(t => {
          events.push({
            id: `rent-${t.id}-${date.getTime()}`,
            type: 'rent',
            title: `Rent Due: ${t.firstName} ${t.lastName} ($${t.rentAmount})`,
            color: 'text-green-600',
            icon: <DollarSign size={14} />
          });
        });
      }
    });

    // Lease End Dates
    tenants.forEach((t) => {
      if (t.status === 'active' && t.leaseEndDate) {
        const d = parseISO(t.leaseEndDate);
        if (isSameDay(d, date)) {
          events.push({
            id: `lease-${t.id}`,
            type: 'lease',
            title: `Lease Expires: ${t.firstName} ${t.lastName}`,
            color: 'text-purple-600',
            icon: <FileWarning size={14} />
          });
        }
      }
    });

    return events;
  };

  const selectedEvents = getEventsForDate(selectedDate);

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const dayEvents = getEventsForDate(date);
      if (dayEvents.length > 0) {
        return (
          <div className="flex justify-center mt-1 gap-1 flex-wrap">
            {dayEvents.slice(0, 3).map((e, idx) => (
              <div key={idx} className={`w-1.5 h-1.5 rounded-full ${e.type === 'rent' ? 'bg-green-500' : e.type === 'maintenance' ? 'bg-orange-500' : 'bg-purple-500'}`} />
            ))}
            {dayEvents.length > 3 && <span className="text-[10px] text-gray-500">+{dayEvents.length - 3}</span>}
          </div>
        );
      }
    }
    return null;
  };

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      if (isSameDay(date, new Date())) return 'bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200';
    }
    return 'rounded-lg hover:bg-gray-100';
  };

  return (
    <div>
      <PageHeader
        title="Calendar & Reminders"
        subtitle="Track important dates, maintenance, and rent schedules"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 page-card">
          <style dangerouslySetInnerHTML={{__html: `
            .react-calendar {
              width: 100%;
              border: none;
              font-family: inherit;
            }
            .react-calendar__navigation button {
              min-width: 44px;
              background: none;
              font-size: 16px;
              font-weight: 500;
              margin-top: 8px;
            }
            .react-calendar__navigation button:enabled:hover,
            .react-calendar__navigation button:enabled:focus {
              background-color: #f3f4f6;
              border-radius: 8px;
            }
            .react-calendar__month-view__days__day {
              padding: 1em 0.5em;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-start;
              height: 80px;
            }
            .react-calendar__tile--now {
              background: #ebf8ff;
              border-radius: 8px;
            }
            .react-calendar__tile--active {
              background: #1a3a52 !important;
              color: white;
              border-radius: 8px;
            }
            .react-calendar__tile--active .rounded-full {
               opacity: 0.8;
            }
            .react-calendar__month-view__weekdays {
               text-transform: uppercase;
               font-size: 0.75rem;
               font-weight: 600;
               color: #6b7280;
               text-decoration: none;
            }
            .react-calendar__month-view__weekdays__weekday abbr {
               text-decoration: none;
            }
          `}} />
          <Calendar
            onChange={(val) => setSelectedDate(val as Date)}
            value={selectedDate}
            tileContent={tileContent}
            tileClassName={tileClassName}
            next2Label={null}
            prev2Label={null}
          />
        </div>

        <div className="page-card flex flex-col h-full">
          <div className="flex items-center gap-2 mb-4 border-b pb-4">
            <CalendarIcon size={20} className="text-[#1a3a52]" />
            <h2 className="text-lg font-semibold text-gray-800">
              {isSameDay(selectedDate, new Date()) ? 'Today' : format(selectedDate, 'MMM do, yyyy')}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {selectedEvents.length === 0 ? (
              <div className="text-center py-10 text-gray-400 flex flex-col items-center">
                <CalendarIcon size={32} className="mb-2 opacity-50" />
                <p>No events scheduled for this day.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedEvents.map(e => (
                  <div key={e.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className={`mt-0.5 ${e.color}`}>
                      {e.icon}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${e.color}`}>{e.title}</p>
                      <p className="text-xs text-gray-500 capitalize">{e.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t text-xs text-gray-500">
             <p className="font-semibold mb-2 text-gray-600">Legend:</p>
             <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Rent Due</div>
             <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Maintenance Request (Open)</div>
             <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Lease Expiring</div>
          </div>
        </div>
      </div>
    </div>
  );
}
