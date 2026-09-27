import { Sidebar } from "../component/SideBar";
import { TransferFeed } from "@/app/component/feedAllTansaction";
import { ProfileMenu } from "@/app/component/ProfileMenu";
import TransferRequestsForm from "../component/formsTransfer";
import { SideTransaction } from "../component/sideTransaction";
import { StockUpdatesAlerts } from "../component/StockUpdatesPanel";

export default function Transaction() {
    return (
        <main className="flex relative min-h-screen px-4 py-6 sm:px-6 lg:px-8" style={{ background: "#20354E" }}>
            <Sidebar />
            <ProfileMenu />
            <SideTransaction />
            <StockUpdatesAlerts />
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
                <TransferRequestsForm />
                <TransferFeed />
            </div>
        </main>
    )

}