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

  // Identify existing submission for this applicant & event
  let targetDocRef: FirebaseFirestore.DocumentReference | null = null;
  let targetDocData: FirebaseFirestore.DocumentData | null = null;
  let isUpdate = false;

  const passedAppId = typeof data.applicationId === 'string' ? data.applicationId.trim() : '';
  if (passedAppId) {
    const directSnap = await db.collection('showcase_applications').doc(passedAppId).get();
    if (directSnap.exists) {
      const d = directSnap.data()!;
      if (d.applicantId === actorUid) {
        targetDocRef = directSnap.ref;
        targetDocData = d;
        isUpdate = true;
      }
    }
  }

  if (!targetDocRef) {
    const existingQuery = await db.collection('showcase_applications')
      .where('eventId', '==', eventId)
      .where('applicantId', '==', actorUid)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      targetDocRef = existingQuery.docs[0].ref;
      targetDocData = existingQuery.docs[0].data();
      if (data.isUpdate === true || passedAppId === existingQuery.docs[0].id) {
        isUpdate = true;
      } else if (targetDocData.status !== 'withdrawn') {
        return {
          alreadySubmitted: true,
          referenceNumber: targetDocData.referenceNumber,
          status: targetDocData.status,
          applicationId: existingQuery.docs[0].id
        };
      } else {
        isUpdate = true;
      }
    }
  }

  const docRef = isUpdate && targetDocRef ? targetDocRef : db.collection('showcase_applications').doc();
  const referenceNumber = isUpdate && targetDocData?.referenceNumber 
    ? targetDocData.referenceNumber 
    : `IEEE-SHOW-${randomBytes(3).toString('hex').toUpperCase()}`;

  await db.runTransaction(async tx => {
    const payload: Record<string, unknown> = {
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
      updatedAt: FieldValue.serverTimestamp()
    };

    if (isUpdate && targetDocData) {
      // Preserve current status unless it was withdrawn
      const currentStatus = targetDocData.status;
      payload.status = currentStatus === 'withdrawn' ? 'pending' : currentStatus;
      tx.update(docRef, payload);
      audit(tx, 'showcase.update', actorUid, docRef.id, {
        referenceNumber,
        eventId,
        projectName
      });
    } else {
      payload.status = 'pending';
      payload.createdAt = FieldValue.serverTimestamp();
      tx.set(docRef, payload);
      audit(tx, 'showcase.submit', actorUid, docRef.id, {
        referenceNumber,
        eventId,
        projectName
      });
    }
  });

  return {
    success: true,
    applicationId: docRef.id,
    referenceNumber,
    isUpdate,
    status: isUpdate && targetDocData ? targetDocData.status : 'pending'
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
          email: d.email,
          whatsapp: d.whatsapp,
          organization: d.organization,
          projectName: d.projectName,
          category: d.category,
          description: d.description,
          stage: d.stage,
          mediaUrl: d.mediaUrl,
          presentationMethod: d.presentationMethod,
          equipment: d.equipment,
          teamSize: d.teamSize,
          availability: d.availability,
          status: d.status,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
          updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : d.updatedAt
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

export async function getMyShowcaseApplication(actorUid: string, eventId = 'ieee-day-2026') {
  const db = getFirestore();
  const snap = await db.collection('showcase_applications')
    .where('eventId', '==', eventId)
    .where('applicantId', '==', actorUid)
    .limit(1)
    .get();

  if (snap.empty) {
    return { application: null };
  }

  const doc = snap.docs[0];
  const d = doc.data();
  return {
    application: {
      id: doc.id,
      referenceNumber: d.referenceNumber,
      eventId: d.eventId,
      applicantId: d.applicantId,
      fullName: d.fullName,
      email: d.email,
      whatsapp: d.whatsapp,
      organization: d.organization,
      projectName: d.projectName,
      category: d.category,
      description: d.description,
      stage: d.stage,
      mediaUrl: d.mediaUrl,
      presentationMethod: d.presentationMethod,
      equipment: d.equipment,
      teamSize: d.teamSize,
      availability: d.availability,
      status: d.status,
      createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
      updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : d.updatedAt
    }
  };
}

export async function deleteShowcaseApplication(actorUid: string, applicationId: string) {
  const db = getFirestore();
  const docRef = db.collection('showcase_applications').doc(applicationId);

  await db.runTransaction(async tx => {
    const snap = await tx.get(docRef);
    if (!snap.exists) throw new ApiError('not-found', 'Application not found.');
    const data = snap.data()!;

    tx.delete(docRef);
    audit(tx, 'showcase.delete', actorUid, applicationId, {
      referenceNumber: data.referenceNumber,
      projectName: data.projectName,
      applicantId: data.applicantId
    });
  });

  return { success: true };
}

