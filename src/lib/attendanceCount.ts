"use client";

import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase/client';

// Existing counts remain the migration baseline; new attendance changes are sharded.
export function useAttendanceCount(eventId: string, baseline = 0, enabled = true) {
  const [delta, setDelta] = useState<{ id: string; count: number } | null>(null);
  useEffect(() => {
    if (!enabled || !eventId) return;
    return onSnapshot(collection(db, 'events', eventId, 'attendance_shards'), snapshot => {
      setDelta({ id: eventId, count: snapshot.docs.reduce((sum, doc) => sum + (Number(doc.data().count) || 0), 0) });
    }, error => console.warn('Attendance count unavailable', error));
  }, [eventId, enabled]);
  return Math.max(0, baseline + (delta?.id === eventId ? delta.count : 0));
}
