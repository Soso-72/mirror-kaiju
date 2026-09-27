'use client';

import React, { useState } from "react";
import { ProfileMenu } from "@/app/component/ProfileMenu";
import { Sidebar } from "../component/SideBar";
import { RessourceReservation, ActiveReservation } from "../component/ressourceReservation";
import { ReservationFeed } from "../component/ReservationFeed";

export default function ReservationPage() {
    const [activeReservations, setActiveReservations] = useState<ActiveReservation[]>([]);

    return (
        <main className="flex relative min-h-screen px-4 py-6 sm:px-6 lg:px-8" style={{ background: "#20354E" }}>
            <Sidebar />
            <ProfileMenu />
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
                <RessourceReservation onReservationsUpdate={setActiveReservations} />
                <ReservationFeed items={activeReservations} />
            </div>
        </main> 
    );
}