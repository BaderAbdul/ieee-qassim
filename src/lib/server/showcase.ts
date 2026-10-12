import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { randomBytes } from 'node:crypto';
import { ApiError } from './errors';
import { audit } from './audit';
import type { 
  ShowcaseApplication, 
  ShowcaseCategory, 
  ShowcaseEquipment, 
  ShowcasePresentationMethod, 
  ShowcaseSettings, 
  ShowcaseStage, 
  ShowcaseStatus 
} from '@/lib/types';

const VALID_CATEGORIES: ShowcaseCategory[] = [
  'electronics_iot',
  'robotics',
  'ai_data',
  'software_dev',
  'energy_sustainability',
  'other_engineering'
];

const VALID_STAGES: ShowcaseStage[] = [
  'working_project',
  'functional_prototype',
  'simulation_software'
];

const VALID_METHODS: ShowcasePresentationMethod[] = [
  'physical_prototype',
  'laptop_demo',
  'poster_presentation'
];

const VALID_EQUIPMENT: ShowcaseEquipment[] = [
  'table',
  'electricity',
  'display_screen',
  'additional_space',
  'no_special_requirements'
];

const VALID_STATUSES: ShowcaseStatus[] = [
  'pending',
  'accepted',
  'rejected',
  'waitlisted',
  'withdrawn'
];

export async function getShowcaseSettings(): Promise<ShowcaseSettings> {
  const db = getFirestore();
  const snap = await db.collection('settings').doc('showcase_ieee_day_2026').get();
  if (!snap.exists) {
    return {
      maxAcceptedProjects: 15,
      applicationsOpen: true,
      openDate: '2026-09-01T00:00:00.000Z',
      closeDate: '2026-10-15T23:59:59.000Z',
    };
  }
  const data = snap.data()!;
  return {
    maxAcceptedProjects: Number(data.maxAcceptedProjects) || 15,
    applicationsOpen: data.applicationsOpen ?? true,
    openDate: data.openDate || null,
    closeDate: data.closeDate || null,
  };
}

export async function saveShowcaseSettings(actorUid: string, data: Record<string, unknown>) {
  const db = getFirestore();
  const maxAccepted = Number(data.maxAcceptedProjects);
  if (Number.isNaN(maxAccepted) || maxAccepted < 1 || maxAccepted > 200) {
    throw new ApiError('invalid-argument', 'Invalid max capacity.');
  }
  const applicationsOpen = Boolean(data.applicationsOpen);
  const openDate = typeof data.openDate === 'string' ? data.openDate : null;
  const closeDate = typeof data.closeDate === 'string' ? data.closeDate : null;

  const ref = db.collection('settings').doc('showcase_ieee_day_2026');
  await db.runTransaction(async tx => {
    tx.set(ref, {
      maxAcceptedProjects: maxAccepted,
      applicationsOpen,
      openDate,
      closeDate,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actorUid
    }, { merge: true });
    audit(tx, 'showcase.save_settings', actorUid, 'showcase_ieee_day_2026', {
      maxAcceptedProjects: maxAccepted,
      applicationsOpen
    });
  });

  return { success: true };
}

export async function submitShowcaseApplication(actorUid: string, data: Record<string, unknown>) {
  const db = getFirestore();
  const settings = await getShowcaseSettings();

  if (!settings.applicationsOpen) {
    throw new ApiError('failed-precondition', 'التقديم لمعرض المشاريع مغلق حالياً / Applications are closed.');
  }

  const eventId = typeof data.eventId === 'string' && data.eventId ? data.eventId : 'ieee-day-2026';

  // Section A: Applicant Information
  const fullName = typeof data.fullName === 'string' ? data.fullName.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  const whatsapp = typeof data.whatsapp === 'string' ? data.whatsapp.trim() : '';
  const organization = typeof data.organization === 'string' ? data.organization.trim() : '';

  if (!fullName || fullName.length > 150) throw new ApiError('invalid-argument', 'الاسم الكامل مطلوب.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) throw new ApiError('invalid-argument', 'البريد الإلكتروني غير صالح.');
  if (!whatsapp || whatsapp.length < 8 || whatsapp.length > 25) throw new ApiError('invalid-argument', 'رقم الواتساب غير صالح.');
  if (!organization || organization.length > 150) throw new ApiError('invalid-argument', 'الجامعة أو الجهة مطلوبة.');

  // Section B: Project Information
  const projectName = typeof data.projectName === 'string' ? data.projectName.trim() : '';
  const category = data.category as ShowcaseCategory;
  const description = typeof data.description === 'string' ? data.description.trim() : '';
  const stage = data.stage as ShowcaseStage;
  const mediaUrl = typeof data.mediaUrl === 'string' && data.mediaUrl.trim() ? data.mediaUrl.trim() : undefined;

  if (!projectName || projectName.length > 150) throw new ApiError('invalid-argument', 'اسم المشروع مطلوب.');
  if (!VALID_CATEGORIES.includes(category)) throw new ApiError('invalid-argument', 'مسار المشروع غير صالح.');
  if (!description || description.length < 20 || description.length > 3000) {
    throw new ApiError('invalid-argument', 'وصف المشروع يجب أن يكون مفصلاً (50-100 كلمة تقريباً).');
  }
  if (!VALID_STAGES.includes(stage)) throw new ApiError('invalid-argument', 'مرحلة المشروع غير صالحة.');
  if (mediaUrl) {
    if (!mediaUrl.startsWith('http://') && !mediaUrl.startsWith('https://')) {
      throw new ApiError('invalid-argument', 'رابط وسائط المشروع يجب أن يبدأ بـ https://');
    }
    if (mediaUrl.length > 2000) throw new ApiError('invalid-argument', 'الرابط طويل جداً.');
  }

  // Section C: Exhibition Requirements
  const presentationMethod = data.presentationMethod as ShowcasePresentationMethod;
  if (!VALID_METHODS.includes(presentationMethod)) throw new ApiError('invalid-argument', 'طريقة العرض غير صالحة.');

  const equipmentRaw = Array.isArray(data.equipment) ? data.equipment : [];
  const equipment: ShowcaseEquipment[] = equipmentRaw.filter((eq): eq is ShowcaseEquipment => 
    VALID_EQUIPMENT.includes(eq as ShowcaseEquipment)
  );
  if (!equipment.length) throw new ApiError('invalid-argument', 'يرجى تحديد متطلبات التجهيز.');

  const teamSize = Number(data.teamSize);
  if (Number.isNaN(teamSize) || teamSize < 1 || teamSize > 20) {
    throw new ApiError('invalid-argument', 'عدد أعضاء الفريق الحاضرين غير صالح.');
  }

  const availability = Boolean(data.availability);
  if (!availability) throw new ApiError('invalid-argument', 'يجب تأكيد الجاهزية للحضور واستعراض المشروع.');

  const agreedToTerms = Boolean(data.agreedToTerms);
  if (!agreedToTerms) throw new ApiError('invalid-argument', 'يجب الموافقة على الإقرار والشروط.');

  // Prevent accidental duplicates for this applicant & event
  const existingQuery = await db.collection('showcase_applications')
    .where('eventId', '==', eventId)
    .where('applicantId', '==', actorUid)
    .limit(1)
    .get();

  if (!existingQuery.empty) {
    const existingDoc = existingQuery.docs[0];
    const existing = existingDoc.data();
    if (existing.status !== 'withdrawn') {
      return {
        alreadySubmitted: true,
        referenceNumber: existing.referenceNumber,
        status: existing.status,
        applicationId: existingDoc.id
      };
    }
  }

  // Generate Reference Number
  const randomSuffix = randomBytes(3).toString('hex').toUpperCase();
  const referenceNumber = `IEEE-SHOW-${randomSuffix}`;

  const docRef = db.collection('showcase_applications').doc();

  await db.runTransaction(async tx => {
    tx.set(docRef, {
      referenceNumber,
      eventId,
      applicantId: actorUid,
      fullName,
      email,
      whatsapp,
      organization,
      projectName,
      category,
      description,
      stage,
      mediaUrl: mediaUrl || null,
      presentationMethod,
      equipment,
      teamSize,
      availability,
      agreedToTerms,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    audit(tx, 'showcase.submit', actorUid, docRef.id, {
      referenceNumber,
      eventId,
      projectName
    });
  });

  return {
    success: true,
    applicationId: docRef.id,
    referenceNumber,
    status: 'pending'
  };
}

export async function getShowcaseApplications(actor: { uid: string; role: string }, eventId = 'ieee-day-2026') {
  const db = getFirestore();
  const isAdmin = ['event_organizer', 'super_admin'].includes(actor.role);

  if (!isAdmin) {
    // Regular applicant only sees their own submission
    const snap = await db.collection('showcase_applications')
      .where('eventId', '==', eventId)
      .where('applicantId', '==', actor.uid)
      .get();

    return {
      applications: snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          referenceNumber: d.referenceNumber,
          eventId: d.eventId,
          applicantId: d.applicantId,
          fullName: d.fullName,
          projectName: d.projectName,
          category: d.category,
          status: d.status,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt
        };
      })
    };
  }

  // Admin view
  const [appsSnap, settings] = await Promise.all([
    db.collection('showcase_applications')
      .where('eventId', '==', eventId)
      .get(),
    getShowcaseSettings()
  ]);

  const applications = appsSnap.docs.map(doc => {
    const d = doc.data();
    return {
      id: doc.id,
      ...d,
      createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
      updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : d.updatedAt,
      reviewedAt: d.reviewedAt?.toDate ? d.reviewedAt.toDate().toISOString() : d.reviewedAt
    } as unknown as ShowcaseApplication;
  });

  // Calculate statistics
  const acceptedCount = applications.filter(a => a.status === 'accepted').length;
  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const waitlistedCount = applications.filter(a => a.status === 'waitlisted').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected').length;

  return {
    applications,
    settings,
    stats: {
      total: applications.length,
      accepted: acceptedCount,
      pending: pendingCount,
      waitlisted: waitlistedCount,
      rejected: rejectedCount,
      capacity: settings.maxAcceptedProjects,
      remainingSlots: Math.max(0, settings.maxAcceptedProjects - acceptedCount)
    }
  };
}

export async function reviewShowcaseApplication(
  actorUid: string, 
  data: { applicationId: string; status: ShowcaseStatus; adminNotes?: string }
) {
  const db = getFirestore();
  const applicationId = typeof data.applicationId === 'string' ? data.applicationId : '';
  const newStatus = data.status;
  const adminNotes = typeof data.adminNotes === 'string' ? data.adminNotes.trim() : undefined;

  if (!applicationId) throw new ApiError('invalid-argument', 'Missing applicationId.');
  if (!VALID_STATUSES.includes(newStatus)) throw new ApiError('invalid-argument', 'Invalid status.');

  const docRef = db.collection('showcase_applications').doc(applicationId);
  const settings = await getShowcaseSettings();

  return db.runTransaction(async tx => {
    const snap = await tx.get(docRef);
    if (!snap.exists) throw new ApiError('not-found', 'Application not found.');
    const app = snap.data()!;

    // Capacity check if accepting
    if (newStatus === 'accepted' && app.status !== 'accepted') {
      const acceptedSnap = await tx.get(
        db.collection('showcase_applications')
          .where('eventId', '==', app.eventId)
          .where('status', '==', 'accepted')
      );
      if (acceptedSnap.size >= settings.maxAcceptedProjects) {
        throw new ApiError(
          'resource-exhausted', 
          `تم الوصول للحد الأقصى للمشاريع المقبولة (${settings.maxAcceptedProjects}). يرجى زيادة السعة من الإعدادات للمتابعة.`
        );
      }
    }

    const updates: Record<string, unknown> = {
      status: newStatus,
      reviewedBy: actorUid,
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    if (adminNotes !== undefined) {
      updates.adminNotes = adminNotes;
    }

    tx.update(docRef, updates);

    audit(tx, 'showcase.review', actorUid, applicationId, {
      referenceNumber: app.referenceNumber,
      previousStatus: app.status,
      newStatus,
      adminNotes: adminNotes ? adminNotes.slice(0, 100) : null
    });

    return {
      success: true,
      applicationId,
      status: newStatus
    };
  });
}
