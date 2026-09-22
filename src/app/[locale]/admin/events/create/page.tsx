'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useRouter } from '@/i18n/routing';
import { EventType, RegistrationMode, EventState } from '@/lib/types';
import { ArrowRight, Save } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default function CreateEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    titleEn: '',
    description: '',
    descriptionEn: '',
    type: 'Workshop' as EventType,
    date: '',
    time: '',
    location: '',
    locationEn: '',
    durationHours: 2,
    capacity: 50,
    isUnlimitedCapacity: false,
    hideExactCapacity: false,
    points: 10,
    hasCertificate: false,
    registrationMode: 'Auto' as RegistrationMode,
    gains: '',
    gainsEn: '',
    speakers: '',
    coverUrl: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? Number(value) : value
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'Ieee_events');

    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/jhjhfrnr/image/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        setFormData(prev => ({ ...prev, coverUrl: data.secure_url }));
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('حدث خطأ أثناء رفع الصورة');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Combine date and time
      const eventDate = new Date(`${formData.date}T${formData.time}`);
      
      const newEvent = {
        title: formData.title,
        titleEn: formData.titleEn,
        description: formData.description,
        descriptionEn: formData.descriptionEn,
        type: formData.type,
        date: eventDate,
        location: formData.location,
        locationEn: formData.locationEn,
        durationHours: formData.durationHours,
        capacity: formData.capacity,
        isUnlimitedCapacity: formData.isUnlimitedCapacity,
        hideExactCapacity: formData.hideExactCapacity,
        points: formData.points,
        hasCertificate: formData.hasCertificate,
        registrationMode: formData.registrationMode,
        state: 'Draft' as EventState,
        coverUrl: formData.coverUrl,
        gains: formData.gains.split('\n').filter(g => g.trim()),
        gainsEn: formData.gainsEn.split('\n').filter(g => g.trim()),
        speakers: formData.speakers.split(',').map(s => s.trim()).filter(s => s),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'events'), newEvent);
      router.push('/admin/events');
    } catch (error) {
      console.error("Error creating event", error);
      alert("حدث خطأ أثناء حفظ الفعالية");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center mb-6">
        <Link href="/admin/events" className="text-gray-500 hover:text-gray-900 me-4">
          <ArrowRight className="h-6 w-6 rtl:-scale-x-100" />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 font-cairo">إضافة فعالية جديدة</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">
        
        {/* Section 1: Basic Info */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 font-cairo border-b pb-2">المعلومات الأساسية</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">عنوان الفعالية (عربي)</label>
              <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Title (English)</label>
              <input required type="text" name="titleEn" value={formData.titleEn} onChange={handleChange} dir="ltr" className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">الوصف (عربي)</label>
              <textarea required name="description" rows={3} value={formData.description} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (English)</label>
              <textarea required name="descriptionEn" rows={3} value={formData.descriptionEn} onChange={handleChange} dir="ltr" className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نوع الفعالية</label>
              <select name="type" value={formData.type} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500">
                <option value="Workshop">ورشة عمل (Workshop)</option>
                <option value="Camp">معسكر (Camp)</option>
                <option value="Lecture">محاضرة (Lecture)</option>
                <option value="Competition">مسابقة (Competition)</option>
                <option value="Meetup">لقاء (Meetup)</option>
                <option value="Challenge">تحدي (Challenge)</option>
                <option value="Other">أخرى (Other)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">صورة الغلاف (Cover Image)</label>
              {formData.coverUrl && (
                <div className="mb-2 rounded-lg overflow-hidden border border-gray-200">
                  <img src={formData.coverUrl} alt="Cover Preview" className="w-full h-32 object-cover" />
                </div>
              )}
              <div className="relative">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  disabled={isUploading}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer disabled:opacity-50" 
                />
                {isUploading && (
                  <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Time & Location */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 font-cairo border-b pb-2">الزمان والمكان</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
              <input required type="date" name="date" value={formData.date} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الوقت</label>
              <input required type="time" name="time" value={formData.time} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المدة (ساعات)</label>
              <input required type="number" min="0.5" step="0.5" name="durationHours" value={formData.durationHours} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
            
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">المكان (عربي)</label>
              <input required type="text" name="location" value={formData.location} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Location (English)</label>
              <input required type="text" name="locationEn" value={formData.locationEn} onChange={handleChange} dir="ltr" className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
          </div>
        </div>

        {/* Section 3: Registration & Rewards */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 font-cairo border-b pb-2">التسجيل والمكتسبات</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">السعة (عدد المقاعد)</label>
              <input 
                required={!formData.isUnlimitedCapacity}
                disabled={formData.isUnlimitedCapacity}
                type="number" 
                min="1" 
                name="capacity" 
                value={formData.capacity} 
                onChange={handleChange} 
                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 disabled:bg-gray-100" 
              />
              
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex items-center">
                  <input type="checkbox" id="isUnlimitedCapacity" name="isUnlimitedCapacity" checked={formData.isUnlimitedCapacity} onChange={handleChange} className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded" />
                  <label htmlFor="isUnlimitedCapacity" className="ms-2 block text-sm font-medium text-gray-700">
                    تسجيل مفتوح (بدون حد أقصى)
                  </label>
                </div>
                {!formData.isUnlimitedCapacity && (
                  <div className="flex items-center">
                    <input type="checkbox" id="hideExactCapacity" name="hideExactCapacity" checked={formData.hideExactCapacity} onChange={handleChange} className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded" />
                    <label htmlFor="hideExactCapacity" className="ms-2 block text-sm font-medium text-gray-700">
                      إخفاء السعة للعامة (عرض "مقاعد محدودة" فقط)
                    </label>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">آلية القبول</label>
              <select name="registrationMode" value={formData.registrationMode} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500">
                <option value="Auto">تلقائي (حسب أسبقية التسجيل)</option>
                <option value="Manual">يدوي (يتطلب موافقة الإدارة)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">النقاط المكتسبة للحضور</label>
              <input required type="number" min="0" name="points" value={formData.points} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div className="flex items-center pt-6">
              <input type="checkbox" id="hasCertificate" name="hasCertificate" checked={formData.hasCertificate} onChange={handleChange} className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded" />
              <label htmlFor="hasCertificate" className="ms-2 block text-sm font-medium text-gray-700">
                إصدار شهادات حضور تلقائية
              </label>
            </div>
          </div>
        </div>

        {/* Section 4: Extra Details */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 font-cairo border-b pb-2">تفاصيل إضافية</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المكتسبات (عربي - سطر لكل نقطة)</label>
              <textarea name="gains" rows={4} value={formData.gains} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" placeholder="التعرف على أساسيات...&#10;بناء مشروع..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gains (English - One per line)</label>
              <textarea name="gainsEn" rows={4} value={formData.gainsEn} onChange={handleChange} dir="ltr" className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">المتحدثون (مفصولون بفاصلة)</label>
              <input type="text" name="speakers" value={formData.speakers} onChange={handleChange} placeholder="أحمد محمد, سارة خالد" className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            type="submit" 
            disabled={loading}
            className="bg-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors flex items-center shadow-md disabled:opacity-50"
          >
            {loading ? 'جاري الحفظ...' : (
              <>
                <Save className="me-2 h-5 w-5" />
                حفظ كمسودة
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
