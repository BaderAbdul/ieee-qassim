'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase/client';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/context/AuthContext';
import { useParams } from 'next/navigation';
import { FileText, CheckCircle, Clock, XCircle, AlertCircle, RefreshCw, XOctagon } from 'lucide-react';
import { Certificate, PlatformEvent } from '@/lib/types';

interface Attendee {
  userId: string;
  name: string;
  email: string;
  certificate?: Certificate;
}

export default function CertificatesManagementPage() {
  const { userData, loading: authLoading } = useAuth();
  const params = useParams();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<PlatformEvent | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendeesAndCerts = async () => {
    try {
      // 1. Fetch event
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (!eventDoc.exists()) throw new Error('Event not found');
      const eventData = { id: eventDoc.id, ...eventDoc.data() } as PlatformEvent;
      setEvent(eventData);

      // 2. Fetch all valid attendance logs for this event
      const attQ = query(collection(db, 'attendance_logs'), where('eventId', '==', eventId));
      const attSnap = await getDocs(attQ);
      const userIds = attSnap.docs.map(d => d.data().userId);

      if (userIds.length === 0) {
        setAttendees([]);
        return;
      }

      // 3. Fetch user details
      const usersData: Record<string, any> = {};
      // Fetch in chunks of 10 if there are many, but for simplicity we fetch one by one here
      // Real app might use IN queries chunks of 10
      for (const uid of userIds) {
        const uDoc = await getDoc(doc(db, 'users', uid));
        if (uDoc.exists()) usersData[uid] = uDoc.data();
      }

      // 4. Fetch certificates for this event
      const certQ = query(collection(db, 'certificates'), where('eventId', '==', eventId));
      const certSnap = await getDocs(certQ);
      const certsByUserId: Record<string, Certificate> = {};
      certSnap.docs.forEach(d => {
        const c = { id: d.id, ...d.data() } as Certificate;
        certsByUserId[c.userId] = c;
      });

      // 5. Combine
      const combined: Attendee[] = userIds.map(uid => ({
        userId: uid,
        name: usersData[uid]?.displayName || 'Unknown',
        email: usersData[uid]?.email || 'No email',
        certificate: certsByUserId[uid]
      }));

      setAttendees(combined);
    } catch (err: any) {
      setError(err.message || 'Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userData || (userData.role !== 'super_admin' && userData.role !== 'event_organizer')) {
      setLoading(false);
      return;
    }
    fetchAttendeesAndCerts();
  }, [userData, eventId]);

  const handleIssueCertificates = async () => {
    if (!event || event.state !== 'Completed') {
      setError('Certificates can only be issued for Completed events.');
      return;
    }
    
    // Find eligible users without an active certificate or generating cert
    const eligibleUserIds = attendees
      .filter(a => !a.certificate || a.certificate.status === 'Failed' || a.certificate.status === 'Revoked')
      .map(a => a.userId);

    if (eligibleUserIds.length === 0) {
      setError('No eligible attendees to issue certificates to.');
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      const issueFn = httpsCallable(functions, 'issueCertificates');
      await issueFn({ eventId, userIds: eligibleUserIds });
      await fetchAttendeesAndCerts(); // Refresh data
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleRetry = async (certificateId: string) => {
    setProcessing(true);
    try {
      const retryFn = httpsCallable(functions, 'retryCertificate');
      await retryFn({ certificateId });
      await fetchAttendeesAndCerts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleRevoke = async (certificateId: string) => {
    if (!confirm('Are you sure you want to revoke this certificate? This action cannot be fully undone.')) return;
    setProcessing(true);
    try {
      const revokeFn = httpsCallable(functions, 'revokeCertificate');
      await revokeFn({ certificateId });
      await fetchAttendeesAndCerts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading || loading) return <div className="p-8 text-center">Loading...</div>;

  if (!userData || (userData.role !== 'super_admin' && userData.role !== 'event_organizer')) {
    return <div className="p-8 text-center text-red-600">Access Denied.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-cairo">إدارة الشهادات</h1>
          <p className="text-gray-500">{event?.title} ({event?.state})</p>
        </div>
        <button
          onClick={handleIssueCertificates}
          disabled={processing || event?.state !== 'Completed'}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-xl font-bold disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <FileText className="h-5 w-5" />
          إصدار الشهادات للمستحقين
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl">{error}</div>}
      
      {event?.state !== 'Completed' && (
        <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          الفعالية لم تكتمل بعد. لا يمكن إصدار الشهادات إلا للفعاليات المكتملة.
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
            <tr>
              <th className="py-4 px-6 font-medium">اسم الطالب</th>
              <th className="py-4 px-6 font-medium">البريد الإلكتروني</th>
              <th className="py-4 px-6 font-medium">حالة الشهادة</th>
              <th className="py-4 px-6 font-medium">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {attendees.map(attendee => (
              <tr key={attendee.userId} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6 font-bold">{attendee.name}</td>
                <td className="py-4 px-6 text-gray-500">{attendee.email}</td>
                <td className="py-4 px-6">
                  {!attendee.certificate ? (
                    <span className="text-gray-500">غير مصدرة</span>
                  ) : attendee.certificate.status === 'Generating' ? (
                    <span className="inline-flex items-center text-blue-600"><Clock className="h-4 w-4 me-1 animate-pulse" /> جاري الإصدار</span>
                  ) : attendee.certificate.status === 'Available' ? (
                    <span className="inline-flex items-center text-green-600"><CheckCircle className="h-4 w-4 me-1" /> متوفرة</span>
                  ) : attendee.certificate.status === 'Failed' ? (
                    <span className="inline-flex items-center text-red-600"><XCircle className="h-4 w-4 me-1" /> فشل الإصدار</span>
                  ) : (
                    <span className="inline-flex items-center text-gray-400"><XOctagon className="h-4 w-4 me-1" /> ملغاة</span>
                  )}
                </td>
                <td className="py-4 px-6">
                  {attendee.certificate?.status === 'Failed' && (
                    <button onClick={() => handleRetry(attendee.certificate!.id)} disabled={processing} className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-sm font-bold flex items-center">
                      <RefreshCw className="h-4 w-4 me-1" /> إعادة المحاولة
                    </button>
                  )}
                  {attendee.certificate?.status === 'Available' && (
                    <button onClick={() => handleRevoke(attendee.certificate!.id)} disabled={processing} className="text-red-600 hover:bg-red-50 px-3 py-1 rounded text-sm font-bold">
                      إلغاء الشهادة
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {attendees.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">لا يوجد حضور مسجل لهذه الفعالية.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
