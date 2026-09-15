'use client';

import { useEffect, useState, useRef } from 'react';
import { collection, query, where, getDocs, getDoc, doc, setDoc } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase/client';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/context/AuthContext';
import { useParams } from 'next/navigation';
import { FileText, CheckCircle, Clock, XCircle, AlertCircle, RefreshCw, XOctagon, Download, Upload } from 'lucide-react';
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
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userData || (userData.role !== 'super_admin' && userData.role !== 'event_organizer')) {
      return;
    }

    let active = true;

    const loadData = async () => {
      try {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (!eventDoc.exists()) throw new Error('Event not found');
        if (!active) return;
        const eventData = { id: eventDoc.id, ...eventDoc.data() } as PlatformEvent;
        setEvent(eventData);

        const attQ = query(collection(db, 'attendance_logs'), where('eventId', '==', eventId));
        const attSnap = await getDocs(attQ);
        const userIds = attSnap.docs.map(d => d.data().userId as string);

        if (userIds.length === 0) {
          if (active) setAttendees([]);
          return;
        }

        const usersData: Record<string, { displayName?: string; email?: string }> = {};
        for (const uid of userIds) {
          const uDoc = await getDoc(doc(db, 'users', uid));
          if (uDoc.exists()) {
            const uData = uDoc.data();
            usersData[uid] = {
              displayName: uData.arabicFullName || uData.displayName,
              email: uData.email,
            };
          }
        }

        const certQ = query(collection(db, 'certificates'), where('eventId', '==', eventId));
        const certSnap = await getDocs(certQ);
        const certsByUserId: Record<string, Certificate> = {};
        certSnap.docs.forEach(d => {
          const c = { id: d.id, ...d.data() } as Certificate;
          certsByUserId[c.userId] = c;
        });

        const combined: Attendee[] = userIds.map(uid => ({
          userId: uid,
          name: usersData[uid]?.displayName || 'Unknown',
          email: usersData[uid]?.email || 'No email',
          certificate: certsByUserId[uid]
        }));

        if (active) setAttendees(combined);
      } catch (err: unknown) {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Error fetching data';
          setError(msg);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [userData, eventId, reloadKey]);

  const handleIssueCertificates = async () => {
    if (!event || event.state !== 'Completed') {
      setError('Certificates can only be issued for Completed events.');
      return;
    }
    
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
      setReloadKey(k => k + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error issuing certificates';
      setError(msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleRetry = async (certificateId: string) => {
    setProcessing(true);
    try {
      const retryFn = httpsCallable(functions, 'retryCertificate');
      await retryFn({ certificateId });
      setReloadKey(k => k + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error retrying certificate';
      setError(msg);
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
      setReloadKey(k => k + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error revoking certificate';
      setError(msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleExportCSV = () => {
    const header = ['Name', 'Email', 'Status', 'Certificate URL'];
    const csvContent = [
      header.join(','),
      ...attendees.map(a => [
        `"${a.name.replace(/"/g, '""')}"`,
        `"${a.email}"`,
        a.certificate ? a.certificate.status : 'Not Issued',
        a.certificate?.externalUrl || a.certificate?.storagePath || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendees_${event?.title}_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCSV(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        if (lines.length < 2) throw new Error('CSV must have headers and at least one row');
        
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
        const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('بريد'));
        const urlIdx = headers.findIndex(h => h.includes('url') || h.includes('link') || h.includes('رابط'));
        
        if (emailIdx === -1 || urlIdx === -1) {
          throw new Error('CSV must contain an Email column and a URL/Link column');
        }

        let successCount = 0;
        
        for (let i = 1; i < lines.length; i++) {
          const rowText = lines[i];
          const cols = rowText.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          const email = cols[emailIdx];
          const url = cols[urlIdx];
          
          if (email && url && url.startsWith('http')) {
            const attendee = attendees.find(a => a.email.toLowerCase() === email.toLowerCase());
            if (attendee) {
              const certId = `certificate_${eventId}_${attendee.userId}`;
              const certRef = doc(db, 'certificates', certId);
              
              await setDoc(certRef, {
                id: certId,
                eventId,
                userId: attendee.userId,
                status: 'Available',
                externalUrl: url,
                studentName: attendee.name,
                eventTitle: event?.title || '',
                eventType: event?.type || 'Workshop',
                attendanceDate: new Date(),
                issueDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                attemptCount: 1
              });
              successCount++;
            }
          }
        }
        
        alert(`تم بنجاح ربط ${successCount} شهادة بالحضور.`);
        setReloadKey(k => k + 1);
      } catch (err: any) {
        setError(err.message || 'خطأ في معالجة الملف');
      } finally {
        setUploadingCSV(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const isAuthorized = userData && (userData.role === 'super_admin' || userData.role === 'event_organizer');

  if (authLoading || (isAuthorized && loading)) return <div className="p-8 text-center">Loading...</div>;

  if (!isAuthorized) {
    return <div className="p-8 text-center text-red-600">Access Denied.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-cairo">إدارة الشهادات</h1>
          <p className="text-gray-500">{event?.title} ({event?.state})</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-sm"
          >
            <Download className="h-4 w-4" />
            تصدير CSV الحضور
          </button>
          
          <div className="relative">
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleImportCSV} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              ref={fileInputRef}
              disabled={uploadingCSV}
            />
            <button
              disabled={uploadingCSV}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Upload className="h-4 w-4" />
              {uploadingCSV ? 'جاري الرفع...' : 'رفع شهادات CSV'}
            </button>
          </div>
          
          <button
            onClick={handleIssueCertificates}
            disabled={processing || event?.state !== 'Completed'}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-xl font-bold disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            <FileText className="h-5 w-5" />
            إصدار آلي للشهادات
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl">{error}</div>}
      
      {event?.state !== 'Completed' && (
        <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          الفعالية لم تكتمل بعد. لا يمكن إصدار الشهادات الآلية إلا للفعاليات المكتملة.
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-start">
          <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
            <tr>
              <th className="py-4 px-6 font-medium">اسم الطالب</th>
              <th className="py-4 px-6 font-medium">البريد الإلكتروني</th>
              <th className="py-4 px-6 font-medium">الرابط المرفق</th>
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
                  {attendee.certificate?.externalUrl ? (
                    <a href={attendee.certificate.externalUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-bold truncate block max-w-[150px]">
                      رابط خارجي
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>
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
                <td colSpan={5} className="py-8 text-center text-gray-500">لا يوجد حضور مسجل لهذه الفعالية.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
