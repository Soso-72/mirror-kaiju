'use client';

import { DistrictAlertMap } from "@/app/component/DistrictAlertMap";
import { ProfileMenu } from "@/app/component/ProfileMenu";
import { Sidebar } from "../component/SideBar";
import { DisasterLevelAlerts } from "../component/DisasterLevelPanel";
import { RetentionControl } from "../component/RetentionControl";

export default function Dashboard() {
  return (
    <main className="flex relative min-h-screen bg-[#20354E] px-4 py-6 sm:px-6 lg:px-8">
      <Sidebar />
      <ProfileMenu />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <DistrictAlertMap />
        
        {/* Contrôle du seuil de rétention visible uniquement pour le rôle CD sous la carte */}
        <RetentionControl currentAlertLevel={5} />

        <DisasterLevelAlerts />
      </div>
    </main>
  );
}