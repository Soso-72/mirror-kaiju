import { CalendarTransit } from "../component/calendarTransit";
import { ProfileMenu } from "../component/ProfileMenu";
import { Sidebar } from "../component/SideBar";

export default function CalendrierPage() {
  return (
    <main className="flex relative min-h-screen px-4 py-6 sm:px-6 lg:px-8" style={{ background: "#20354E" }}>
      <Sidebar />
       <ProfileMenu />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <CalendarTransit />
      </div>
    </main>
  );
}