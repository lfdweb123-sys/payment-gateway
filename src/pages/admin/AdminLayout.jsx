import { Outlet } from 'react-router-dom';
import AdminSidebar from '../../components/layout/AdminSidebar';
import AdminHeader from '../../components/layout/AdminHeader';

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminHeader />
      <div className="flex flex-1">
        <AdminSidebar />
        <div className="flex-1 lg:ml-64 p-4 sm:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}