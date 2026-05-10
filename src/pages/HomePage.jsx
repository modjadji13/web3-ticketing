import { ArtistSidebar, EventCard, Header, HeartIcon, UserIcon, LocationIcon, ChevronIcon } from '../components/TicketUi';
import { eventCards } from '../data/ticketData';

function HomePage({ onTickets }) {
  return (
    <div>
      <Header />
      <main className="max-w-[1200px] mx-auto px-6 pt-10 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-[40px] font-bold tracking-tight text-gray-900">J. Cole Tickets</h1>
          <button className="flex items-center gap-2 border border-gray-300 rounded-full px-4 py-1.5 hover:bg-gray-50">
            <span className="text-sm font-semibold">10.8K</span>
            <HeartIcon />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
          <section>
            <div className="bg-[#ebf3fe] text-[#0a58ca] rounded-xl px-4 py-3 flex items-center gap-3 mb-6">
              <UserIcon className="w-5 h-5 opacity-80" />
              <span className="text-[15px] font-medium">
                886 people viewed J. Cole events in the past hour
              </span>
            </div>

            <div className="flex flex-wrap gap-2.5 mb-8">
              <button className="bg-[#1f2937] text-white p-2.5 rounded-full hover:bg-black">
                <LocationIcon />
              </button>
              {['Johannesburg', 'All dates', 'Parking', 'Price'].map((item) => (
                <button
                  className="border border-gray-300 rounded-full px-4 py-2 text-[15px] font-medium hover:bg-gray-50 flex items-center gap-2 text-gray-600"
                  key={item}
                >
                  {item}
                  {item !== 'Parking' && <ChevronIcon />}
                </button>
              ))}
            </div>

            <h3 className="text-[17px] font-bold text-gray-900 mb-3">1 event near you</h3>
            <EventCard event={eventCards[0]} onTickets={onTickets} largeGap />

            <h3 className="text-[17px] font-bold text-gray-900 mb-3">73 events in all locations</h3>
            {eventCards.slice(1).map((event) => (
              <EventCard event={event} onTickets={onTickets} key={`${event.month}-${event.day}`} />
            ))}
          </section>

          <ArtistSidebar />
        </div>
      </main>
    </div>
  );
}

export default HomePage;
