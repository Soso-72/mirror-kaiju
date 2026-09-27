import { DisasterLevelAlerts } from "../component/DisasterLevelPanel";
import { StockUpdatesAlerts } from "../component/StockUpdatesPanel";
import { ConflictAlertsPanel } from "../component/ConflictAlertsPanel";

export default function WebSocketTestPage() {
  return (
    <div className="min-h-screen w-full bg-[#0b1220] p-8">
      <h1 className="mb-6 text-lg font-medium text-[#e7ebf3]">Test WebSocket — 3 cas obligatoires</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DisasterLevelAlerts />
        <StockUpdatesAlerts />
        <ConflictAlertsPanel />
      </div>
    </div>
  );
}