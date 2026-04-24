import { Outlet } from 'react-router-dom';
import GatewaySidebar from '../../components/layout/GatewaySidebar';
import GatewayHeader from '../../components/layout/GatewayHeader';

export default function GatewayLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <GatewayHeader />
      <div className="flex flex-1">
        <GatewaySidebar />
        <div className="flex-1 lg:ml-64 p-4 sm:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}