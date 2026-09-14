'use client';

import { useEffect, useState } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Users, Calendar, CheckSquare, Award } from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeEvents: 0,
    totalRegistrations: 0,
    certificatesIssued: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // In a real app, these would be cached or calculated via Cloud Functions for performance
        // For V1, we'll do simple queries
        
        const usersSnap = await getDocs(collection(db, 'users'));
        const eventsQ = query(collection(db, 'events'), where('state', 'in', ['Published', 'Registration Open', 'Ongoing']));
        const eventsSnap = await getDocs(eventsQ);
        
        const regsSnap = await getDocs(collection(db, 'registrations'));
        const certsSnap = await getDocs(collection(db, 'certificates'));

        setStats({
          totalUsers: usersSnap.size,
          activeEvents: eventsSnap.size,
          totalRegistrations: regsSnap.size,
          certificatesIssued: certsSnap.size,
        });
      } catch (error) {
        console.error("Error fetching stats", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>;
  }

  const statCards = [
    { label: 'إجمالي الطلاب', value: stats.totalUsers, icon: <Users className="h-8 w-8 text-blue-500" />, bg: 'bg-blue-50' },
    { label: 'الفعاليات النشطة', value: stats.activeEvents, icon: <Calendar className="h-8 w-8 text-purple-500" />, bg: 'bg-purple-50' },
    { label: 'إجمالي التسجيلات', value: stats.totalRegistrations, icon: <CheckSquare className="h-8 w-8 text-green-500" />, bg: 'bg-green-50' },
    { label: 'الشهادات المصدرة', value: stats.certificatesIssued, icon: <Award className="h-8 w-8 text-yellow-500" />, bg: 'bg-yellow-50' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 font-cairo mb-8">نظرة عامة</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center">
            <div className={`h-16 w-16 rounded-xl ${stat.bg} flex items-center justify-center me-4 flex-shrink-0`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
              <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 font-cairo mb-4">أهلاً بك في لوحة الإدارة</h2>
        <p className="text-gray-600 mb-4">
          من هنا يمكنك إدارة الفعاليات، متابعة تسجيلات الطلاب، إصدار الشهادات، وتسجيل الحضور באמצעות (QR Code).
        </p>
        <p className="text-gray-600">
          استخدم القائمة الجانبية للوصول إلى الأقسام المختلفة.
        </p>
      </div>
    </div>
  );
}
